/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Player, HidingSpot, Door, Terminal } from '../game/types';
import { EnemyBase } from '../game/ai/EnemyBase';
import { Radio } from 'lucide-react';

interface Props {
  player: Player;
  enemies: EnemyBase[];
  hidingSpots: HidingSpot[];
  doors: Door[];
  terminals: Terminal[];
}

export const ProximityRadar: React.FC<Props> = ({
  player,
  enemies,
  hidingSpots,
  doors,
  terminals,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarRange = 360;
  const radarSize = 130;

  useEffect(() => {
    let animId: number;

    const renderRadar = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = (radarSize - 10) / radarRange;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarSize - 6, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Range rings
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      [0.33, 0.66, 1].forEach((rPct) => {
        ctx.beginPath();
        ctx.arc(cx, cy, (radarSize - 10) * rPct, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, h - 10);
      ctx.moveTo(10, cy);
      ctx.lineTo(w - 10, cy);
      ctx.stroke();

      // Sweeping radar beam
      const sweepAngle = (performance.now() * 0.003) % (Math.PI * 2);
      const sweepGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radarSize);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarSize - 8, sweepAngle - 0.5, sweepAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * (radarSize - 8),
        cy + Math.sin(sweepAngle) * (radarSize - 8)
      );
      ctx.stroke();

      // 1. Nearby Hiding Spots
      for (const spot of hidingSpots) {
        const scx = spot.x + spot.w / 2;
        const scy = spot.y + spot.h / 2;
        const dx = scx - player.x;
        const dy = scy - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radarRange) {
          const rx = cx + dx * scale;
          const ry = cy + dy * scale;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(rx - 3, ry - 3, 6, 6);
        }
      }

      // 2. Nearby Doors & Terminals
      for (const door of doors) {
        const dcx = door.x + door.w / 2;
        const dcy = door.y + door.h / 2;
        const dx = dcx - player.x;
        const dy = dcy - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radarRange) {
          const rx = cx + dx * scale;
          const ry = cy + dy * scale;
          ctx.fillStyle = door.isLocked ? '#f87171' : '#34d399';
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
        }
      }

      for (const term of terminals) {
        const dx = term.x - player.x;
        const dy = term.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radarRange) {
          const rx = cx + dx * scale;
          const ry = cy + dy * scale;
          ctx.fillStyle = term.isSolved ? '#34d399' : '#06b6d4';
          ctx.beginPath();
          ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Detected Nearby Enemies (All 6 Classes with distinct blip colors)
      for (const enemy of enemies) {
        if (enemy.state === 'DISABLED') continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= radarRange) {
          const rx = cx + dx * scale;
          const ry = cy + dy * scale;

          let blipColor = '#ef4444';
          if (enemy.classType === 'WATCHER') blipColor = '#dc2626';
          else if (enemy.classType === 'WARDEN') blipColor = '#b91c1c';
          else if (enemy.classType === 'SENTINEL') blipColor = '#f59e0b';
          else if (enemy.classType === 'CRAWLER') blipColor = '#10b981';
          else if (enemy.classType === 'MIMIC') blipColor = '#e11d48';
          else if (enemy.classType === 'GLITCH') blipColor = '#a855f7';

          ctx.fillStyle = blipColor;
          ctx.beginPath();
          ctx.arc(rx, ry, enemy.classType === 'WARDEN' ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `${blipColor}88`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rx, ry, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 4. Center Player
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(player.angle) * 10, cy + Math.sin(player.angle) * 10);
      ctx.stroke();

      ctx.restore();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radarSize - 6, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(renderRadar);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [player, enemies, hidingSpots, doors, terminals]);

  return (
    <div className="relative flex flex-col items-center p-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl pointer-events-auto">
      <div className="flex items-center justify-between w-full px-2 pb-1 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>PROXIMITY RADAR</span>
        </div>
        <span className="tabular-nums text-slate-500 font-semibold">360m</span>
      </div>

      <canvas
        ref={canvasRef}
        width={radarSize * 2}
        height={radarSize * 2}
        className="w-28 h-28 md:w-32 md:h-32 rounded-full"
      />

      <div className="flex items-center justify-between w-full px-1.5 pt-1 text-[9px] text-slate-400 font-mono gap-1">
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Hostile
        </span>
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sentry
        </span>
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Glitch
        </span>
        <span className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Hide
        </span>
      </div>
    </div>
  );
};
