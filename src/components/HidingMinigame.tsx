/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../game/audio';
import { Heart, Wind, AlertCircle, LogOut, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  hidingSpotName: string;
  onFailBreath: () => void;
  onExitHiding: () => void;
}

export const HidingMinigame: React.FC<Props> = ({
  hidingSpotName,
  onFailBreath,
  onExitHiding,
}) => {
  // Needle position ranges from 5 to 95 percent
  const [needlePos, setNeedlePos] = useState<number>(10);
  const [panicLevel, setPanicLevel] = useState<number>(20); // 0 to 100
  const [lastAction, setLastAction] = useState<{
    text: string;
    type: 'idle' | 'success' | 'fail';
    timestamp: number;
  }>({
    text: 'WAIT FOR THE NEEDLE TO ENTER THE GREEN ZONE',
    type: 'idle',
    timestamp: Date.now(),
  });

  // Safe sweet-spot zone bounds in percentage (42% to 58% = 16% target band)
  const safeMin = 42;
  const safeMax = 58;

  // Refs for continuous animation loop (prevents React state closure lockup)
  const posRef = useRef<number>(10);
  const dirRef = useRef<number>(1);
  const panicRef = useRef<number>(20);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const heartbeatTimerRef = useRef<number>(0);

  // Tracking for missed breath windows (user did not press in green before entering red)
  const wasInGreenRef = useRef<boolean>(false);
  const pressedInCurrentPassRef = useRef<boolean>(false);
  const isExitingRef = useRef<boolean>(false);

  // Store prop callbacks in refs to avoid restarting the animation loop
  const onFailBreathRef = useRef(onFailBreath);
  const onExitHidingRef = useRef(onExitHiding);
  useEffect(() => {
    onFailBreathRef.current = onFailBreath;
    onExitHidingRef.current = onExitHiding;
  }, [onFailBreath, onExitHiding]);

  // Keep panicRef in sync with state
  useEffect(() => {
    panicRef.current = panicLevel;
  }, [panicLevel]);

  // Is current needle inside the safe green zone?
  const isInsideSafeZone = needlePos >= safeMin && needlePos <= safeMax;

  // Dedicated continuous animation loop
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const updateLoop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // Needle speed increases slightly with panic (65% to 110% of track per second)
      const speed = 70 + (panicRef.current / 100) * 45;

      // Move needle
      posRef.current += dirRef.current * speed * dt;

      // Smooth bounce off edges (5% to 95%)
      if (posRef.current >= 95) {
        posRef.current = 95;
        dirRef.current = -1;
      } else if (posRef.current <= 5) {
        posRef.current = 5;
        dirRef.current = 1;
      }

      const currentPos = posRef.current;
      setNeedlePos(currentPos);

      // Check green/red zone transitions for missed breath detection
      const inGreenNow = currentPos >= safeMin && currentPos <= safeMax;
      if (inGreenNow) {
        if (!wasInGreenRef.current) {
          // Just entered the green target window
          wasInGreenRef.current = true;
          pressedInCurrentPassRef.current = false;
        }
      } else {
        // Needle is in the red zone flanks (< 42 or > 58)
        if (wasInGreenRef.current) {
          // Just exited green without pressing!
          wasInGreenRef.current = false;

          if (!pressedInCurrentPassRef.current && !isExitingRef.current) {
            // MISSED BREATH: Player failed to press Space in the green zone!
            sound.playHeartbeat(true);
            const nextPanic = Math.min(100, panicRef.current + 20);
            panicRef.current = nextPanic;
            setPanicLevel(nextPanic);

            setLastAction({
              text: 'MISSED BREATH WINDOW! SUFFOCATING IN RED ZONE (+20% PANIC)',
              type: 'fail',
              timestamp: Date.now(),
            });

            // Signal game engine that player made an audible gasp
            onFailBreathRef.current();

            // Force ejection if panic hits 100%
            if (nextPanic >= 100) {
              isExitingRef.current = true;
              setTimeout(() => {
                onExitHidingRef.current();
              }, 600);
            }
          }
        }
      }

      // Heartbeat audio pulse based on panic
      heartbeatTimerRef.current += dt;
      const beatInterval = Math.max(0.7, 1.8 - (panicRef.current / 100) * 1.1);
      if (heartbeatTimerRef.current >= beatInterval) {
        heartbeatTimerRef.current = 0;
        sound.playHeartbeat(panicRef.current > 45);
      }

      animRef.current = requestAnimationFrame(updateLoop);
    };

    animRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [safeMin, safeMax]);

  // Handle Breath Action (Space or Click)
  const handleHoldBreath = useCallback(() => {
    if (isExitingRef.current) return;
    const current = posRef.current;

    if (current >= safeMin && current <= safeMax) {
      // SUCCESS: In the green zone!
      if (pressedInCurrentPassRef.current) {
        // Already breathed during this pass
        return;
      }
      pressedInCurrentPassRef.current = true;
      sound.playHeartbeat(false);
      const newPanic = Math.max(0, panicRef.current - 18);
      panicRef.current = newPanic;
      setPanicLevel(newPanic);
      setLastAction({
        text: 'PERFECT RHYTHM! BREATH STEADY (-18% PANIC)',
        type: 'success',
        timestamp: Date.now(),
      });
    } else {
      // FAILURE: Pressed while in the red zone!
      sound.playHeartbeat(true);
      const newPanic = Math.min(100, panicRef.current + 25);
      panicRef.current = newPanic;
      setPanicLevel(newPanic);
      setLastAction({
        text: 'PANIC GASP! PRESSED IN RED ZONE (+25% PANIC)',
        type: 'fail',
        timestamp: Date.now(),
      });
      onFailBreathRef.current();

      // If panic maxes out, force player out of hiding with cough
      if (newPanic >= 100) {
        isExitingRef.current = true;
        setTimeout(() => {
          onExitHidingRef.current();
        }, 600);
      }
    }
  }, [safeMin, safeMax]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleHoldBreath();
      } else if (e.key.toLowerCase() === 'e' || e.key === 'Escape') {
        e.preventDefault();
        onExitHiding();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHoldBreath, onExitHiding]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between pointer-events-none select-none font-mono">
      {/* Locker Louver Slit Overlay Visual */}
      <div className="absolute inset-0 bg-black/75 pointer-events-none flex flex-col justify-between">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="w-full h-3 md:h-5 bg-slate-950/90 border-y border-slate-900/60 shadow-lg"
          />
        ))}
      </div>

      {/* Top Concealment Status Bar */}
      <div className="relative z-10 flex items-center justify-between p-6 pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/95 border border-slate-800 text-slate-300 text-xs shadow-2xl backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <div>
            <span className="text-slate-400">CONCEALED IN: </span>
            <span className="font-bold text-slate-200">{hidingSpotName}</span>
          </div>
        </div>

        <button
          onClick={onExitHiding}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:border-red-500/80 hover:bg-red-950/40 text-xs font-bold transition-all shadow-xl active:scale-95"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>LEAVE HIDING [E / ESC]</span>
        </button>
      </div>

      {/* Center Breathing Rhythm Meter Modal */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-lg p-4 pointer-events-auto">
        <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-950/95 border-2 border-slate-800/90 shadow-2xl shadow-black backdrop-blur-lg">
          {/* Header Title & Panic Gauge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Heart
                className={`w-5 h-5 transition-transform duration-100 ${
                  panicLevel > 50
                    ? 'text-red-500 animate-ping'
                    : panicLevel > 25
                    ? 'text-amber-400 animate-pulse'
                    : 'text-emerald-400'
                }`}
              />
              <span className="text-xs font-bold tracking-widest uppercase text-slate-200">
                PULSE / BREATH REGULATION
              </span>
            </div>

            {/* Panic level percentage */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 uppercase">Panic:</span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  panicLevel > 60
                    ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                    : panicLevel > 30
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {Math.round(panicLevel)}%
              </span>
            </div>
          </div>

          {/* Panic Bar indicator */}
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                panicLevel > 60
                  ? 'bg-red-500'
                  : panicLevel > 30
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${panicLevel}%` }}
            />
          </div>

          {/* UNMISTAKABLE Real-Time Guidance Prompt (Tells player EXACTLY when to press) */}
          <div
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all duration-75 ${
              isInsideSafeZone
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)] scale-[1.02]'
                : 'bg-red-950/30 border-red-800/60 text-red-400/90'
            }`}
          >
            {isInsideSafeZone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span className="animate-pulse">TARGET IN SIGHT — PRESS SPACE OR CLICK NOW!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>HOLD BREATH ... WAIT FOR GREEN SWEET SPOT</span>
              </>
            )}
          </div>

          {/* Main Oscillating Gauge Track */}
          <div className="relative w-full h-14 bg-slate-950 rounded-xl border-2 border-slate-700 overflow-hidden shadow-inner flex items-center">
            {/* Background Red Danger Flank (Left: 0% to safeMin) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-red-950/50 border-r border-red-900/60 flex items-center justify-center"
              style={{ width: `${safeMin}%` }}
            >
              <span className="text-[10px] text-red-500/70 font-black tracking-widest hidden sm:inline">
                WAIT
              </span>
            </div>

            {/* Central Target Green Sweet Spot (safeMin to safeMax) */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/30 border-x-2 border-emerald-400 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              style={{ left: `${safeMin}%`, width: `${safeMax - safeMin}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping mb-0.5" />
              <span className="text-[10px] text-emerald-300 font-black tracking-wider uppercase">
                PRESS
              </span>
            </div>

            {/* Background Red Danger Flank (Right: safeMax to 100%) */}
            <div
              className="absolute top-0 bottom-0 right-0 bg-red-950/50 border-l border-red-900/60 flex items-center justify-center"
              style={{ width: `${100 - safeMax}%` }}
            >
              <span className="text-[10px] text-red-500/70 font-black tracking-widest hidden sm:inline">
                WAIT
              </span>
            </div>

            {/* Central Target Alignment Tick Marks */}
            <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-30">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="w-px h-full bg-slate-500" />
              ))}
            </div>

            {/* High-Visibility Moving Needle */}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 z-20 flex flex-col items-center justify-between pointer-events-none transition-transform duration-0"
              style={{ left: `${needlePos}%` }}
            >
              {/* Top pointer arrow */}
              <div
                className={`w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] ${
                  isInsideSafeZone ? 'border-t-emerald-300' : 'border-t-red-400'
                }`}
              />

              {/* Needle center line */}
              <div
                className={`w-1.5 h-full rounded-full shadow-lg ${
                  isInsideSafeZone
                    ? 'bg-emerald-300 shadow-[0_0_12px_#34d399]'
                    : 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                }`}
              />

              {/* Bottom pointer arrow */}
              <div
                className={`w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] ${
                  isInsideSafeZone ? 'border-b-emerald-300' : 'border-b-red-400'
                }`}
              />
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleHoldBreath}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all duration-75 shadow-xl active:scale-95 cursor-pointer ${
              isInsideSafeZone
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/50 shadow-emerald-500/50 scale-[1.01]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Wind
              className={`w-5 h-5 ${
                isInsideSafeZone ? 'text-slate-950 animate-bounce' : 'text-slate-500'
              }`}
            />
            <span>
              {isInsideSafeZone
                ? '⚡ PRESS SPACE / CLICK NOW!'
                : 'WAIT FOR GREEN ZONE... [SPACE]'}
            </span>
          </button>

          {/* Realtime Action Feedback */}
          <div className="flex items-center justify-center gap-2 min-h-6 text-center text-xs font-bold">
            {lastAction.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {lastAction.type === 'fail' && (
              <XCircle className="w-4 h-4 text-red-500 shrink-0 animate-bounce" />
            )}
            <span
              className={
                lastAction.type === 'success'
                  ? 'text-emerald-400'
                  : lastAction.type === 'fail'
                  ? 'text-red-400'
                  : 'text-slate-400'
              }
            >
              {lastAction.text}
            </span>
          </div>

          {/* Tactical Instructions Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Entering RED without pressing GREEN increases panic (+20%)</span>
            <span className="text-slate-300 font-bold">Key: [SPACE] or Click</span>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="p-6" />
    </div>
  );
};
