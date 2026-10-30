/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { LoreNote } from '../game/types';
import { FileText, X, AlertCircle, Compass } from 'lucide-react';

interface Props {
  note: LoreNote;
  onClose: () => void;
}

export const NoteModal: React.FC<Props> = ({ note, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'e' || e.code === 'Space') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none font-mono">
      <div className="relative w-full max-w-xl bg-slate-950 border border-red-500/40 rounded-2xl shadow-2xl shadow-red-950/60 p-6 md:p-8 flex flex-col gap-5 overflow-hidden">
        {/* Blood stain & scanline CRT overlays */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent pointer-events-none opacity-40 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold">
                RECOVERED CREW SLATE · {note.timestamp}
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                {note.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Close Note [ESC / E]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author metadata */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg">
          <span>ORIGIN: <strong className="text-slate-200">{note.author}</strong></span>
          <span className="text-red-400 font-semibold text-[10px]">BIO-DATA CORRUPTED</span>
        </div>

        {/* Visceral Body Text */}
        <div className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 font-mono">
          {note.body}
        </div>

        {/* Tactical Objective Hint Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs">
          <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-200 block mb-0.5">TACTICAL DIRECTIVE HINT:</span>
            <span>{note.hint}</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">E</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]">ESC</kbd> to return to field
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors"
          >
            Close Datapad
          </button>
        </div>
      </div>
    </div>
  );
};
