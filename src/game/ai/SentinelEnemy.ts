/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class SentinelEnemy extends EnemyBase {
  constructor(id: string, x: number, y: number, patrolPath: Point[]) {
    super(id, 'SENTINEL', x, y, {
      speed: 105, // Fair, balanced patrol speed (player walk is 250, sprint is 385)
      radius: 19,
      fov: (75 * Math.PI) / 180,
      visionRange: 260,
      hearingRange: 190,
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
    if (this.state === 'DISABLED') return;
    this.animTimer += dt;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.alertLevel = 'NEUTRAL';
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Check shared facility alert broadcast from Watchers
    for (const b of aiBroadcasts) {
      if (b.source === 'WATCHER' && this.state !== 'CHASE') {
        this.state = 'ALERT';
        this.alertLevel = 'ALERT';
        this.investigateTarget = { x: b.target.x, y: b.target.y };
        this.stateTimer = 5.0;
      }
    }

    const { seesPlayer, heardNoise } = this.checkPerception(
      player,
      obstacles,
      noiseIndicators,
      facilitySuspicion
    );

    // State Transitions
    if (seesPlayer) {
      if (this.state !== 'CHASE') {
        sound.playEnemyScreech('SENTINEL');
      }
      this.state = 'CHASE';
      this.alertLevel = 'CHASE';
      this.lastKnownPlayerPos = { x: player.x, y: player.y };
      this.investigateTarget = null;
      this.stateTimer = 4.0;
    } else if (this.state === 'CHASE') {
      // Player broke line of sight! Pursue ONLY to last seen location
      this.alertLevel = 'ALERT';
      this.stateTimer -= dt;

      if (this.lastKnownPlayerPos) {
        const distToLast = Math.hypot(
          this.lastKnownPlayerPos.x - this.x,
          this.lastKnownPlayerPos.y - this.y
        );
        if (distToLast < 35 || this.stateTimer <= 0) {
          // Reached last known point: switch to SEARCH to look around
          this.state = 'SEARCH';
          this.stateTimer = 3.0;
          this.searchTurnTimer = 0;
        }
      } else if (this.stateTimer <= 0) {
        this.state = 'SEARCH';
        this.stateTimer = 3.0;
        this.searchTurnTimer = 0;
      }
    } else if (heardNoise) {
      this.state = 'INVESTIGATE';
      this.alertLevel = 'SUSPICIOUS';
      this.investigateTarget = heardNoise;
      this.stateTimer = 4.5;
    }

    // State Execution
    if (this.state === 'CHASE' && this.lastKnownPlayerPos) {
      // If direct line-of-sight is maintained, track player; otherwise run to corner where player disappeared
      const targetX = seesPlayer ? player.x : this.lastKnownPlayerPos.x;
      const targetY = seesPlayer ? player.y : this.lastKnownPlayerPos.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;

      this.targetAngle = Math.atan2(dy, dx);
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 4.0);

      // Balanced chase speed (130 px/s vs player walk 250 and sprint 385)
      const chaseSpeed = this.speed * 1.25;
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      // Melee attack check (only if player is visible, in reach, and not invulnerable)
      if (seesPlayer) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + player.radius + 6 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
          this.attackCooldown = 1.4;
          player.health = Math.max(0, player.health - 22);
          player.invulnerableTimer = 1.3;
          sound.playPlayerHitSmack();
        }
      }
    } else if (this.state === 'SEARCH') {
      this.searchTurnTimer += dt;
      if (this.searchTurnTimer > 0.8) {
        this.searchTurnTimer = 0;
        this.targetAngle = this.angle + (Math.random() * 2.2 - 1.1);
      }
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3.5);
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'RETURN';
        this.alertLevel = 'SUSPICIOUS';
      }
    } else if (this.state === 'INVESTIGATE' && this.investigateTarget) {
      const dx = this.investigateTarget.x - this.x;
      const dy = this.investigateTarget.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 25) {
        this.targetAngle = Math.atan2(dy, dx);
        this.angle = lerpAngle(this.angle, this.targetAngle, dt * 6);
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
      } else {
        this.state = 'SEARCH';
        this.stateTimer = 3.0;
      }
    } else if (this.state === 'RETURN' || this.state === 'PATROL') {
      this.alertLevel = 'NEUTRAL';
      if (this.patrolPath.length > 0) {
        const wp = this.patrolPath[this.currentWaypointIndex];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 18) {
          this.targetAngle = Math.atan2(dy, dx);
          this.angle = lerpAngle(this.angle, this.targetAngle, dt * 5);
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

    // Chassis body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.alertLevel === 'CHASE' ? '#ef4444' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Twin propulsion fins
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-this.radius - 5, -8, 6, 5);
    ctx.fillRect(-this.radius - 5, 3, 6, 5);

    // Scanning eye
    const eyeColor =
      this.alertLevel === 'CHASE'
        ? '#ef4444'
        : this.alertLevel === 'ALERT'
        ? '#f97316'
        : this.alertLevel === 'SUSPICIOUS'
        ? '#eab308'
        : '#06b6d4';

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(8, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.renderAlertIcon(ctx);
  }
}
