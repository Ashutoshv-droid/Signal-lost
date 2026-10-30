/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class MimicEnemy extends EnemyBase {
  public isDisguised: boolean = true;
  private whisperTimer: number = 3.0;

  constructor(id: string, x: number, y: number) {
    super(id, 'MIMIC', x, y, {
      speed: 115, // Balanced spider ambush speed (player walk is 250, sprint is 385)
      radius: 20,
      fov: (100 * Math.PI) / 180,
      visionRange: 150,
      hearingRange: 210,
    });
    this.state = 'IDLE';
  }

  public update(
    dt: number,
    player: Player,
    obstacles: (Wall | Door)[],
    noiseIndicators: NoiseIndicator[],
    facilitySuspicion: number,
    aiBroadcasts: { source: string; target: Point }[]
  ) {
    this.animTimer += dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // If disguised: dormant, periodically whispers to lure player
    if (this.isDisguised) {
      this.whisperTimer -= dt;
      if (this.whisperTimer <= 0) {
        this.whisperTimer = 6.0 + Math.random() * 5.0;
        if (dist < 300) {
          sound.playMimicWhisper();
        }
      }

      // Check activation trigger: close proximity (< 90px) or loud sprint nearby
      let loudNoiseNearby = false;
      for (const ni of noiseIndicators) {
        if (Math.hypot(this.x - ni.x, this.y - ni.y) < ni.radius + 45) {
          loudNoiseNearby = true;
          break;
        }
      }

      if ((dist < 95 && !player.isHiding) || (loudNoiseNearby && dist < 180)) {
        // UNMASK JUMPSCARE!
        this.isDisguised = false;
        this.state = 'CHASE';
        this.alertLevel = 'CHASE';
        sound.playEnemyScreech('MIMIC');
      }
      return;
    }

    // Active Chase / Attack Mode
    if (this.state === 'CHASE') {
      this.targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 4.0);

      const chaseSpeed = this.speed * 1.25; // 143 px/s
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      if (dist < this.radius + player.radius + 6 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
        this.attackCooldown = 1.4;
        player.health = Math.max(0, player.health - 22);
        player.invulnerableTimer = 1.3;
        sound.playPlayerHitSmack();
      }

      if (dist > 280 || player.isHiding) {
        this.state = 'SEARCH';
        this.stateTimer = 2.5;
      }
    } else if (this.state === 'SEARCH') {
      this.searchTurnTimer += dt;
      if (this.searchTurnTimer > 0.6) {
        this.searchTurnTimer = 0;
        this.targetAngle = this.angle + (Math.random() * 2.6 - 1.3);
      }
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3.5);
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        // Disguise again in place
        this.state = 'IDLE';
        this.isDisguised = true;
        this.alertLevel = 'NEUTRAL';
      }
    }

    this.resolveCollisions(obstacles);
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isDisguised) {
      // Looks like a slumped scientist corpse in white/blue lab coat
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Slumped shoulders
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-12, -8, 24, 16);

      // Lab badge / bloodstain
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-4, -2, 8, 4);
    } else {
      // Aberration unmasked: splayed ribs & visceral gore mandibles
      ctx.rotate(this.angle);

      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Splayed bone ribs acting as legs/pincers
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.floor(i / 2) * 8 - 8;
        ctx.beginPath();
        ctx.moveTo(0, row);
        ctx.lineTo(side * 24, row - 6);
        ctx.lineTo(side * 30, row + 4);
        ctx.stroke();
      }

      // Gaping gore maw in center
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(6, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    if (!this.isDisguised) {
      this.renderAlertIcon(ctx);
    }
  }
}
