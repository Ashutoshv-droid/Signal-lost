/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameStats } from '../game/types';
import { AlertOctagon, RotateCcw, Home, Clock, Zap, Eye } from 'lucide-react';
import { sound } from '../game/audio';

interface Props {
  stats: GameStats;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const GameOverModal: React.FC<Props> = ({ stats, onRestart, onExitToTitle }) => {
  useEffect(() => {
    sound.setGameplayActive(false);
    sound.stopAllGameplayAudio();
  }, []);
  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = Math.floor(stats.timeElapsed % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none font-mono">
      <div className="relative w-full max-w-lg bg-slate-950 border border-red-500/40 rounded-2xl shadow-2xl shadow-red-950/60 p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Atmospheric flashing red scanline */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent pointer-events-none opacity-50 animate-pulse" />

        {/* Header Lockup */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-400 shadow-lg shadow-red-950/80 animate-bounce">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-red-400 font-bold">
              CRITICAL PROTOCOL COMPROMISED
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              SIGNAL TERMINATED
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Intruder apprehended by facility autonomous sentry patrol.
            </p>
          </div>
        </div>

        {/* Telemetry Breakdown */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>SURVIVED</span>
            </div>
            <span className="text-base font-bold text-white tabular-nums">
              {timeFormatted}
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>CIRCUITS</span>
            </div>
            <span className="text-base font-bold text-white tabular-nums">
              {stats.circuitsSolved} / 2
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
              <Eye className="w-3.5 h-3.5 text-red-400" />
              <span>DETECTIONS</span>
            </div>
            <span className="text-base font-bold text-red-400 tabular-nums">
              {stats.timesSpotted}
            </span>
          </div>
        </div>

        {/* Stealth Tactical Tip */}
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
          <span className="text-amber-400 font-bold mr-1">TACTICAL DIRECTIVE:</span>
          Crouch with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[10px]">C</kbd> to muffle footstep acoustics. Avoid sprinting in open corridors, and deploy EMP flares with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[10px]">2</kbd> to stun sentries when cornered.
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-600/30 active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RE-ENGAGE INFILTRATION</span>
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
