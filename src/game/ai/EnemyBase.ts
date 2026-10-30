/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Point,
  Wall,
  Door,
  Player,
  AIState,
  EnemyClassType,
  NoiseIndicator,
} from '../types';
import {
  resolveCircleAABB,
  castRay,
  hasLineOfSight,
  normalizeAngle,
  lerpAngle,
} from '../physics';

export abstract class EnemyBase {
  public id: string;
  public classType: EnemyClassType;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public speed: number;
  public baseSpeed: number;
  public angle: number = 0;
  public targetAngle: number = 0;
  public radius: number;

  // Perception parameters
  public fov: number; // In radians
  public visionRange: number;
  public baseVisionRange: number;
  public hearingRange: number;

  // AI State Machine
  public state: AIState = 'PATROL';
  public patrolPath: Point[] = [];
  public currentWaypointIndex: number = 0;
  public lastKnownPlayerPos: Point | null = null;
  public investigateTarget: Point | null = null;

  // Timers
  public stateTimer: number = 0;
  public stunTimer: number = 0;
  public attackCooldown: number = 0;
  public searchTurnTimer: number = 0;

  // Visual/Animation
  public animTimer: number = 0;
  public alertLevel: 'NEUTRAL' | 'SUSPICIOUS' | 'ALERT' | 'CHASE' = 'NEUTRAL';

  constructor(
    id: string,
    classType: EnemyClassType,
    x: number,
    y: number,
    options: {
      speed: number;
      radius: number;
      fov: number;
      visionRange: number;
      hearingRange: number;
      patrolPath?: Point[];
    }
  ) {
    this.id = id;
    this.classType = classType;
    this.x = x;
    this.y = y;
    this.speed = options.speed;
    this.baseSpeed = options.speed;
    this.radius = options.radius;
    this.fov = options.fov;
    this.visionRange = options.visionRange;
    this.baseVisionRange = options.visionRange;
    this.hearingRange = options.hearingRange;
    this.patrolPath = options.patrolPath || [{ x, y }];
  }

  // Perception Check against Player
  public checkPerception(
    player: Player,
    obstacles: (Wall | Door)[],
    noiseIndicators: NoiseIndicator[],
    facilitySuspicion: number
  ): { seesPlayer: boolean; heardNoise: Point | null } {
    if (this.state === 'DISABLED' || this.state === 'STUNNED' || player.isHiding) {
      return { seesPlayer: false, heardNoise: null };
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 1. Line-of-sight & Vision Cone check
    let seesPlayer = false;
    if (this.fov > 0) {
      // Dynamic vision multiplier if player flashlight is on
      let effectiveVision = this.visionRange;
      if (player.flashlightOn && player.battery > 0) {
        effectiveVision = Math.min(600, this.visionRange * 1.45);
      } else {
        effectiveVision = this.baseVisionRange * 0.85;
      }

      const angleToPlayer = Math.atan2(dy, dx);
      const angleDiff = Math.abs(normalizeAngle(angleToPlayer - this.angle));

      if (angleDiff <= this.fov / 2 && dist <= effectiveVision) {
        seesPlayer = hasLineOfSight(this, player, obstacles);
      }
    }

    // 2. Sound & Acoustic noise detection
    let heardNoise: Point | null = null;
    const suspicionBonus = (facilitySuspicion / 100) * 80;
    const effectiveHearing = this.hearingRange + suspicionBonus;

    for (const ni of noiseIndicators) {
      const dNoise = Math.hypot(this.x - ni.x, this.y - ni.y);
      if (dNoise < ni.radius + effectiveHearing * 0.45) {
        heardNoise = { x: ni.x, y: ni.y };
        break;
      }
    }

    return { seesPlayer, heardNoise };
  }

  // Common physics collisions
  protected resolveCollisions(obstacles: (Wall | Door)[]) {
    for (const obs of obstacles) {
      if ('isOpen' in obs && obs.isOpen && obs.openProgress > 0.8) {
        continue;
      }
      const res = resolveCircleAABB(this, obs);
      this.x = res.x;
      this.y = res.y;
    }
  }

  // Base state update
  public abstract update(
    dt: number,
    player: Player,
    obstacles: (Wall | Door)[],
    noiseIndicators: NoiseIndicator[],
    facilitySuspicion: number,
    aiBroadcasts: { source: string; target: Point }[]
  ): void;

  // Base render
  public abstract render(ctx: CanvasRenderingContext2D): void;

  // Render vision cone with obstacle raycasting
  public renderVisionCone(ctx: CanvasRenderingContext2D, obstacles: (Wall | Door)[]) {
    if (this.fov <= 0 || this.state === 'DISABLED') return;

    ctx.save();
    const rayCount = 36;
    const startAngle = this.angle - this.fov / 2;
    const angleStep = this.fov / rayCount;

    const conePoints = [{ x: this.x, y: this.y }];
    for (let i = 0; i <= rayCount; i++) {
      const curAngle = startAngle + i * angleStep;
      const hit = castRay(this, curAngle, this.visionRange, obstacles);
      conePoints.push(hit.point);
    }

    let color1 = 'rgba(6, 182, 212, 0.3)';
    let color2 = 'rgba(6, 182, 212, 0.01)';
    if (this.alertLevel === 'SUSPICIOUS') {
      color1 = 'rgba(234, 179, 8, 0.45)';
    } else if (this.alertLevel === 'ALERT') {
      color1 = 'rgba(249, 115, 22, 0.55)';
    } else if (this.alertLevel === 'CHASE') {
      color1 = 'rgba(239, 68, 68, 0.65)';
    }

    const grad = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.visionRange);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(conePoints[0].x, conePoints[0].y);
    for (let i = 1; i < conePoints.length; i++) {
      ctx.lineTo(conePoints[i].x, conePoints[i].y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Render overhead awareness status badge
  public renderAlertIcon(ctx: CanvasRenderingContext2D) {
    if (this.alertLevel === 'NEUTRAL' || this.state === 'DISABLED') return;

    ctx.save();
    const badgeY = this.y - this.radius - 18;
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    if (this.alertLevel === 'SUSPICIOUS') {
      ctx.fillStyle = '#eab308';
      ctx.fillText('?', this.x, badgeY);
    } else if (this.alertLevel === 'ALERT') {
      ctx.fillStyle = '#f97316';
      ctx.fillText('!', this.x, badgeY);
    } else if (this.alertLevel === 'CHASE') {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('!!', this.x, badgeY);
    }
    ctx.restore();
  }
}
