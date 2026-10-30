/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX, Shield, Play } from 'lucide-react';
import { sound } from '../game/audio';

interface Props {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<Props> = ({ onStart, isMuted, onToggleMute }) => {
  useEffect(() => {
    sound.setGameplayActive(false);
    sound.stopAllGameplayAudio();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 md:p-12 select-none pointer-events-auto">
      {/* Top Bar with Sound Toggle & Station Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            STATION EPSILON · SUB-LEVEL 7
          </span>
        </div>

        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span>{isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with 35% Negative Space */}
      <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-auto py-8">
        {/* Bespoke Sci-Fi Vector Title Lockup */}
        <div className="w-full max-w-xl mb-4">
          <svg viewBox="0 0 680 130" className="w-full drop-shadow-2xl">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background geometric accents */}
            <path
              d="M 20 65 L 120 65 M 560 65 L 660 65"
              stroke="#0369a1"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <rect x="15" y="60" width="10" height="10" fill="#38bdf8" />
            <rect x="655" y="60" width="10" height="10" fill="#38bdf8" />

            {/* Glowing Main Title */}
            <text
              x="340"
              y="75"
              textAnchor="middle"
              fill="url(#titleGrad)"
              filter="url(#neonGlow)"
              fontFamily="'Chakra Petch', sans-serif"
              fontSize="72"
              fontWeight="800"
              letterSpacing="10"
            >
              SIGNAL LOST
            </text>

            {/* Sub-label */}
            <text
              x="340"
              y="110"
              textAnchor="middle"
              fill="#94a3b8"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="12"
              letterSpacing="7"
            >
              TACTICAL SCI-FI STEALTH PROTOCOL
            </text>
          </svg>
        </div>

        {/* Atmosphere Briefing */}
        <p className="text-slate-300 font-mono text-sm max-w-lg leading-relaxed mb-8">
          Station Epsilon has been overrun by acoustic blind stalkers and eldritch oculus gazers.
          Evade entities by crouching silently, toggle flashlight strategically, conceal inside lockers,
          manage your suit battery, and reach the evacuation shuttle.
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={() => {
            sound.resume();
            onStart();
          }}
          className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold tracking-wider text-base shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-all duration-200 active:scale-95"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>INITIALIZE ESCAPE</span>
          <span className="text-xs font-normal opacity-75 ml-1 hidden sm:inline">
            [ENTER or SPACE]
          </span>
        </button>
      </div>

      {/* Single Flat Control-Hint Line Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>WASD Move · Shift Sprint · C Crouch (Mute) · F Flashlight · E Hide/Action · 1 Cell · 2 EMP · 3 Medkit</span>
        </div>
        <div className="text-slate-500">
          Sensors: Acoustic Stalkers & Oculus Gaze Active
        </div>
      </div>
    </div>
  );
};
