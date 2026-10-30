/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats } from '../game/types';
import { Award, RotateCcw, Home, Clock, ShieldCheck, Zap, BatteryCharging } from 'lucide-react';

interface Props {
  stats: GameStats;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const VictoryModal: React.FC<Props> = ({ stats, onRestart, onExitToTitle }) => {
  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = Math.floor(stats.timeElapsed % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const getRankBadgeColor = (rank: string) => {
    switch (rank) {
      case 'Ghost':
        return 'text-cyan-400 bg-cyan-950/80 border-cyan-500';
      case 'Phantom':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-500';
      case 'Operative':
        return 'text-amber-400 bg-amber-950/80 border-amber-500';
      default:
        return 'text-slate-300 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono">
      <div className="relative w-full max-w-lg bg-slate-950 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/50 p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Glowing cyan/emerald victory halo */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none opacity-40 animate-pulse" />

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-950/80 animate-bounce">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
              FACILITY EVACUATION COMPLETE
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              SIGNAL RESTORED
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Shuttle airlock disengaged. Sub-level 7 successfully breached and cleared.
            </p>
          </div>
        </div>

        {/* Stealth Rank Classification Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                INFILTRATION RATING
              </div>
              <div className="text-sm font-bold text-white tracking-wider">
                TACTICAL CLASSIFICATION
              </div>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold tracking-widest uppercase ${getRankBadgeColor(
              stats.stealthRank
            )}`}
          >
            {stats.stealthRank}
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>TIME</span>
            </div>
            <span className="text-base font-bold text-white tabular-nums">
              {timeFormatted}
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>CIRCUITS</span>
            </div>
            <span className="text-base font-bold text-emerald-400 tabular-nums">
              {stats.circuitsSolved} / 2
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              <span>CELLS USED</span>
            </div>
            <span className="text-base font-bold text-white tabular-nums">
              {stats.powerCellsUsed}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/30 active:scale-98"
          >
            <RotateCcw className="w-4 h-4 fill-slate-950" />
            <span>PLAY AGAIN [RE-INFILTRATE]</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
