/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class GlitchEnemy extends EnemyBase {
  private teleportTimer: number = 7.0;
  private staticAudioTimer: number = 0;
  public glitchFlicker: number = 0;

  constructor(id: string, x: number, y: number, patrolPath: Point[]) {
    super(id, 'GLITCH', x, y, {
      speed: 95, // Phasing anomaly (player walk is 250, sprint is 385)
      radius: 22,
      fov: (100 * Math.PI) / 180,
      visionRange: 240,
      hearingRange: 210,
      patrolPath,
    });
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
    this.glitchFlicker = (this.glitchFlicker + dt * 15) % 1;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.hypot(dx, dy);

    // Audio static proximity warning
    this.staticAudioTimer += dt;
    if (this.staticAudioTimer > 4.0) {
      this.staticAudioTimer = 0;
      if (distToPlayer < 350) {
        sound.playGlitchInterference();
      }
    }

    // Teleport / phase between rooms when not actively chasing
    if (this.state !== 'CHASE') {
      this.teleportTimer -= dt;
      if (this.teleportTimer <= 0 && this.patrolPath.length > 1) {
        this.teleportTimer = 8.0 + Math.random() * 5.0;
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.patrolPath.length;
        const nextWp = this.patrolPath[this.currentWaypointIndex];
        // Phase jump
        this.x = nextWp.x;
        this.y = nextWp.y;
        sound.playGlitchInterference();
      }
    }

    const { seesPlayer, heardNoise } = this.checkPerception(
      player,
      obstacles,
      noiseIndicators,
      facilitySuspicion
    );

    if (seesPlayer) {
      if (this.state !== 'CHASE') {
        sound.playGlitchInterference();
      }
      this.state = 'CHASE';
      this.alertLevel = 'CHASE';
      this.stateTimer = 3.5;
    } else if (this.state === 'CHASE') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 || distToPlayer > 300) {
        this.state = 'PATROL';
        this.alertLevel = 'NEUTRAL';
      }
    } else if (heardNoise) {
      this.state = 'INVESTIGATE';
      this.alertLevel = 'SUSPICIOUS';
      this.investigateTarget = heardNoise;
      this.stateTimer = 3.5;
    }

    if (this.state === 'CHASE') {
      this.targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3.5);

      const chaseSpeed = this.speed * 1.25; // 118 px/s
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      if (distToPlayer < this.radius + player.radius + 6 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
        this.attackCooldown = 1.4;
        player.health = Math.max(0, player.health - 18);
        player.battery = Math.max(0, player.battery - 12);
        player.invulnerableTimer = 1.3;
        sound.playPlayerHitSmack();
      }
    } else if (this.state === 'INVESTIGATE' && this.investigateTarget) {
      const idx = this.investigateTarget.x - this.x;
      const idy = this.investigateTarget.y - this.y;
      const idist = Math.hypot(idx, idy);

      if (idist > 25) {
        this.targetAngle = Math.atan2(idy, idx);
        this.angle = lerpAngle(this.angle, this.targetAngle, dt * 5);
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
      } else {
        this.state = 'PATROL';
        this.alertLevel = 'NEUTRAL';
      }
    }

    // Glitch can phase through some small obstacles, but respect boundaries
    this.resolveCollisions(obstacles);
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Chaotic shifting polygonal glitch silhouette
    const jitterX = (Math.random() - 0.5) * 6;
    const jitterY = (Math.random() - 0.5) * 6;

    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.fillRect(-this.radius + jitterX, -this.radius + jitterY, this.radius * 2, this.radius * 2);

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

    // Horizontal static scanline bars
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(-this.radius, -6 + jitterY, this.radius * 2, 3);
    ctx.fillRect(-this.radius, 8 + jitterX, this.radius * 2, 2);

    // Glowing core
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.renderAlertIcon(ctx);
  }
}
