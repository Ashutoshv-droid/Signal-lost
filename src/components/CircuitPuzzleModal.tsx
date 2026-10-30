/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CircuitTile,
  CircuitPuzzleDef,
  PUZZLES,
  getBaseConnectionsForType,
  getRotatedConnections,
  evaluateCircuit,
} from '../game/circuitData';
import { sound } from '../game/audio';
import { Zap, RotateCw, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  puzzleId: string;
  hasEmpCharge: boolean;
  onSolve: () => void;
  onClose: () => void;
}

export const CircuitPuzzleModal: React.FC<Props> = ({
  puzzleId,
  hasEmpCharge,
  onSolve,
  onClose,
}) => {
  const puzzle: CircuitPuzzleDef = PUZZLES[puzzleId] || PUZZLES['circuit-subreactor'];

  // Initialize tile state from puzzle definition
  const [tiles, setTiles] = useState<CircuitTile[][]>(() => {
    return puzzle.initialTiles.map((rowArr, r) =>
      rowArr.map((item, c) => ({
        id: `tile-${r}-${c}`,
        row: r,
        col: c,
        type: item.type,
        baseConnections: getBaseConnectionsForType(item.type),
        rotation: item.rotation,
        isPowered: false,
      }))
    );
  });

  const [poweredIds, setPoweredIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSolvingAnim, setIsSolvingAnim] = useState<boolean>(false);

  // Recalculate circuit whenever tiles change
  useEffect(() => {
    const result = evaluateCircuit(puzzle, tiles);
    setPoweredIds(result.poweredIds);

    if (result.isComplete && !isCompleted && !isSolvingAnim) {
      setIsSolvingAnim(true);
      sound.playCircuitSolved();
      setTimeout(() => {
        setIsCompleted(true);
        setTimeout(() => {
          onSolve();
        }, 1100);
      }, 600);
    }
  }, [tiles, puzzle, isCompleted, isSolvingAnim, onSolve]);

  const handleTileClick = (r: number, c: number) => {
    if (isCompleted || isSolvingAnim) return;

    sound.playCircuitRotate();
    setTiles((prev) => {
      const next = prev.map((rowArr) => rowArr.map((t) => ({ ...t })));
      next[r][c].rotation = (next[r][c].rotation + 1) % 4;
      return next;
    });
  };

  const handleEmpBypass = () => {
    if (isCompleted || isSolvingAnim) return;
    sound.playEmpBlast();
    setIsSolvingAnim(true);
    setTimeout(() => {
      sound.playCircuitSolved();
      setIsCompleted(true);
      setTimeout(() => {
        onSolve();
      }, 800);
    }, 400);
  };

  // Render SVG conduit paths based on rotated connections
  const renderConduitSvg = (conns: [boolean, boolean, boolean, boolean], isPowered: boolean) => {
    const strokeColor = isCompleted
      ? '#34d399' // emerald green on completed
      : isPowered
      ? '#38bdf8' // glowing cyan when energized
      : '#475569'; // muted slate when dead

    const glowFilter = isPowered ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))' : 'none';

    return (
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full pointer-events-none transition-all duration-200"
        style={{ filter: glowFilter }}
      >
        {/* Background track */}
        <circle cx="50" cy="50" r="14" fill="#1e293b" stroke="#334155" strokeWidth="2" />

        {/* Conduit line segments from center (50, 50) */}
        {conns[0] && (
          <path d="M 50 50 L 50 0" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" />
        )}
        {conns[1] && (
          <path d="M 50 50 L 100 50" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" />
        )}
        {conns[2] && (
          <path d="M 50 50 L 50 100" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" />
        )}
        {conns[3] && (
          <path d="M 50 50 L 0 50" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" />
        )}

        {/* Core node */}
        <circle
          cx="50"
          cy="50"
          r="8"
          fill={isPowered ? (isCompleted ? '#a7f3d0' : '#bae6fd') : '#334155'}
          className={isPowered ? 'animate-pulse' : ''}
        />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Top scanline effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none opacity-40 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-semibold">
                {puzzle.systemName}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-mono">
                {puzzle.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Abort Calibration"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/90 rounded-lg px-4 py-2.5 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">INFLOW:</span>
            <span className="text-cyan-400 font-semibold">POWER RAIL [ACTIVE]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">GRID STATUS:</span>
            <span
              className={
                isCompleted
                  ? 'text-emerald-400 font-bold'
                  : 'text-amber-400 font-medium'
              }
            >
              {isCompleted ? 'ONLINE // HARMONIZED' : 'CIRCUIT DISRUPTED'}
            </span>
          </div>
        </div>

        {/* Interactive Circuit Grid Area */}
        <div className="relative flex items-center justify-center py-2">
          {/* Input Power Rail Indicator */}
          <div className="absolute left-2 md:left-6 flex flex-col items-center gap-1 z-10">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              INPUT
            </span>
          </div>

          {/* Grid Container */}
          <div
            className="grid gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner shadow-black/80"
            style={{
              gridTemplateColumns: `repeat(${puzzle.cols}, minmax(64px, 86px))`,
              gridTemplateRows: `repeat(${puzzle.rows}, minmax(64px, 86px))`,
            }}
          >
            {tiles.map((rowArr, r) =>
              rowArr.map((tile, c) => {
                const conns = getRotatedConnections(tile.baseConnections, tile.rotation);
                const isPowered = poweredIds.has(tile.id);

                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(r, c)}
                    disabled={isCompleted || isSolvingAnim}
                    aria-label={`Rotate conduit at row ${r + 1}, column ${c + 1}`}
                    className={`relative aspect-square rounded-lg p-2 transition-all duration-150 flex items-center justify-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : isPowered
                        ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                    } border`}
                  >
                    {renderConduitSvg(conns, isPowered)}

                    {/* Subtle rotation cue on hover */}
                    {!isCompleted && (
                      <div className="absolute inset-0 rounded-lg bg-cyan-400/0 group-hover:bg-cyan-400/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <RotateCw className="w-4 h-4 text-cyan-300 pointer-events-none drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Output Terminal Indicator */}
          <div className="absolute right-2 md:right-6 flex flex-col items-center gap-1 z-10">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                isCompleted
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/40'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                isCompleted ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              OUTPUT
            </span>
          </div>
        </div>

        {/* Completion Banner */}
        {isCompleted && (
          <div className="flex items-center justify-center gap-2 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 font-mono text-sm font-semibold tracking-wide animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>POWER RELAY HARMONIZED — FACILITY GRID ENGAGED</span>
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono">
            Click conduit nodes to rotate 90° and align power path.
          </div>

          <div className="flex items-center gap-3">
            {hasEmpCharge && !isCompleted && (
              <button
                onClick={handleEmpBypass}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/80 text-xs font-mono font-medium transition-colors"
                title="Consume 1 EMP charge to force bypass"
              >
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span>Use EMP Surge Bypass</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-mono font-medium transition-colors"
            >
              Return to Field [ESC]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
