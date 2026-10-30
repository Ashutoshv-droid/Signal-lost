/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, Objective, HidingSpot, Door, Terminal } from '../game/types';
import { EnemyBase } from '../game/ai/EnemyBase';
import { ProximityRadar } from './ProximityRadar';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Heart,
  PlusSquare,
  Radio,
  Zap,
  Shield,
  Key,
  Pause,
  Flashlight,
  AlertTriangle,
  FileText,
  Target,
  Terminal as TerminalIcon,
} from 'lucide-react';

interface Props {
  player: Player;
  currentObjective: Objective | undefined;
  enemies: EnemyBase[];
  hidingSpots: HidingSpot[];
  doors: Door[];
  terminals: Terminal[];
  facilitySuspicion: number;
  debugMode: boolean;
  onToggleFlashlight: () => void;
  onUsePowerCell: () => void;
  onUseMedkit: () => void;
  onDeployEmp: () => void;
  onThrowDistraction: () => void;
  onToggleDebug: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<Props> = ({
  player,
  currentObjective,
  enemies,
  hidingSpots,
  doors,
  terminals,
  facilitySuspicion,
  debugMode,
  onToggleFlashlight,
  onUsePowerCell,
  onUseMedkit,
  onDeployEmp,
  onThrowDistraction,
  onToggleDebug,
  onPause,
}) => {
  const batteryPct = Math.round(player.battery);
  const isLowBattery = batteryPct <= 20;
  const isLowHealth = player.health <= 35;
  const suspicionInt = Math.round(facilitySuspicion);

  let suspicionTierLabel = 'TIER 1: NORMAL PATROLS';
  let suspicionColor = 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
  if (suspicionInt > 80) {
    suspicionTierLabel = 'TIER 5: FACILITY LOCKDOWN';
    suspicionColor = 'text-red-400 bg-red-950/80 border-red-500 animate-pulse';
  } else if (suspicionInt > 60) {
    suspicionTierLabel = 'TIER 4: COORDINATED SEARCH';
    suspicionColor = 'text-orange-400 bg-orange-950/70 border-orange-500/60';
  } else if (suspicionInt > 40) {
    suspicionTierLabel = 'TIER 3: HIGH SURVEILLANCE';
    suspicionColor = 'text-amber-400 bg-amber-950/70 border-amber-500/50';
  } else if (suspicionInt > 20) {
    suspicionTierLabel = 'TIER 2: ELEVATED VIGILANCE';
    suspicionColor = 'text-yellow-400 bg-yellow-950/60 border-yellow-500/40';
  }

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 md:p-6 select-none font-mono">
      {/* Top Bar Perimeter Cluster */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Health, Battery, Flashlight & Suspicion Cluster */}
        <div className="pointer-events-auto flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-slate-200 shadow-xl">
          {/* Health Row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Heart
                  className={`w-4 h-4 ${
                    isLowHealth ? 'text-red-500 animate-pulse' : 'text-red-400'
                  }`}
                />
                <span className="font-semibold tracking-wider">SUIT INTEGRITY</span>
              </div>
              <span
                className={`tabular-nums font-bold ${
                  isLowHealth ? 'text-red-400 animate-bounce' : 'text-slate-100'
                }`}
              >
                {Math.round(player.health)} / 100
              </span>
            </div>

            <div className="w-48 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isLowHealth
                    ? 'bg-red-500 shadow-sm shadow-red-500'
                    : 'bg-emerald-500 shadow-sm shadow-emerald-500'
                }`}
                style={{ width: `${player.health}%` }}
              />
            </div>
          </div>

          {/* Battery Row */}
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                {isLowBattery ? (
                  <BatteryWarning className="w-4 h-4 text-red-400 animate-pulse" />
                ) : player.battery > 80 ? (
                  <BatteryCharging className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Battery className="w-4 h-4 text-cyan-400" />
                )}
                <span className="font-semibold tracking-wider">BATTERY</span>
              </div>
              <span
                className={`tabular-nums font-bold ${
                  isLowBattery ? 'text-red-400 animate-pulse' : 'text-cyan-400'
                }`}
              >
                {batteryPct}%
              </span>
            </div>

            <div className="w-48 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isLowBattery
                    ? 'bg-red-500 shadow-sm shadow-red-500'
                    : batteryPct < 50
                    ? 'bg-amber-400 shadow-sm shadow-amber-400'
                    : 'bg-cyan-400 shadow-sm shadow-cyan-400'
                }`}
                style={{ width: `${batteryPct}%` }}
              />
            </div>
          </div>

          {/* Facility Suspicion Meter */}
          <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">FACILITY SUSPICION</span>
              <span className="tabular-nums font-bold text-slate-200">{suspicionInt}%</span>
            </div>
            <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-200 ${
                  suspicionInt > 80
                    ? 'bg-red-500'
                    : suspicionInt > 50
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${suspicionInt}%` }}
              />
            </div>
            <div className={`px-2 py-0.5 rounded text-[9px] border font-semibold ${suspicionColor}`}>
              {suspicionTierLabel}
            </div>
          </div>

          {/* Flashlight Toggle Button */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <button
              onClick={onToggleFlashlight}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                player.flashlightOn && player.battery > 0
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle Flashlight Beam [F]. Warning: Watcher entities can see light!"
            >
              <Flashlight className="w-3.5 h-3.5" />
              <span>BEAM: {player.flashlightOn && player.battery > 0 ? 'ON' : 'OFF'} [F]</span>
            </button>

            {player.flashlightOn && (
              <span
                className="text-[10px] text-amber-400 flex items-center gap-1"
                title="Watcher entities possess acute light sensitivity!"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>LIGHT DETECTABLE</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Active Directive Banner */}
        {currentObjective && (
          <div className="pointer-events-auto max-w-md hidden lg:flex flex-col items-center text-center px-4 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-slate-200 shadow-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>PRIMARY DIRECTIVE</span>
            </div>
            <div className="text-xs font-bold text-white tracking-wide">
              {currentObjective.title}
            </div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
              {currentObjective.description}
            </div>
          </div>
        )}

        {/* Right: Proximity Radar, Debug & Pause */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <ProximityRadar
            player={player}
            enemies={enemies}
            hidingSpots={hidingSpots}
            doors={doors}
            terminals={terminals}
          />

          <div className="flex flex-col gap-2">
            {/* Status & Acoustic info */}
            <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-200 shadow-lg text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold text-[10px]">ALERT LEVEL</span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    player.alertLevel === 'ALARM'
                      ? 'bg-red-950 text-red-400 border border-red-500 animate-pulse'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {player.alertLevel === 'ALARM' ? 'RED PURSUIT' : 'COVERT'}
                </span>
              </div>

              <div className="text-[10px] text-slate-400">
                <span>ACOUSTIC: </span>
                <span
                  className={`font-semibold ${
                    player.isSprinting
                      ? 'text-red-400 font-bold'
                      : player.isCrouching
                      ? 'text-emerald-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {player.isSprinting
                    ? 'SPRINT [LOUD]'
                    : player.isCrouching
                    ? 'CROUCH [SILENT]'
                    : 'WALK'}
                </span>
              </div>

              {/* Notes Collected indicator */}
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                <FileText className="w-3 h-3 text-red-400" />
                <span>SLATES: {player.inventory.collectedNotes.length} / 5</span>
              </div>
            </div>

            {/* Developer AI Debug Mode Toggle */}
            <button
              onClick={onToggleDebug}
              className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-lg ${
                debugMode
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                  : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Developer AI Debug Overlay [F1 or \\]"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>DEBUG [F1]</span>
            </button>

            {/* Pause Button */}
            <button
              onClick={onPause}
              className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-colors shadow-lg flex items-center justify-center"
              title="Pause Simulation [ESC]"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter: Keycards & Consumable Hotbar */}
      <div className="flex items-end justify-between gap-4 pointer-events-auto">
        {/* Keycard Clearance Slots */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mr-1 hidden sm:flex">
            <Key className="w-3.5 h-3.5" />
            <span>KEYS:</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
              player.inventory.hasBlueKeycard
                ? 'bg-blue-950/90 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-600'
            }`}
            title="Sector Alpha Keycard"
          >
            <div className={`w-2 h-2 rounded-full ${player.inventory.hasBlueKeycard ? 'bg-blue-400' : 'bg-slate-700'}`} />
            <span>ALPHA</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
              player.inventory.hasYellowKeycard
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-600'
            }`}
            title="Security Clearance Keycard"
          >
            <div className={`w-2 h-2 rounded-full ${player.inventory.hasYellowKeycard ? 'bg-amber-400' : 'bg-slate-700'}`} />
            <span>SECURITY</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
              player.inventory.hasRedKeycard
                ? 'bg-red-950/90 border-red-500 text-red-300 shadow-sm shadow-red-500/40 animate-pulse'
                : 'bg-slate-900/60 border-slate-800 text-slate-600'
            }`}
            title="Master Airlock Keycard"
          >
            <div className={`w-2 h-2 rounded-full ${player.inventory.hasRedKeycard ? 'bg-red-400' : 'bg-slate-700'}`} />
            <span>MASTER</span>
          </div>
        </div>

        {/* Consumables Hotbar */}
        <div className="flex items-center gap-2 md:gap-2.5 p-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl">
          {/* Power Cell Button */}
          <button
            onClick={onUsePowerCell}
            disabled={player.inventory.powerCells === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              player.inventory.powerCells > 0
                ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 active:scale-95'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Recharge battery (+50%) [1/Q]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CELL [1]</span>
            <span className="tabular-nums font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
              x{player.inventory.powerCells}
            </span>
          </button>

          {/* EMP Decoy Flare Button */}
          <button
            onClick={onDeployEmp}
            disabled={player.inventory.empCharges === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              player.inventory.empCharges > 0
                ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/80 active:scale-95'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Deploy EMP flare: stuns and distracts all nearby entities [2]"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EMP [2]</span>
            <span className="tabular-nums font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
              x{player.inventory.empCharges}
            </span>
          </button>

          {/* Emergency Medkit Button */}
          <button
            onClick={onUseMedkit}
            disabled={player.inventory.medkits === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              player.inventory.medkits > 0
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 active:scale-95'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Use Medkit (+50 HP) [3/H]"
          >
            <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">MEDKIT [3]</span>
            <span className="tabular-nums font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
              x{player.inventory.medkits}
            </span>
          </button>

          {/* Thrown Distraction Bolt Button */}
          <button
            onClick={onThrowDistraction}
            disabled={player.inventory.distractionBolts === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
              player.inventory.distractionBolts > 0
                ? 'bg-blue-950/80 border-blue-500/40 text-blue-300 hover:bg-blue-900/80 active:scale-95'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Throw distraction bolt to lure sentries [Right-Click / G / 4]"
          >
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">BOLT [G]</span>
            <span className="tabular-nums font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
              x{player.inventory.distractionBolts}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
