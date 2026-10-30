/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point, VentNode } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class CrawlerEnemy extends EnemyBase {
  public isInVent: boolean = true;
  public ventNetwork: VentNode[] = [];
  public currentVentIndex: number = 0;
  private ventTravelTimer: number = 5.0;
  private scratchWarningTimer: number = 0;

  constructor(id: string, x: number, y: number, ventNetwork: VentNode[]) {
    super(id, 'CRAWLER', x, y, {
      speed: 125, // Balanced skitterer speed (player walk is 250, sprint is 385)
      radius: 20,
      fov: (100 * Math.PI) / 180,
      visionRange: 240,
      hearingRange: 240,
    });
    this.ventNetwork = ventNetwork;
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
    const distToPlayer = Math.hypot(dx, dy);

    // If inside vents: traveling between vent nodes
    if (this.isInVent) {
      this.ventTravelTimer -= dt;
      this.scratchWarningTimer += dt;

      // Produce periodic ceiling scratch sound if near player
      if (this.scratchWarningTimer >= 4.0) {
        this.scratchWarningTimer = 0;
        if (distToPlayer < 350) {
          sound.playVentScratch();
        }
      }

      // Check if should emerge from current vent: if player is within 200px or loud sprint noise
      let playerNearCurrentVent = false;
      if (this.ventNetwork.length > 0) {
        const vent = this.ventNetwork[this.currentVentIndex];
        this.x = vent.x;
        this.y = vent.y;

        const dVent = Math.hypot(player.x - vent.x, player.y - vent.y);
        if (dVent < 200 && !player.isHiding) {
          playerNearCurrentVent = true;
        }
      }

      if (playerNearCurrentVent || (facilitySuspicion > 75 && distToPlayer < 260)) {
        // EMERGE FROM VENT!
        this.isInVent = false;
        this.state = 'CHASE';
        this.alertLevel = 'CHASE';
        this.stateTimer = 4.0;
        sound.playEnemyScreech('CRAWLER');
      } else if (this.ventTravelTimer <= 0) {
        // Shift to next vent node in network
        this.ventTravelTimer = 6.0 + Math.random() * 4.0;
        this.currentVentIndex = (this.currentVentIndex + 1) % this.ventNetwork.length;
      }
      return;
    }

    // Emerged: Skittering chase in corridors (player can outrun around corners)
    if (this.state === 'CHASE') {
      this.targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 4.2);

      const chaseSpeed = this.speed * 1.15; // 143 px/s
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      if (distToPlayer < this.radius + player.radius + 6 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
        this.attackCooldown = 1.3;
        player.health = Math.max(0, player.health - 20);
        player.invulnerableTimer = 1.3;
        sound.playPlayerHitSmack();
      }

      this.stateTimer -= dt;
      if (distToPlayer > 300 || player.isHiding || this.stateTimer <= 0) {
        this.state = 'RETURN';
        this.stateTimer = 3.0;
      }
    } else if (this.state === 'RETURN') {
      // Retreat back to nearest vent node
      if (this.ventNetwork.length > 0) {
        const nearestVent = this.ventNetwork[this.currentVentIndex];
        const vdx = nearestVent.x - this.x;
        const vdy = nearestVent.y - this.y;
        const vdist = Math.hypot(vdx, vdy);

        if (vdist > 25) {
          this.targetAngle = Math.atan2(vdy, vdx);
          this.angle = lerpAngle(this.angle, this.targetAngle, dt * 6);
          this.x += Math.cos(this.angle) * this.speed * dt;
          this.y += Math.sin(this.angle) * this.speed * dt;
        } else {
          // Re-enter vent network
          this.isInVent = true;
          this.alertLevel = 'NEUTRAL';
          this.state = 'PATROL';
          sound.playVentScratch();
        }
      }
    }

    this.resolveCollisions(obstacles);
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isInVent) {
      // Invisible while inside ceiling vents (only heard or pinged on radar)
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Spider abdomen & mechanical thorax
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-4, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8 Skittering mechanical spider legs
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const legAngle = ((i - 3.5) / 4) * (Math.PI / 2.2);
      const legWave = Math.sin(this.animTimer * 16 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(legAngle) * 20, Math.sin(legAngle) * 20 + legWave);
      ctx.lineTo(Math.cos(legAngle) * 34, Math.sin(legAngle) * 34);
      ctx.stroke();
    }

    // Glowing arachnid eyes
    ctx.fillStyle = '#ef4444';
    [-6, -2, 2, 6].forEach((offset) => {
      ctx.beginPath();
      ctx.arc(10, offset, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
    this.renderAlertIcon(ctx);
  }
}
