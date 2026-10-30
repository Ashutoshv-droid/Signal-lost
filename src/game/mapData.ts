/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wall, Door, Terminal, GroundItem, Objective, HidingSpot } from './types';

export const WORLD_WIDTH = 3600;
export const WORLD_HEIGHT = 2600;

export function getInitialMap() {
  const walls: Wall[] = [
    // Outer boundary walls
    { id: 'bound-top', x: 0, y: 0, w: WORLD_WIDTH, h: 36 },
    { id: 'bound-bottom', x: 0, y: WORLD_HEIGHT - 36, w: WORLD_WIDTH, h: 36 },
    { id: 'bound-left', x: 0, y: 0, w: 36, h: WORLD_HEIGHT },
    { id: 'bound-right', x: WORLD_WIDTH - 36, y: 0, w: 36, h: WORLD_HEIGHT },

    // Sector Alpha: Cryo Quarantine (Top-Left: 36-1000, 36-800)
    { id: 'w-alpha-south-1', x: 36, y: 800, w: 380, h: 32 },
    // Door Alpha at x=416, w=130, y=800
    { id: 'w-alpha-south-2', x: 546, y: 800, w: 454, h: 32 },
    { id: 'w-alpha-east', x: 1000, y: 36, w: 32, h: 796 },

    // Alpha internal structures
    { id: 'w-alpha-crate-1', x: 160, y: 160, w: 80, h: 80, type: 'crate' },
    { id: 'w-alpha-crate-2', x: 160, y: 480, w: 80, h: 80, type: 'crate' },
    { id: 'w-alpha-partition', x: 380, y: 200, w: 32, h: 360, type: 'crate' },
    { id: 'w-alpha-desk', x: 650, y: 300, w: 220, h: 36, type: 'crate' },

    // Sector Beta: Sub-Reactor Hub (Center-Top: 1032-2200, 36-800)
    { id: 'w-beta-east', x: 2200, y: 36, w: 32, h: 796 },
    { id: 'w-beta-south-1', x: 1032, y: 800, w: 450, h: 32 },
    // Door Beta at x=1482, w=136, y=800
    { id: 'w-beta-south-2', x: 1618, y: 800, w: 582, h: 32 },

    // Reactor Core structure
    { id: 'w-reactor-core', x: 1500, y: 260, w: 220, h: 220, type: 'generator' },
    { id: 'w-reactor-pipe-1', x: 1260, y: 240, w: 60, h: 260, type: 'generator' },
    { id: 'w-reactor-pipe-2', x: 1880, y: 240, w: 60, h: 260, type: 'generator' },

    // Sector Gamma: Bio-Containment & Security (Top-Right: 2232-3564, 36-1050)
    { id: 'w-gamma-south-1', x: 2232, y: 1050, w: 420, h: 32 },
    // Door Gamma at x=2652, w=136, y=1050
    { id: 'w-gamma-south-2', x: 2788, y: 1050, w: 776, h: 32 },

    // Gamma internal test pods & flesh walls
    { id: 'w-gamma-lab-1', x: 2500, y: 300, w: 280, h: 40, type: 'flesh' },
    { id: 'w-gamma-lab-2', x: 2500, y: 550, w: 280, h: 40, type: 'flesh' },
    { id: 'w-gamma-flesh-mass', x: 3100, y: 260, w: 160, h: 160, type: 'flesh' },
    { id: 'w-gamma-server-1', x: 3300, y: 600, w: 180, h: 40, type: 'crate' },

    // Central Transit Highway (y=832 to 1250)
    { id: 'w-transit-south-1', x: 36, y: 1250, w: 750, h: 32 },
    // Door Delta at x=786, w=136, y=1250
    { id: 'w-transit-south-2', x: 922, y: 1250, w: 1200, h: 32 },
    // Door Omega at x=2122, w=136, y=1250
    { id: 'w-transit-south-3', x: 2258, y: 1250, w: 1306, h: 32 },

    // Highway cover pillars
    { id: 'w-corr-pillar-1', x: 600, y: 1040, w: 64, h: 64, type: 'crate' },
    { id: 'w-corr-pillar-2', x: 1250, y: 1040, w: 64, h: 64, type: 'crate' },
    { id: 'w-corr-pillar-3', x: 1850, y: 1040, w: 64, h: 64, type: 'crate' },
    { id: 'w-corr-pillar-4', x: 2500, y: 1150, w: 64, h: 64, type: 'crate' },
    { id: 'w-corr-pillar-5', x: 3000, y: 1150, w: 64, h: 64, type: 'crate' },

    // Sector Delta: Bio-Abyss & Commander Vault (Bottom-Left: 36-1900, 1282-2564)
    { id: 'w-delta-vert', x: 1900, y: 1282, w: 32, h: 1282 },
    { id: 'w-delta-flesh-1', x: 300, y: 1550, w: 450, h: 36, type: 'flesh' },
    { id: 'w-delta-flesh-2', x: 950, y: 1750, w: 500, h: 36, type: 'flesh' },
    { id: 'w-delta-vault-wall1', x: 1050, y: 2050, w: 320, h: 32 },
    // Door Inner Vault at x=1370, w=130, y=2050
    { id: 'w-delta-vault-wall2', x: 1500, y: 2050, w: 400, h: 32 },
    { id: 'w-delta-safe-desk', x: 1450, y: 2350, w: 200, h: 60, type: 'generator' },
    { id: 'w-delta-crate-pile', x: 350, y: 2200, w: 140, h: 140, type: 'crate' },

    // Sector Omega: Airlock & Evacuation Shuttle Launch (Bottom-Right: 1932-3564, 1282-2564)
    { id: 'w-omega-decon-w1', x: 1932, y: 1750, w: 380, h: 32 },
    // Door Decon at x=2312, w=120, y=1750
    { id: 'w-omega-decon-w2', x: 2432, y: 1750, w: 400, h: 32 },
    { id: 'w-omega-pad-wall', x: 2600, y: 1950, w: 40, h: 380, type: 'generator' },
    { id: 'w-omega-cargo-1', x: 3100, y: 1550, w: 120, h: 120, type: 'crate' },
    { id: 'w-omega-cargo-2', x: 3100, y: 2150, w: 120, h: 120, type: 'crate' },
  ];

  const doors: Door[] = [
    // Alpha Security Exit (Blue Keycard)
    {
      id: 'door-alpha',
      name: 'Alpha Quarantine Air-Gate',
      x: 416,
      y: 796,
      w: 130,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'blue',
      isLocked: true,
      isOpen: false,
      openProgress: 0,
    },
    // Sub-Reactor Maintenance Gate (Powered - requires circuit-subreactor)
    {
      id: 'door-beta',
      name: 'Sub-Reactor Primary Gate',
      x: 1482,
      y: 796,
      w: 136,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'none',
      requiresCircuitId: 'circuit-subreactor',
      isLocked: true,
      isOpen: false,
      openProgress: 0,
    },
    // Gamma Security Gate (Yellow Keycard)
    {
      id: 'door-gamma',
      name: 'Bio-Specimen Security Gate',
      x: 2652,
      y: 1046,
      w: 136,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'yellow',
      isLocked: true,
      isOpen: false,
      openProgress: 0,
    },
    // Sector Delta Vault Access (Requires Security Grid circuit solved)
    {
      id: 'door-delta',
      name: 'Bio-Abyss Lockdown Blast-Door',
      x: 786,
      y: 1246,
      w: 136,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'none',
      requiresCircuitId: 'circuit-security',
      isLocked: true,
      isOpen: false,
      openProgress: 0,
    },
    // Inner Safe Vault Door
    {
      id: 'door-vault-inner',
      name: 'Commander Safe Vault Hatch',
      x: 1370,
      y: 2046,
      w: 130,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'none',
      isLocked: false,
      isOpen: false,
      openProgress: 0,
    },
    // Omega Master Airlock (Red Keycard)
    {
      id: 'door-omega',
      name: 'Evacuation Bay Master Airlock',
      x: 2122,
      y: 1246,
      w: 136,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'red',
      isLocked: true,
      isOpen: false,
      openProgress: 0,
    },
    // Decontamination Inner Chamber
    {
      id: 'door-decon',
      name: 'Decontamination Pressure Door',
      x: 2312,
      y: 1746,
      w: 120,
      h: 40,
      orientation: 'horizontal',
      requiredKey: 'none',
      isLocked: false,
      isOpen: false,
      openProgress: 0,
    },
  ];

  const hidingSpots: HidingSpot[] = [
    // Alpha Quarantine lockers
    { id: 'hide-alpha-1', x: 270, y: 150, w: 46, h: 56, type: 'locker', name: 'Sanitation Locker #01' },
    { id: 'hide-alpha-2', x: 820, y: 180, w: 50, h: 60, type: 'cryopod', name: 'Cryo-Preservation Capsule' },

    // Central Transit Highway Lockers & Maintenance Vents
    { id: 'hide-transit-vent', x: 980, y: 920, w: 54, h: 48, type: 'vent', name: 'Sub-Floor Air Vent' },
    { id: 'hide-transit-locker', x: 1650, y: 910, w: 46, h: 56, type: 'locker', name: 'Maintenance Bulkhead Locker' },
    { id: 'hide-transit-vent2', x: 2350, y: 920, w: 54, h: 48, type: 'vent', name: 'Ventilation Shaft Grate' },

    // Beta Reactor lockers
    { id: 'hide-beta-pod', x: 1980, y: 150, w: 50, h: 60, type: 'cryopod', name: 'Coolant Flush Pod' },

    // Gamma Bio-Containment lockers
    { id: 'hide-gamma-locker', x: 2950, y: 180, w: 46, h: 56, type: 'locker', name: 'Bio-Hazard Suit Locker' },
    { id: 'hide-gamma-vent', x: 3400, y: 450, w: 54, h: 48, type: 'vent', name: 'Decontamination Vent' },

    // Delta Abyss lockers
    { id: 'hide-delta-vent', x: 550, y: 1620, w: 54, h: 48, type: 'vent', name: 'Drainage Crawlspace' },
    { id: 'hide-delta-locker', x: 850, y: 2150, w: 46, h: 56, type: 'locker', name: 'Commander Armory Locker' },

    // Omega Shuttle Bay
    { id: 'hide-omega-locker', x: 2550, y: 1620, w: 46, h: 56, type: 'locker', name: 'Flight Crew Supply Locker' },
  ];

  const terminals: Terminal[] = [
    {
      id: 'terminal-reactor',
      x: 1610,
      y: 540,
      name: 'Sub-Reactor Primary Relay',
      puzzleId: 'circuit-subreactor',
      isSolved: false,
      type: 'generator',
      prompt: '[E] Calibrate Sub-Reactor Power Relays',
    },
    {
      id: 'terminal-security',
      x: 3150,
      y: 650,
      name: 'Security Grid Matrix Override',
      puzzleId: 'circuit-security',
      isSolved: false,
      type: 'security',
      prompt: '[E] Bypass Vault Lockdown Conduits',
    },
    {
      id: 'terminal-shuttle',
      x: 2900,
      y: 2050,
      name: 'Escape Shuttle Flight Mainframe',
      puzzleId: 'escape-sequence',
      isSolved: false,
      type: 'airlock',
      prompt: '[E] Initiate Shuttle Launch Sequence',
    },
  ];

  const groundItems: GroundItem[] = [
    // Alpha Blue Keycard
    {
      id: 'item-card-blue',
      x: 750,
      y: 220,
      type: 'keycard_blue',
      name: 'Sector Alpha Keycard (Blue)',
      collected: false,
    },
    // Alpha Power Cell & Medkit
    {
      id: 'item-cell-1',
      x: 240,
      y: 350,
      type: 'power_cell',
      name: 'High-Density Power Cell',
      collected: false,
    },
    {
      id: 'item-medkit-1',
      x: 320,
      y: 500,
      type: 'medkit',
      name: 'Emergency Medkit (+50 HP)',
      collected: false,
    },

    // Transit Highway Supplies
    {
      id: 'item-cell-2',
      x: 1400,
      y: 1100,
      type: 'power_cell',
      name: 'High-Density Power Cell',
      collected: false,
    },
    {
      id: 'item-emp-1',
      x: 1950,
      y: 1100,
      type: 'emp_charge',
      name: 'EMP Decoy Pulse Charge',
      collected: false,
    },

    // Gamma Yellow Keycard & EMP
    {
      id: 'item-card-yellow',
      x: 3380,
      y: 200,
      type: 'keycard_yellow',
      name: 'Security Clearance Keycard (Yellow)',
      collected: false,
    },
    {
      id: 'item-medkit-2',
      x: 2600,
      y: 450,
      type: 'medkit',
      name: 'Emergency Medkit (+50 HP)',
      collected: false,
    },
    {
      id: 'item-emp-2',
      x: 3450,
      y: 800,
      type: 'emp_charge',
      name: 'EMP Decoy Pulse Charge',
      collected: false,
    },

    // Delta Red Master Keycard in Commander Vault
    {
      id: 'item-card-red',
      x: 1550,
      y: 2400,
      type: 'keycard_red',
      name: 'Master Airlock Keycard (Red)',
      collected: false,
    },
    {
      id: 'item-medkit-3',
      x: 1200,
      y: 2400,
      type: 'medkit',
      name: 'Emergency Medkit (+50 HP)',
      collected: false,
    },
    {
      id: 'item-cell-3',
      x: 500,
      y: 1850,
      type: 'power_cell',
      name: 'High-Density Power Cell',
      collected: false,
    },

    // Omega Shuttle Bay Supplies
    {
      id: 'item-cell-4',
      x: 2200,
      y: 2000,
      type: 'power_cell',
      name: 'High-Density Power Cell',
      collected: false,
    },
    {
      id: 'item-emp-3',
      x: 3200,
      y: 1800,
      type: 'emp_charge',
      name: 'EMP Decoy Pulse Charge',
      collected: false,
    },
  ];

  const objectives: Objective[] = [
    {
      id: 'obj-blue-card',
      title: 'Escape Cryo Quarantine',
      description: 'Locate the Blue Keycard in Alpha storage to breach the holding air-gate.',
      isCompleted: false,
      current: true,
    },
    {
      id: 'obj-subreactor',
      title: 'Synchronize Sub-Reactor Conduit',
      description: 'Reach Sub-Reactor Beta and solve the circuit relays while avoiding the Oculus Watcher.',
      isCompleted: false,
      current: false,
    },
    {
      id: 'obj-yellow-card',
      title: 'Breach Bio-Containment Core',
      description: 'Infiltrate Sector Gamma to acquire the Yellow Security Keycard and override the vault lockdown.',
      isCompleted: false,
      current: false,
    },
    {
      id: 'obj-master-card',
      title: 'Retrieve Master Airlock Keycard',
      description: 'Sneak into Commander Safe Vault past Blind Stalkers to obtain the Red Master Keycard.',
      isCompleted: false,
      current: false,
    },
    {
      id: 'obj-escape',
      title: 'Evacuate Station Epsilon',
      description: 'Unlock Sector Omega Master Airlock, activate the shuttle mainframe, and escape.',
      isCompleted: false,
      current: false,
    },
  ];

  return { walls, doors, hidingSpots, terminals, groundItems, objectives };
}
