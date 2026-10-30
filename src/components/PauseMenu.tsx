/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Play, RotateCcw, Home, Sliders } from 'lucide-react';

interface Props {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<Props> = ({
  onResume,
  onRestart,
  onExitToTitle,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        {/* Title */}
        <div className="text-center border-b border-slate-800 pb-4">
          <div className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-1">
            STATION TELEMETRY
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            TACTICAL SIMULATION PAUSED
          </h2>
        </div>

        {/* Audio Volume Controls */}
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>SYNTHESIZER VOLUME</span>
            </div>
            <span className="tabular-nums font-bold text-cyan-400">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Synthesizer volume slider"
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-750 rounded-lg"
            />
          </div>
        </div>

        {/* Tactical Keybinds Reference */}
        <div className="text-xs text-slate-400 bg-slate-900/50 rounded-xl p-3 border border-slate-800/80 space-y-1.5">
          <div className="text-slate-300 font-semibold mb-1">FIELD DIRECTIVES:</div>
          <div className="flex justify-between">
            <span>WASD / Arrows</span>
            <span className="text-slate-200">Movement Vector</span>
          </div>
          <div className="flex justify-between">
            <span>Shift</span>
            <span className="text-slate-200">Sprint (Drains battery + High noise)</span>
          </div>
          <div className="flex justify-between">
            <span>C / Ctrl</span>
            <span className="text-slate-200">Crouch (Mutes footsteps from Blind Stalkers)</span>
          </div>
          <div className="flex justify-between">
            <span>F</span>
            <span className="text-slate-200">Toggle Flashlight (Oculus sees light!)</span>
          </div>
          <div className="flex justify-between">
            <span>Space / E</span>
            <span className="text-slate-200">Interact / Hide in Locker or Vent</span>
          </div>
          <div className="flex justify-between">
            <span>1 / Q</span>
            <span className="text-slate-200">Deploy Power Cell (+50% Battery)</span>
          </div>
          <div className="flex justify-between">
            <span>2 / G</span>
            <span className="text-slate-200">Launch EMP Decoy Flare</span>
          </div>
          <div className="flex justify-between">
            <span>3 / H</span>
            <span className="text-slate-200">Use Emergency Medkit (+50 HP)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shadow-lg shadow-cyan-500/20 active:scale-98"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME SIMULATION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART LEVEL</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>EXIT TO TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
