/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { Player, Wall, Door, NoiseIndicator, Point } from '../types';
import { lerpAngle } from '../physics';
import { sound } from '../audio';

export class WatcherEnemy extends EnemyBase {
  public eyeTendrilOffsets: number[] = [0.1, 0.5, 0.9, 1.4, 2.0];
  public isDisabledByTerminal: boolean = false;
  public screechCooldown: number = 0;

  constructor(id: string, x: number, y: number, patrolPath: Point[]) {
    super(id, 'WATCHER', x, y, {
      speed: 88, // Deliberate floating drone (player walk is 250, sprint is 385)
      radius: 28,
      fov: (100 * Math.PI) / 180,
      visionRange: 300,
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
    if (this.isDisabledByTerminal) {
      this.state = 'DISABLED';
      this.alertLevel = 'NEUTRAL';
      return;
    }

    this.animTimer += dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.alertLevel = 'NEUTRAL';
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.screechCooldown > 0) this.screechCooldown -= dt;

    // Flashlight sensitivity: expands vision range when light is active
    if (player.flashlightOn && player.battery > 0) {
      this.visionRange = 380;
    } else {
      this.visionRange = 160;
    }

    const { seesPlayer, heardNoise } = this.checkPerception(
      player,
      obstacles,
      noiseIndicators,
      facilitySuspicion
    );

    if (seesPlayer) {
      if (this.state !== 'CHASE') {
        sound.playEnemyScreech('WATCHER');
        this.screechCooldown = 4.5;
        // Call nearby Sentinels to this location!
        aiBroadcasts.push({
          source: 'WATCHER',
          target: { x: player.x, y: player.y },
        });
      }
      this.state = 'CHASE';
      this.alertLevel = 'CHASE';
      this.lastKnownPlayerPos = { x: player.x, y: player.y };
      this.stateTimer = 4.0;

      // Periodically call reinforcements while chasing
      if (this.screechCooldown <= 0) {
        sound.playEnemyScreech('WATCHER');
        this.screechCooldown = 4.5;
        aiBroadcasts.push({
          source: 'WATCHER',
          target: { x: player.x, y: player.y },
        });
      }
    } else if (this.state === 'CHASE') {
      // Player broke line of sight
      this.alertLevel = 'ALERT';
      this.stateTimer -= dt;

      if (this.lastKnownPlayerPos) {
        const distToLast = Math.hypot(
          this.lastKnownPlayerPos.x - this.x,
          this.lastKnownPlayerPos.y - this.y
        );
        if (distToLast < 35 || this.stateTimer <= 0) {
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
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3.2);

      // Balanced chase speed (114 px/s)
      const chaseSpeed = this.speed * 1.3;
      this.x += Math.cos(this.angle) * chaseSpeed * dt;
      this.y += Math.sin(this.angle) * chaseSpeed * dt;

      // EYE BITE / LUNGE ATTACK
      if (seesPlayer) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + player.radius + 8 && this.attackCooldown <= 0 && player.invulnerableTimer <= 0) {
          this.attackCooldown = 1.4;
          player.health = Math.max(0, player.health - 22);
          player.invulnerableTimer = 1.3;
          sound.playPlayerHitSmack();
        }
      }
    } else if (this.state === 'SEARCH') {
      this.searchTurnTimer += dt;
      if (this.searchTurnTimer > 0.7) {
        this.searchTurnTimer = 0;
        this.targetAngle = this.angle + (Math.random() * 2.4 - 1.2);
      }
      this.angle = lerpAngle(this.angle, this.targetAngle, dt * 3.0);
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
        this.angle = lerpAngle(this.angle, this.targetAngle, dt * 5);
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
      } else {
        this.state = 'SEARCH';
        this.stateTimer = 3.5;
      }
    } else if (this.state === 'PATROL') {
      this.alertLevel = 'NEUTRAL';
      if (this.patrolPath.length > 0) {
        const wp = this.patrolPath[this.currentWaypointIndex];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 18) {
          this.targetAngle = Math.atan2(dy, dx);
          this.angle = lerpAngle(this.angle, this.targetAngle, dt * 4);
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
    if (this.state === 'DISABLED') {
      // Dormant deactivated eye on floor
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const pulse = Math.sin(this.animTimer * 5) * 3;

    // Bloody writhing tendrils
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const tOffset = this.eyeTendrilOffsets[i] || 0;
      const wave = Math.sin(this.animTimer * 6 + tOffset * 4) * 8;
      ctx.beginPath();
      ctx.moveTo(-this.radius, (i - 2) * 6);
      ctx.quadraticCurveTo(-this.radius - 18, (i - 2) * 8 + wave, -this.radius - 36, (i - 2) * 12);
      ctx.stroke();
    }

    // Sclera with veins
    ctx.fillStyle = '#fee2e2';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + pulse * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.radius + 6, -6);
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.radius + 6, 8);
    ctx.stroke();

    // Iris & Mandibles (Bite teeth in chase)
    ctx.fillStyle = this.alertLevel === 'CHASE' ? '#ef4444' : '#991b1b';
    ctx.beginPath();
    ctx.arc(6, 0, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Sharp jaw teeth during chase
    if (this.alertLevel === 'CHASE') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, -6);
      ctx.lineTo(22, 0);
      ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fill();
    }

    // Slit pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(8, 0, 4, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.renderAlertIcon(ctx);
  }
}
