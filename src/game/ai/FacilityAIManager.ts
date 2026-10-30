/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EnemyBase } from './EnemyBase';
import { SentinelEnemy } from './SentinelEnemy';
import { WatcherEnemy } from './WatcherEnemy';
import { MimicEnemy } from './MimicEnemy';
import { CrawlerEnemy } from './CrawlerEnemy';
import { WardenEnemy } from './WardenEnemy';
import { GlitchEnemy } from './GlitchEnemy';
import { Player, Wall, Door, NoiseIndicator, Point, VentNode } from '../types';

export class FacilityAIManager {
  public enemies: EnemyBase[] = [];
  public facilitySuspicion: number = 0; // 0 to 100
  public aiBroadcasts: { source: string; target: Point }[] = [];
  public debugMode: boolean = false;

  constructor() {}

  public initEnemies(ventNodes: VentNode[]) {
    this.enemies = [
      // 1. SENTINEL 01 (Sector Alpha to Transit Highway)
      new SentinelEnemy('sentinel-01', 500, 950, [
        { x: 350, y: 950 },
        { x: 850, y: 950 },
      ]),

      // 2. SENTINEL 02 (Central Highway East)
      new SentinelEnemy('sentinel-02', 1500, 1040, [
        { x: 1200, y: 1040 },
        { x: 2000, y: 1040 },
      ]),

      // 3. WATCHER 01 (Sub-Reactor Hub - Eye of Cthulhu)
      new WatcherEnemy('watcher-reactor', 1600, 420, [
        { x: 1350, y: 350 },
        { x: 1850, y: 350 },
        { x: 1850, y: 650 },
        { x: 1350, y: 650 },
      ]),

      // 4. WATCHER 02 (Bio-Containment Vault Gamma)
      new WatcherEnemy('watcher-gamma', 2800, 500, [
        { x: 2500, y: 400 },
        { x: 3100, y: 400 },
        { x: 3100, y: 800 },
        { x: 2500, y: 800 },
      ]),

      // 5. MIMIC 01 (Cryo Quarantine Alpha - Disguised body near lockers)
      new MimicEnemy('mimic-alpha', 780, 200),

      // 6. MIMIC 02 (Bio-Abyss Delta - Disguised body near vault entrance)
      new MimicEnemy('mimic-delta', 680, 1600),

      // 7. CRAWLER 01 (Vent network prowler)
      new CrawlerEnemy('crawler-main', 1000, 950, ventNodes),

      // 8. WARDEN 01 (Deep Bio-Abyss Commander Vault Heavy Guard)
      new WardenEnemy('warden-vault', 1250, 1600, [
        { x: 1050, y: 1550 },
        { x: 1650, y: 1550 },
        { x: 1650, y: 1950 },
        { x: 1050, y: 1950 },
      ]),

      // 9. GLITCH 01 (Phasing Electrical Aberration near damaged generators)
      new GlitchEnemy('glitch-aberration', 1550, 260, [
        { x: 1550, y: 260 },
        { x: 3200, y: 260 },
        { x: 1450, y: 2350 },
      ]),
    ];
  }

  public update(
    dt: number,
    player: Player,
    obstacles: (Wall | Door)[],
    noiseIndicators: NoiseIndicator[]
  ) {
    // 1. Update shared facility suspicion
    let suspicionDelta = -1.8 * dt; // Natural gradual decay when covert

    if (player.isSprinting) {
      suspicionDelta += 5.5 * dt;
    }

    // Any enemy in chase raises suspicion rapidly
    const anyInChase = this.enemies.some((e) => e.state === 'CHASE');
    const anyAlert = this.enemies.some((e) => e.state === 'ALERT');

    if (anyInChase) {
      suspicionDelta += 14.0 * dt;
      player.isBeingChased = true;
    } else {
      player.isBeingChased = false;
      if (anyAlert) suspicionDelta += 4.5 * dt;
    }

    this.facilitySuspicion = Math.max(0, Math.min(100, this.facilitySuspicion + suspicionDelta));

    // Clear one-shot broadcasts after processing
    const currentBroadcasts = [...this.aiBroadcasts];
    this.aiBroadcasts = [];

    // 2. Update each enemy
    for (const enemy of this.enemies) {
      enemy.update(
        dt,
        player,
        obstacles,
        noiseIndicators,
        this.facilitySuspicion,
        currentBroadcasts
      );
    }
  }

  public disableWatchers() {
    for (const enemy of this.enemies) {
      if (enemy instanceof WatcherEnemy) {
        enemy.isDisabledByTerminal = true;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, obstacles: (Wall | Door)[]) {
    // Render vision cones first
    for (const enemy of this.enemies) {
      enemy.renderVisionCone(ctx, obstacles);
    }

    // Render bodies
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    // Developer Debug Overlay (F1 or backslash to toggle)
    if (this.debugMode) {
      this.renderDebug(ctx);
    }
  }

  // Developer Debug Mode overlay
  private renderDebug(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const enemy of this.enemies) {
      // Detection radius circle
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.hearingRange, 0, Math.PI * 2);
      ctx.stroke();

      // Patrol path lines
      if (enemy.patrolPath.length > 1) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(enemy.patrolPath[0].x, enemy.patrolPath[0].y);
        for (let i = 1; i < enemy.patrolPath.length; i++) {
          ctx.lineTo(enemy.patrolPath[i].x, enemy.patrolPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // State label
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        `[${enemy.classType}] ${enemy.state}`,
        enemy.x - 30,
        enemy.y + enemy.radius + 14
      );

      // Last known player position marker
      if (enemy.lastKnownPlayerPos) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          enemy.lastKnownPlayerPos.x - 6,
          enemy.lastKnownPlayerPos.y - 6,
          12,
          12
        );
      }
    }
    ctx.restore();
  }
}
