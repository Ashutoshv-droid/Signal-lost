/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState =
  | 'TITLE'
  | 'PLAYING'
  | 'CIRCUIT_PUZZLE'
  | 'HIDING'
  | 'NOTE_READING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'VICTORY';

export type AIState =
  | 'IDLE'
  | 'PATROL'
  | 'INVESTIGATE'
  | 'ALERT'
  | 'CHASE'
  | 'SEARCH'
  | 'RETURN'
  | 'DISABLED'
  | 'STUNNED';

export type EnemyClassType =
  | 'SENTINEL'
  | 'WATCHER'
  | 'MIMIC'
  | 'CRAWLER'
  | 'WARDEN'
  | 'GLITCH';

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: 'wall' | 'glass' | 'crate' | 'generator' | 'flesh';
}

export interface Door {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'horizontal' | 'vertical';
  requiredKey: 'none' | 'blue' | 'yellow' | 'red';
  requiresCircuitId?: string;
  isLocked: boolean;
  isOpen: boolean;
  openProgress: number; // 0 to 1
  name: string;
}

export interface VentNode {
  id: string;
  x: number;
  y: number;
  name: string;
}

export interface Terminal {
  id: string;
  x: number;
  y: number;
  name: string;
  puzzleId: string;
  isSolved: boolean;
  type: 'generator' | 'security' | 'airlock' | 'watcher_disable';
  prompt: string;
}

export interface LoreNote {
  id: string;
  x: number;
  y: number;
  title: string;
  author: string;
  timestamp: string;
  body: string;
  hint: string;
  collected: boolean;
}

export interface GroundItem {
  id: string;
  x: number;
  y: number;
  type:
    | 'keycard_blue'
    | 'keycard_yellow'
    | 'keycard_red'
    | 'power_cell'
    | 'emp_charge'
    | 'medkit'
    | 'distraction_bolt';
  name: string;
  collected: boolean;
}

export interface HidingSpot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'locker' | 'vent' | 'cryopod';
  name: string;
}

export interface ThrownDistraction {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  arcHeight: number;
}

export interface DecoyFlare {
  id: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  pulseRadius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface NoiseIndicator {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface Inventory {
  hasBlueKeycard: boolean;
  hasYellowKeycard: boolean;
  hasRedKeycard: boolean;
  powerCells: number;
  empCharges: number;
  medkits: number;
  distractionBolts: number;
  collectedNotes: string[];
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  speed: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isHiding: boolean;
  currentHidingSpot: HidingSpot | null;
  battery: number;
  flashlightOn: boolean;
  noiseRadius: number;
  health: number;
  maxHealth: number;
  invulnerableTimer: number;
  lastHitTime: number;
  inventory: Inventory;
  alertLevel: 'CALM' | 'CAUTION' | 'ALARM';
  isBeingChased: boolean;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  current: boolean;
}

export interface GameStats {
  timeElapsed: number;
  timesSpotted: number;
  damageTaken: number;
  circuitsSolved: number;
  powerCellsUsed: number;
  notesRead: number;
  stealthRank: 'Ghost' | 'Phantom' | 'Operative' | 'Survivor';
}

export interface JumpscareEvent {
  active: boolean;
  type:
    | 'oculus_apparition'
    | 'static_distortion'
    | 'mimic_shriek'
    | 'crawler_drop'
    | 'red_hallucination';
  timer: number;
  maxTimer: number;
  alpha: number;
}
