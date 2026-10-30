/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class WardenEnemy extends EnemyBase {
  constructor(id: string, x: number, y: number, patrolPath: Point[]) {
    super(id, 'WARDEN', x, y, {
      speed: 70, // Heavy, deliberate guarding titan (easily outrun by player)
      radius: 32,
      fov: (80 * Math.PI) / 180,
      visionRange: 300,
      hearingRange: 200,
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
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // IMMUNE TO THROWN BOLTS / ORDINARY JUNK DISTRACTIONS:
    // Warden filters out low-priority noise indicators (only reacts to loud sprint or direct player sighting)
    const filteredNoise = noiseIndicators.filter((ni) => ni.color === '#ef4444'); // Only sprint alerts

    const { seesPlayer, heardNoise } = this.checkPerception(
      player,
      obstacles,
      filteredNoise,
      facilitySuspicion
    );

    if (seesPlayer) {
      if (this.state !== 'CHASE') {
        sound.playEnemyScreech('WARDEN');
      }
      this.state = 'CHASE';
      this.alertLevel = 'CHASE';
      this.lastKnownPlayerPos = { x: player.x, y: player.y };
      this.stateTimer = 4.0;
    } else if (this.state === 'CHASE') {
      this.alertLevel = 'ALERT';
      this.stateTimer -= dt;

      if (this.lastKnownPlayerPos) {
        const distToLast = Math.hypot(
          this.lastKnownPlayerPos.x - this.x,
          this.lastKnownPlayerPos.y - this.y
        );
        if (distToLast < 40 || this.stateTimer <= 0) {
          this.state = 'SEARCH';
          this.alertLevel = 'ALERT';
          this.stateTimer = 3.0;
        }
      } else if (this.stateTimer <= 0) {
        this.state = 'SEARCH';
        this.alertLevel = 'ALERT';
        this.stateTimer = 3.0;
      }
    } else if (heardNoise) {
      this.state = 'INVESTIGATE';
      this.alertLevel = 'SUSPICIOUS';
      this.investigateTarget = heardNoise;
      this.stateTimer = 4.0;
    }

    // State Execution
    if (this.state === 'CHASE' && this.lastKnownPlayerPos) {
      const targetX = seesPlayer ? player.x : this.lastKnownPlayerPos.x;
      const targetY = seesPlayer ? player.y : this.lastKnownPlayerPos.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;

      this.targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 2.8);

      // Slow, heavy 84 px/s chase speed
      const chaseSpeed = this.speed * 1.2;
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      if (seesPlayer) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + player.radius + 8 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
          this.attackCooldown = 1.6;
          player.health = Math.max(0, player.health - 32);
          player.invulnerableTimer = 1.4;
          sound.playPlayerHitSmack();
        }
      }
    } else if (this.state === 'SEARCH') {
      this.searchTurnTimer += dt;
      if (this.searchTurnTimer > 1.0) {
        this.searchTurnTimer = 0;
        this.targetAngle = this.angle + (Math.random() * 1.8 - 0.9);
      }
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3);
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'PATROL';
        this.alertLevel = 'NEUTRAL';
      }
    } else if (this.state === 'INVESTIGATE' && this.investigateTarget) {
      const dx = this.investigateTarget.x - this.x;
      const dy = this.investigateTarget.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 30) {
        this.targetAngle = Math.atan2(dy, dx);
        this.angle = lerpAngle(this.angle, this.targetAngle, dt * 4);
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
      } else {
        this.state = 'SEARCH';
        this.stateTimer = 4.0;
      }
    } else if (this.state === 'PATROL') {
      this.alertLevel = 'NEUTRAL';
      if (this.patrolPath.length > 0) {
        const wp = this.patrolPath[this.currentWaypointIndex];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 20) {
          this.targetAngle = Math.atan2(dy, dx);
          this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3);
          this.x += Math.cos(this.angle) * this.speed * dt;
          this.y += Math.sin(this.angle) * this.speed * dt;
        } else {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.patrolPath.length;
        }
      }
    }

    this.resolveCollisions(obstacles);
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Heavy reinforced chassis
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Heavy armor shoulder plates
    ctx.fillStyle = '#334155';
    ctx.fillRect(-this.radius - 2, -this.radius - 6, 18, 12);
    ctx.fillRect(-this.radius - 2, this.radius - 6, 18, 12);

    // Glowing dual sensor visors
    const visorColor = this.alertLevel === 'CHASE' ? '#ef4444' : '#f97316';
    ctx.fillStyle = visorColor;
    ctx.fillRect(10, -8, 14, 5);
    ctx.fillRect(10, 3, 14, 5);

    ctx.restore();
    this.renderAlertIcon(ctx);
  }
}
