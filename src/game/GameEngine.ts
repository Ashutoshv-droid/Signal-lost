/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GameState,
  Player,
  Wall,
  Door,
  Terminal,
  GroundItem,
  HidingSpot,
  Particle,
  NoiseIndicator,
  DecoyFlare,
  ThrownDistraction,
  Objective,
  GameStats,
  JumpscareEvent,
  LoreNote,
  VentNode,
} from './types';
import { getInitialMap, WORLD_WIDTH, WORLD_HEIGHT } from './mapData';
import { LORE_NOTES } from './notesData';
import { FacilityAIManager } from './ai/FacilityAIManager';
import { EnemyBase } from './ai/EnemyBase';
import {
  resolveCircleAABB,
  castRay,
  normalizeAngle,
  lerpAngle,
} from './physics';
import { sound } from './audio';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onOpenCircuitPuzzle: (puzzleId: string) => void;
  onOpenHidingMinigame: (hidingSpotName: string) => void;
  onOpenNote: (note: LoreNote) => void;
  onNotification: (msg: string, type?: 'info' | 'warning' | 'success') => void;
  onStatsUpdate: (stats: GameStats) => void;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Central AI Manager
  public aiManager: FacilityAIManager;

  // Game state
  public state: GameState = 'TITLE';
  public walls: Wall[] = [];
  public doors: Door[] = [];
  public hidingSpots: HidingSpot[] = [];
  public ventNodes: VentNode[] = [];
  public terminals: Terminal[] = [];
  public groundItems: GroundItem[] = [];
  public loreNotes: LoreNote[] = [];
  public objectives: Objective[] = [];
  public particles: Particle[] = [];
  public noiseIndicators: NoiseIndicator[] = [];
  public decoyFlares: DecoyFlare[] = [];
  public thrownDistractions: ThrownDistraction[] = [];

  public player!: Player;
  public stats: GameStats = {
    timeElapsed: 0,
    timesSpotted: 0,
    damageTaken: 0,
    circuitsSolved: 0,
    powerCellsUsed: 0,
    notesRead: 0,
    stealthRank: 'Ghost',
  };

  // Jumpscares
  public jumpscare: JumpscareEvent = {
    active: false,
    type: 'oculus_apparition',
    timer: 0,
    maxTimer: 0.38,
    alpha: 0,
  };
  private jumpscareCooldown: number = 22;

  // Camera & Visual FX
  public camera = { x: 320, y: 350, targetX: 320, targetY: 350, shake: 0 };
  public bloodFlashAlpha: number = 0;

  // Inputs
  private keys: Record<string, boolean> = {};
  private mousePos = { x: 0, y: 0 };
  private mouseWorld = { x: 0, y: 0 };

  // Loop & Tracking
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private stepInterval: number = 0;
  private activeTerminalInRange: Terminal | null = null;
  private activeDoorInRange: Door | null = null;
  private activeHidingSpotInRange: HidingSpot | null = null;
  private activeNoteInRange: LoreNote | null = null;
  private evacuationTimer: number = 0;
  private isEvacuating: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.aiManager = new FacilityAIManager();
    this.initMap();
    this.initEventListeners();
  }

  public initMap() {
    const data = getInitialMap();
    this.walls = data.walls;
    this.doors = data.doors;
    this.hidingSpots = data.hidingSpots;
    this.terminals = data.terminals;
    this.groundItems = data.groundItems;
    this.objectives = data.objectives;
    this.loreNotes = LORE_NOTES.map((n) => ({ ...n, collected: false }));
    this.particles = [];
    this.noiseIndicators = [];
    this.decoyFlares = [];
    this.thrownDistractions = [];

    // Vent Network nodes for Crawlers & Hiding
    this.ventNodes = [
      { id: 'vent-alpha', x: 800, y: 300, name: 'Quarantine Duct Alpha' },
      { id: 'vent-highway', x: 1400, y: 1040, name: 'Transit Highway Grate' },
      { id: 'vent-reactor', x: 1950, y: 450, name: 'Reactor Coolant Shaft' },
      { id: 'vent-gamma', x: 3200, y: 450, name: 'Bio-Containment Shaft' },
      { id: 'vent-delta', x: 950, y: 1850, name: 'Deep Abyss Drain' },
      { id: 'vent-omega', x: 2500, y: 1850, name: 'Shuttle Exhaust Duct' },
    ];

    // Initialize 6 AI Enemy Classes via FacilityAIManager
    this.aiManager.initEnemies(this.ventNodes);

    // Fast, responsive tactical player (250 walk, 385 sprint, 145 crouch)
    this.player = {
      x: 320,
      y: 350,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: 16,
      speed: 250,
      isSprinting: false,
      isCrouching: false,
      isHiding: false,
      currentHidingSpot: null,
      battery: 100,
      flashlightOn: true,
      noiseRadius: 75,
      health: 100,
      maxHealth: 100,
      invulnerableTimer: 0,
      lastHitTime: 0,
      inventory: {
        hasBlueKeycard: false,
        hasYellowKeycard: false,
        hasRedKeycard: false,
        powerCells: 1,
        empCharges: 1,
        medkits: 1,
        distractionBolts: 4,
        collectedNotes: [],
      },
      alertLevel: 'CALM',
      isBeingChased: false,
    };

    this.stats = {
      timeElapsed: 0,
      timesSpotted: 0,
      damageTaken: 0,
      circuitsSolved: 0,
      powerCellsUsed: 0,
      notesRead: 0,
      stealthRank: 'Ghost',
    };

    this.evacuationTimer = 0;
    this.isEvacuating = false;
    this.bloodFlashAlpha = 0;
    this.jumpscareCooldown = 24;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
  }

  public start() {
    this.lastTime = performance.now();
    sound.init();
    this.gameLoop(this.lastTime);
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.setGameplayActive(false);
    sound.stopAllGameplayAudio();
    this.removeEventListeners();
  }

  public setState(newState: GameState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);

    if (newState === 'PLAYING') {
      sound.resume();
      sound.setGameplayActive(true);
    } else {
      sound.setGameplayActive(false);
      sound.stopAllGameplayAudio();
      this.player.isBeingChased = false;
      this.player.alertLevel = 'CALM';
    }
  }

  public toggleDebugMode() {
    this.aiManager.debugMode = !this.aiManager.debugMode;
    this.callbacks.onNotification(
      this.aiManager.debugMode ? 'DEVELOPER AI DEBUG MODE: ON [F1]' : 'AI DEBUG MODE: OFF',
      'info'
    );
  }

  public toggleFlashlight(): boolean {
    if (this.player.battery > 0) {
      this.player.flashlightOn = !this.player.flashlightOn;
      sound.playFlashlightToggle();
      this.callbacks.onNotification(
        this.player.flashlightOn
          ? 'Flashlight ON [F] (Warning: Oculus Watchers attracted to light!)'
          : 'Flashlight OFF [F] (Darkness covert mode)',
        'info'
      );
      return this.player.flashlightOn;
    } else {
      this.callbacks.onNotification('Suit battery depleted: Seek Power Cells', 'warning');
      return false;
    }
  }

  public throwDistraction(targetX: number, targetY: number) {
    if (this.player.inventory.distractionBolts > 0 && !this.player.isHiding) {
      this.player.inventory.distractionBolts -= 1;
      this.thrownDistractions.push({
        id: `distract-${Date.now()}`,
        startX: this.player.x,
        startY: this.player.y,
        x: this.player.x,
        y: this.player.y,
        targetX,
        targetY,
        progress: 0,
        arcHeight: 28,
      });
      this.callbacks.onNotification('Noise distraction bolt thrown!', 'info');
    } else if (this.player.inventory.distractionBolts === 0) {
      this.callbacks.onNotification('No distraction bolts remaining', 'warning');
    }
  }

  public usePowerCell() {
    if (this.player.inventory.powerCells > 0 && this.player.battery < 99) {
      this.player.inventory.powerCells -= 1;
      this.player.battery = Math.min(100, this.player.battery + 50);
      sound.playPowerCellCharge();
      this.stats.powerCellsUsed += 1;
      this.addParticles(this.player.x, this.player.y, '#38bdf8', 16);
      this.callbacks.onNotification('Power Cell applied: +50% Battery', 'success');
    } else if (this.player.inventory.powerCells === 0) {
      this.callbacks.onNotification('No Power Cells available in inventory', 'warning');
    }
  }

  public useMedkit() {
    if (this.player.inventory.medkits > 0 && this.player.health < 100) {
      this.player.inventory.medkits -= 1;
      this.player.health = Math.min(100, this.player.health + 50);
      sound.playPowerCellCharge();
      this.addParticles(this.player.x, this.player.y, '#10b981', 16);
      this.callbacks.onNotification('Emergency Medkit used: +50 Health', 'success');
    } else if (this.player.inventory.medkits === 0) {
      this.callbacks.onNotification('No Medkits remaining', 'warning');
    }
  }

  public deployEmpFlare() {
    if (this.player.inventory.empCharges > 0) {
      this.player.inventory.empCharges -= 1;
      sound.playEmpBlast();
      this.camera.shake = 16;

      this.decoyFlares.push({
        id: `flare-${Date.now()}`,
        x: this.player.x,
        y: this.player.y,
        life: 7.5,
        maxLife: 7.5,
        pulseRadius: 380,
      });

      // Stun all enemies within 380px
      for (const enemy of this.aiManager.enemies) {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < 380) {
          enemy.state = 'STUNNED';
          enemy.stunTimer = 6.5;
          this.addParticles(enemy.x, enemy.y, '#818cf8', 24);
        }
      }

      this.addParticles(this.player.x, this.player.y, '#818cf8', 26);
      this.callbacks.onNotification('EMP Decoy Flare deployed! All entities stunned', 'info');
    } else {
      this.callbacks.onNotification('No EMP charges remaining', 'warning');
    }
  }

  public onHidingBreathFailed() {
    if (this.player.currentHidingSpot) {
      const spot = this.player.currentHidingSpot;
      const noiseRad = 340;
      this.noiseIndicators.push({
        x: spot.x + spot.w / 2,
        y: spot.y + spot.h / 2,
        radius: 14,
        maxRadius: noiseRad,
        life: 0.85,
        maxLife: 0.85,
        color: '#ef4444',
      });
      this.callbacks.onNotification('GASP EMITTED! Entities converging on hiding spot', 'warning');
    }
  }

  public exitHiding() {
    if (this.player.isHiding) {
      sound.playLockerDoor();
      this.player.isHiding = false;
      this.player.currentHidingSpot = null;
      this.setState('PLAYING');
      this.callbacks.onNotification('Stepped out of hiding spot', 'info');
    }
  }

  public onCircuitSolved(puzzleId: string) {
    const terminal = this.terminals.find((t) => t.puzzleId === puzzleId);
    if (terminal) {
      terminal.isSolved = true;
      this.stats.circuitsSolved += 1;

      for (const door of this.doors) {
        if (door.requiresCircuitId === puzzleId) {
          door.isLocked = false;
          door.isOpen = true;
          sound.playDoorOpen();
        }
      }

      if (puzzleId === 'circuit-subreactor') {
        this.completeObjective('obj-subreactor');
        this.setCurrentObjective('obj-yellow-card');
        this.callbacks.onNotification('Sub-Reactor Online: Sector Gamma Unlocked!', 'success');
      } else if (puzzleId === 'circuit-security') {
        this.completeObjective('obj-yellow-card');
        this.setCurrentObjective('obj-master-card');
        this.callbacks.onNotification('Lockdown Overridden: Bio-Abyss Sector Delta Open!', 'success');
      }
    }
    this.setState('PLAYING');
  }

  private completeObjective(id: string) {
    const obj = this.objectives.find((o) => o.id === id);
    if (obj) {
      obj.isCompleted = true;
      obj.current = false;
    }
  }

  private setCurrentObjective(id: string) {
    for (const obj of this.objectives) {
      if (obj.id === id) {
        obj.current = true;
      }
    }
  }

  private initEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private removeEventListeners() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;

    // F1 or Backslash toggles developer debug overlay
    if (e.key === 'F1' || e.key === '\\') {
      e.preventDefault();
      this.toggleDebugMode();
      return;
    }

    if (e.key === 'Escape') {
      if (this.state === 'PLAYING') {
        this.setState('PAUSED');
      } else if (this.state === 'PAUSED') {
        this.setState('PLAYING');
      } else if (this.state === 'HIDING') {
        this.exitHiding();
      } else if (this.state === 'NOTE_READING') {
        this.setState('PLAYING');
      }
    }

    if (this.state !== 'PLAYING') return;

    if (e.key.toLowerCase() === 'f') {
      this.toggleFlashlight();
    }

    if (e.key.toLowerCase() === 'e' || e.code === 'Space') {
      this.handleInteract();
    }

    if (e.key === '1' || e.key.toLowerCase() === 'q') {
      this.usePowerCell();
    }

    if (e.key === '2') {
      this.deployEmpFlare();
    }

    if (e.key === '3' || e.key.toLowerCase() === 'h') {
      this.useMedkit();
    }

    // G or 4 throws a noise distraction bolt toward mouse aim
    if (e.key.toLowerCase() === 'g' || e.key === '4') {
      this.throwDistraction(this.mouseWorld.x, this.mouseWorld.y);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private handleBlur = () => {
    this.keys = {};
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;

    this.mouseWorld.x = this.mousePos.x + this.camera.x - this.canvas.width / 2;
    this.mouseWorld.y = this.mousePos.y + this.camera.y - this.canvas.height / 2;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.state === 'PLAYING') {
      if (e.button === 0) {
        this.handleInteract();
      } else if (e.button === 2) {
        // Right click throws distraction bolt!
        e.preventDefault();
        this.throwDistraction(this.mouseWorld.x, this.mouseWorld.y);
      }
    }
  };

  private handleInteract() {
    // 1. Check Lore Note reading
    if (this.activeNoteInRange) {
      const note = this.activeNoteInRange;
      sound.playNotePickup();
      if (!this.player.inventory.collectedNotes.includes(note.id)) {
        this.player.inventory.collectedNotes.push(note.id);
        this.stats.notesRead += 1;
      }
      this.setState('NOTE_READING');
      this.callbacks.onOpenNote(note);
      return;
    }

    // 2. Check Hiding Spot interaction
    if (this.activeHidingSpotInRange && !this.player.isHiding) {
      const spot = this.activeHidingSpotInRange;
      sound.playLockerDoor();
      this.player.isHiding = true;
      this.player.currentHidingSpot = spot;
      this.setState('HIDING');
      this.callbacks.onOpenHidingMinigame(spot.name);
      return;
    }

    // 3. Check Terminal interaction
    if (this.activeTerminalInRange) {
      const term = this.activeTerminalInRange;
      if (term.type === 'airlock') {
        if (!this.player.inventory.hasRedKeycard) {
          sound.playDoorDenied();
          this.callbacks.onNotification('Restricted: Master Airlock Keycard Required', 'warning');
          return;
        }

        if (!this.isEvacuating) {
          this.isEvacuating = true;
          this.evacuationTimer = 4.0;
          sound.playKeycardPickup();
          this.callbacks.onNotification('Airlock Pressurization Initialized! Prepare for Launch', 'success');
        }
        return;
      }

      if (!term.isSolved) {
        this.setState('CIRCUIT_PUZZLE');
        this.callbacks.onOpenCircuitPuzzle(term.puzzleId);
      } else {
        this.callbacks.onNotification(`${term.name} is calibrated and operational.`, 'info');
      }
      return;
    }

    // 4. Check Door interaction
    if (this.activeDoorInRange) {
      const door = this.activeDoorInRange;
      if (door.isLocked) {
        if (door.requiredKey === 'blue' && this.player.inventory.hasBlueKeycard) {
          door.isLocked = false;
          door.isOpen = true;
          sound.playKeycardPickup();
          sound.playDoorOpen();
          this.callbacks.onNotification('Alpha Gate Unlocked with Blue Keycard', 'success');
          this.completeObjective('obj-blue-card');
          this.setCurrentObjective('obj-subreactor');
        } else if (door.requiredKey === 'yellow' && this.player.inventory.hasYellowKeycard) {
          door.isLocked = false;
          door.isOpen = true;
          sound.playKeycardPickup();
          sound.playDoorOpen();
          this.callbacks.onNotification('Bio-Specimen Gate Unlocked with Yellow Keycard', 'success');
          this.completeObjective('obj-yellow-card');
          this.setCurrentObjective('obj-master-card');
        } else if (door.requiredKey === 'red' && this.player.inventory.hasRedKeycard) {
          door.isLocked = false;
          door.isOpen = true;
          sound.playKeycardPickup();
          sound.playDoorOpen();
          this.callbacks.onNotification('Master Evacuation Airlock Unlocked with Red Keycard', 'success');
          this.completeObjective('obj-master-card');
          this.setCurrentObjective('obj-escape');
        } else if (door.requiresCircuitId) {
          sound.playDoorDenied();
          this.callbacks.onNotification('Door unpowered: Calibrate Sub-Reactor circuit relay', 'warning');
        } else {
          sound.playDoorDenied();
          const req = door.requiredKey.toUpperCase();
          this.callbacks.onNotification(`Access Denied: ${req} Keycard Required`, 'warning');
        }
      } else {
        door.isOpen = !door.isOpen;
        if (door.isOpen) sound.playDoorOpen();
      }
    }
  }

  // Main 60fps Loop
  private gameLoop = (currentTime: number) => {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.05);

    if (this.state === 'PLAYING' || this.state === 'HIDING') {
      this.update(dt);
    } else if (this.state === 'TITLE') {
      const t = performance.now() * 0.0002;
      this.camera.x = 1800 + Math.sin(t) * 750;
      this.camera.y = 1200 + Math.cos(t * 0.6) * 400;
      // In title screen, ensure gameplay audio remains silenced and AI does not hunt the player
      sound.stopAllGameplayAudio();
    }

    this.render();
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    this.stats.timeElapsed += dt;

    if (this.bloodFlashAlpha > 0) {
      this.bloodFlashAlpha = Math.max(0, this.bloodFlashAlpha - dt * 2.2);
    }
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer = Math.max(0, this.player.invulnerableTimer - dt);
    }

    // Jumpscares
    if (this.jumpscare.active) {
      this.jumpscare.timer += dt;
      this.jumpscare.alpha = Math.max(0, 1 - this.jumpscare.timer / this.jumpscare.maxTimer);
      if (this.jumpscare.timer >= this.jumpscare.maxTimer) {
        this.jumpscare.active = false;
      }
    } else if (this.state === 'PLAYING') {
      this.jumpscareCooldown -= dt;
      if (this.jumpscareCooldown <= 0) {
        this.triggerRandomJumpscare();
        this.jumpscareCooldown = 26 + Math.random() * 20;
      }
    }

    // 1. Player Movement & Battery
    if (!this.player.isHiding) {
      const moveX =
        (this.keys['d'] || this.keys['arrowright'] ? 1 : 0) -
        (this.keys['a'] || this.keys['arrowleft'] ? 1 : 0);
      const moveY =
        (this.keys['s'] || this.keys['arrowdown'] ? 1 : 0) -
        (this.keys['w'] || this.keys['arrowup'] ? 1 : 0);

      const isMoving = moveX !== 0 || moveY !== 0;
      this.player.isSprinting = !!(this.keys['shift'] && isMoving && this.player.battery > 5);
      this.player.isCrouching = !!(this.keys['c'] || this.keys['control']);

      let currentSpeed = this.player.speed; // 250
      if (this.player.isSprinting) currentSpeed = 385;
      else if (this.player.isCrouching) currentSpeed = 145;

      if (isMoving) {
        const len = Math.hypot(moveX, moveY);
        this.player.vx = (moveX / len) * currentSpeed;
        this.player.vy = (moveY / len) * currentSpeed;

        this.stepInterval += dt;
        const stepRate = this.player.isSprinting ? 0.22 : this.player.isCrouching ? 0.48 : 0.35;

        if (this.stepInterval >= stepRate) {
          this.stepInterval = 0;
          sound.playFootstep(this.player.isSprinting, this.player.isCrouching);

          const noiseRad = this.player.isSprinting ? 220 : this.player.isCrouching ? 30 : 90;
          this.noiseIndicators.push({
            x: this.player.x,
            y: this.player.y,
            radius: 10,
            maxRadius: noiseRad,
            life: 0.55,
            maxLife: 0.55,
            color: this.player.isSprinting ? '#ef4444' : '#38bdf8',
          });
        }
      } else {
        this.player.vx = 0;
        this.player.vy = 0;
      }

      // Battery drain
      let batteryDrainRate = 0;
      if (this.player.flashlightOn) batteryDrainRate += 1.0;
      if (this.player.isSprinting) batteryDrainRate += 2.4; // More generous sprint stamina

      if (batteryDrainRate > 0) {
        this.player.battery = Math.max(0, this.player.battery - batteryDrainRate * dt);
        if (this.player.battery === 0 && this.player.flashlightOn) {
          this.player.flashlightOn = false;
          sound.playFlashlightToggle();
          this.callbacks.onNotification('Flashlight battery depleted! Blackout in progress', 'warning');
        }
      }

      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;

      const angleToMouse = Math.atan2(
        this.mouseWorld.y - this.player.y,
        this.mouseWorld.x - this.player.x
      );
      this.player.angle = angleToMouse;

      // Obstacle collisions
      for (const wall of this.walls) {
        const res = resolveCircleAABB(this.player, wall);
        this.player.x = res.x;
        this.player.y = res.y;
      }

      for (const door of this.doors) {
        if (!door.isOpen || door.openProgress < 0.8) {
          const res = resolveCircleAABB(this.player, door);
          this.player.x = res.x;
          this.player.y = res.y;
        }
        const targetProg = door.isOpen ? 1 : 0;
        door.openProgress += (targetProg - door.openProgress) * Math.min(1, dt * 7);
      }

      this.player.x = Math.max(
        this.player.radius + 36,
        Math.min(WORLD_WIDTH - 36 - this.player.radius, this.player.x)
      );
      this.player.y = Math.max(
        this.player.radius + 36,
        Math.min(WORLD_HEIGHT - 36 - this.player.radius, this.player.y)
      );
    }

    // 2. Update Thrown Distraction Bolts
    for (let i = this.thrownDistractions.length - 1; i >= 0; i--) {
      const td = this.thrownDistractions[i];
      td.progress += dt * 2.8;

      td.x = td.startX + (td.targetX - td.startX) * td.progress;
      td.y = td.startY + (td.targetY - td.startY) * td.progress;

      if (td.progress >= 1) {
        td.x = td.targetX;
        td.y = td.targetY;
        sound.playDistractionImpact();

        // Emit distraction noise circle
        this.noiseIndicators.push({
          x: td.x,
          y: td.y,
          radius: 15,
          maxRadius: 280,
          life: 0.9,
          maxLife: 0.9,
          color: '#38bdf8',
        });
        this.thrownDistractions.splice(i, 1);
      }
    }

    // 3. Collectibles & Ground Items
    if (!this.player.isHiding) {
      for (const item of this.groundItems) {
        if (item.collected) continue;
        const dist = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (dist < 45) {
          item.collected = true;
          sound.playKeycardPickup();
          this.addParticles(item.x, item.y, '#38bdf8', 14);

          if (item.type === 'keycard_blue') {
            this.player.inventory.hasBlueKeycard = true;
            this.callbacks.onNotification('Acquired: Sector Alpha Keycard (Blue)', 'success');
          } else if (item.type === 'keycard_yellow') {
            this.player.inventory.hasYellowKeycard = true;
            this.callbacks.onNotification('Acquired: Security Clearance Keycard (Yellow)', 'success');
          } else if (item.type === 'keycard_red') {
            this.player.inventory.hasRedKeycard = true;
            this.callbacks.onNotification('Acquired: Master Airlock Keycard (Red)', 'success');
          } else if (item.type === 'power_cell') {
            this.player.inventory.powerCells += 1;
            this.callbacks.onNotification('Acquired: Power Cell [1 / Q to use]', 'info');
          } else if (item.type === 'emp_charge') {
            this.player.inventory.empCharges += 1;
            this.callbacks.onNotification('Acquired: EMP Decoy Charge [2 to deploy]', 'info');
          } else if (item.type === 'medkit') {
            this.player.inventory.medkits += 1;
            this.callbacks.onNotification('Acquired: Emergency Medkit [3 / H to heal]', 'info');
          } else if (item.type === 'distraction_bolt') {
            this.player.inventory.distractionBolts += 3;
            this.callbacks.onNotification('Acquired: Distraction Bolts x3 [Right-Click / G to throw]', 'info');
          }
        }
      }
    }

    // 4. Interactive Prompts Range Check
    this.activeNoteInRange = null;
    this.activeHidingSpotInRange = null;
    this.activeTerminalInRange = null;
    this.activeDoorInRange = null;

    if (!this.player.isHiding) {
      for (const note of this.loreNotes) {
        const dist = Math.hypot(note.x - this.player.x, note.y - this.player.y);
        if (dist < 55) {
          this.activeNoteInRange = note;
          break;
        }
      }

      if (!this.activeNoteInRange) {
        for (const spot of this.hidingSpots) {
          const cx = spot.x + spot.w / 2;
          const cy = spot.y + spot.h / 2;
          const dist = Math.hypot(cx - this.player.x, cy - this.player.y);
          if (dist < 65) {
            this.activeHidingSpotInRange = spot;
            break;
          }
        }
      }

      if (!this.activeNoteInRange && !this.activeHidingSpotInRange) {
        for (const term of this.terminals) {
          const dist = Math.hypot(term.x - this.player.x, term.y - this.player.y);
          if (dist < 75) {
            this.activeTerminalInRange = term;
            break;
          }
        }
      }

      if (!this.activeNoteInRange && !this.activeHidingSpotInRange && !this.activeTerminalInRange) {
        for (const door of this.doors) {
          const doorCenterX = door.x + door.w / 2;
          const doorCenterY = door.y + door.h / 2;
          const dist = Math.hypot(doorCenterX - this.player.x, doorCenterY - this.player.y);
          if (dist < 80) {
            this.activeDoorInRange = door;
            break;
          }
        }
      }
    }

    // 5. Update Decoy Flares
    for (let i = this.decoyFlares.length - 1; i >= 0; i--) {
      const flare = this.decoyFlares[i];
      flare.life -= dt;
      if (Math.random() < 0.3) {
        this.addParticles(flare.x, flare.y, '#818cf8', 2);
      }
      if (flare.life <= 0) {
        this.decoyFlares.splice(i, 1);
      }
    }

    // 6. Central AI Manager Update
    const obstacles: (Wall | Door)[] = [...this.walls, ...this.doors];
    this.aiManager.update(dt, this.player, obstacles, this.noiseIndicators);

    // Dynamic Chase Breathing in Player's Ears!
    sound.setChaseBreathing(this.player.isBeingChased);

    // Audio alarm & proximity steps
    let nearestEnemyDist = 9999;
    let nearestEnemyType = 'SENTINEL';
    for (const enemy of this.aiManager.enemies) {
      const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (d < nearestEnemyDist) {
        nearestEnemyDist = d;
        nearestEnemyType = enemy.classType;
      }
    }

    if (nearestEnemyDist < 360) {
      sound.playEnemyProximityStep(nearestEnemyDist, nearestEnemyType);
    }
    sound.setAlarmIntensity(this.player.isBeingChased);
    this.player.alertLevel = this.player.isBeingChased ? 'ALARM' : 'CALM';

    // Game Over on zero health
    if (this.player.health <= 0) {
      this.player.isBeingChased = false;
      this.player.alertLevel = 'CALM';
      sound.setGameplayActive(false);
      sound.stopAllGameplayAudio();
      sound.playGameOver();
      this.setState('GAME_OVER');
      return;
    }

    // 7. Evacuation Sequence
    if (this.isEvacuating) {
      this.evacuationTimer -= dt;
      if (Math.random() < 0.4) {
        this.addParticles(2900, 2050, '#34d399', 4);
      }
      if (this.evacuationTimer <= 0) {
        if (this.stats.timesSpotted === 0) this.stats.stealthRank = 'Ghost';
        else if (this.stats.timesSpotted <= 2) this.stats.stealthRank = 'Phantom';
        else if (this.stats.timesSpotted <= 5) this.stats.stealthRank = 'Operative';
        else this.stats.stealthRank = 'Survivor';

        this.player.isBeingChased = false;
        sound.setGameplayActive(false);
        sound.stopAllGameplayAudio();
        sound.playVictory();
        this.callbacks.onStatsUpdate(this.stats);
        this.setState('VICTORY');
        return;
      }
    }

    // 8. Particles & Noise Indicators
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.noiseIndicators.length - 1; i >= 0; i--) {
      const ni = this.noiseIndicators[i];
      ni.life -= dt;
      ni.radius += (ni.maxRadius - ni.radius) * dt * 8;
      if (ni.life <= 0) {
        this.noiseIndicators.splice(i, 1);
      }
    }

    // 9. Camera Smooth Tracking & Shake
    const targetCamX = this.player.x;
    const targetCamY = this.player.y;
    this.camera.x += (targetCamX - this.camera.x) * dt * 6;
    this.camera.y += (targetCamY - this.camera.y) * dt * 6;

    if (this.camera.shake > 0) {
      this.camera.shake = Math.max(0, this.camera.shake - dt * 25);
    }
  }

  // Trigger random psychological jumpscare
  public triggerRandomJumpscare() {
    const types: ('oculus_apparition' | 'static_distortion' | 'mimic_shriek')[] = [
      'oculus_apparition',
      'static_distortion',
      'mimic_shriek',
    ];
    this.jumpscare.type = types[Math.floor(Math.random() * types.length)];
    this.jumpscare.active = true;
    this.jumpscare.timer = 0;
    this.jumpscare.maxTimer = 0.38;
    this.jumpscare.alpha = 1;
    this.camera.shake = 16;
    sound.playJumpscareScreech();
  }

  private addParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 90 + 20;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.4 + 0.3,
        maxLife: 0.7,
        size: Math.random() * 3 + 1.5,
        color,
        alpha: 1,
      });
    }
  }

  // Multi-pass Canvas Rendering
  public render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    const shakeX = (Math.random() - 0.5) * this.camera.shake;
    const shakeY = (Math.random() - 0.5) * this.camera.shake;
    ctx.translate(w / 2 - this.camera.x + shakeX, h / 2 - this.camera.y + shakeY);

    // 1. Draw Facility Floor Grid & Details
    this.renderFloor(ctx);

    // 2. Draw Terminals & Machinery
    this.renderTerminals(ctx);

    // 3. Draw Lore Notes on Ground
    this.renderLoreNotes(ctx);

    // 4. Draw Hiding Spots
    this.renderHidingSpots(ctx);

    // 5. Draw Doors
    this.renderDoors(ctx);

    // 6. Draw Walls
    this.renderWalls(ctx);

    // 7. Draw Collectibles
    this.renderGroundItems(ctx);

    // 8. Draw Decoy Flares & Thrown Distractions
    this.renderDecoysAndDistractions(ctx);

    // 9. Central AI Manager: Vision Cones & Enemies
    const obstacles: (Wall | Door)[] = [...this.walls, ...this.doors];
    this.aiManager.render(ctx, obstacles);

    // 10. Render Player
    this.renderPlayer(ctx);

    // 11. Dynamic Darkness & Lighting Mask
    this.renderLightingMask(ctx);

    // 12. Draw Noise Indicators & Particles
    this.renderEffects(ctx);

    // 13. World Prompts
    this.renderWorldPrompts(ctx);

    ctx.restore();

    // 14. Fullscreen Damage Flash, Jumpscares, and Vignette
    this.renderOverlays(ctx, w, h);
  }

  private renderFloor(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.strokeStyle = '#070d18';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += 64) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 64) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
    }
    ctx.stroke();

    // Red hazard lines near security doors
    this.drawHazardStripes(ctx, 390, 770, 180, 24);
    this.drawHazardStripes(ctx, 1450, 770, 200, 24);
    this.drawHazardStripes(ctx, 2620, 1020, 200, 24);
    this.drawHazardStripes(ctx, 2090, 1220, 200, 24);

    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.fillText('SECTOR ALPHA // CRYO QUARANTINE', 120, 100);
    ctx.fillText('SECTOR BETA // SUB-REACTOR CORE', 1200, 100);
    ctx.fillText('SECTOR GAMMA // BIO-CONTAINMENT VAULT', 2350, 100);
    ctx.fillText('SECTOR DELTA // BIO-ABYSS CORRIDORS', 120, 1400);
    ctx.fillText('SECTOR OMEGA // AIRLOCK EVACUATION SHUTTLE', 2350, 1400);
  }

  private drawHazardStripes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#05070f';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 6;
    for (let sx = x - h; sx < x + w + h; sx += 22) {
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + h, y + h);
      ctx.lineTo(sx + h - 8, y + h);
      ctx.lineTo(sx - 8, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private renderLoreNotes(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;
    for (const note of this.loreNotes) {
      ctx.save();
      const bob = Math.sin(time + note.x) * 3;

      // Bloodstained crew data-slate / paper note
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(note.x, note.y + bob, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(note.x - 9, note.y - 12 + bob, 18, 24);

      // Blood smear on note
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(note.x - 6, note.y - 4 + bob, 8, 8);

      ctx.restore();
    }
  }

  private renderHidingSpots(ctx: CanvasRenderingContext2D) {
    for (const spot of this.hidingSpots) {
      ctx.save();

      if (spot.type === 'locker') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(spot.x, spot.y, spot.w, spot.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(spot.x, spot.y, spot.w, spot.h);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        for (let ly = spot.y + 12; ly < spot.y + spot.h - 12; ly += 7) {
          ctx.beginPath();
          ctx.moveTo(spot.x + 8, ly);
          ctx.lineTo(spot.x + spot.w - 8, ly);
          ctx.stroke();
        }
      } else if (spot.type === 'cryopod') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(spot.x, spot.y, spot.w, spot.h);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(spot.x, spot.y, spot.w, spot.h);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(spot.x + 6, spot.y + 6, spot.w - 12, spot.h - 12);
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(spot.x, spot.y, spot.w, spot.h);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(spot.x, spot.y, spot.w, spot.h);

        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(spot.x, spot.y);
        ctx.lineTo(spot.x + spot.w, spot.y + spot.h);
        ctx.moveTo(spot.x + spot.w, spot.y);
        ctx.lineTo(spot.x, spot.y + spot.h);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderWalls(ctx: CanvasRenderingContext2D) {
    for (const wall of this.walls) {
      ctx.save();

      if (wall.type === 'flesh') {
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        const pulse = Math.sin(performance.now() * 0.005 + wall.x) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wall.x + 4, wall.y + wall.h / 2);
        ctx.bezierCurveTo(
          wall.x + wall.w * 0.3,
          wall.y + 4,
          wall.x + wall.w * 0.7,
          wall.y + wall.h - 4,
          wall.x + wall.w - 4,
          wall.y + wall.h / 2
        );
        ctx.stroke();
      } else if (wall.type === 'crate') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else if (wall.type === 'generator') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      } else {
        ctx.fillStyle = '#060911';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderDoors(ctx: CanvasRenderingContext2D) {
    for (const door of this.doors) {
      ctx.save();
      const slide = door.openProgress * (door.w * 0.85);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(door.x - 4, door.y - 4, door.w + 8, door.h + 8);

      const halfW = door.w / 2;
      ctx.fillStyle = door.isLocked ? '#1e1b4b' : '#1e293b';

      ctx.fillRect(door.x - slide / 2, door.y, halfW, door.h);
      ctx.fillRect(door.x + halfW + slide / 2, door.y, halfW, door.h);

      let stripeColor = '#38bdf8';
      if (door.requiredKey === 'blue') stripeColor = '#2563eb';
      else if (door.requiredKey === 'yellow') stripeColor = '#eab308';
      else if (door.requiredKey === 'red') stripeColor = '#ef4444';

      if (door.openProgress < 0.8) {
        ctx.fillStyle = stripeColor;
        ctx.fillRect(door.x + halfW - 4, door.y + 4, 8, door.h - 8);
      }

      ctx.restore();
    }
  }

  private renderTerminals(ctx: CanvasRenderingContext2D) {
    for (const term of this.terminals) {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(term.x - 22, term.y - 16, 44, 32);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(term.x - 22, term.y - 16, 44, 32);

      const screenColor = term.isSolved ? '#10b981' : term.type === 'airlock' ? '#ef4444' : '#06b6d4';
      ctx.fillStyle = screenColor;
      ctx.fillRect(term.x - 14, term.y - 10, 28, 16);

      ctx.restore();
    }
  }

  private renderGroundItems(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;
    for (const item of this.groundItems) {
      if (item.collected) continue;
      ctx.save();
      const bob = Math.sin(time + item.x) * 3;

      if (item.type.startsWith('keycard')) {
        let cardColor = '#3b82f6';
        if (item.type === 'keycard_yellow') cardColor = '#eab308';
        if (item.type === 'keycard_red') cardColor = '#ef4444';

        ctx.fillStyle = `${cardColor}44`;
        ctx.beginPath();
        ctx.arc(item.x, item.y + bob, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cardColor;
        ctx.fillRect(item.x - 12, item.y - 8 + bob, 24, 16);
      } else if (item.type === 'power_cell') {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(item.x - 8, item.y - 12 + bob, 16, 24);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(item.x - 6, item.y - 6 + bob, 12, 12);
      } else if (item.type === 'medkit') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(item.x - 10, item.y - 8 + bob, 20, 16);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(item.x - 3, item.y - 6 + bob, 6, 12);
        ctx.fillRect(item.x - 6, item.y - 3 + bob, 12, 6);
      } else if (item.type === 'emp_charge') {
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(item.x, item.y + bob, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'distraction_bolt') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(item.x - 8, item.y - 3 + bob, 16, 6);
      }

      ctx.restore();
    }
  }

  private renderDecoysAndDistractions(ctx: CanvasRenderingContext2D) {
    // Decoy Flares
    for (const flare of this.decoyFlares) {
      ctx.save();
      const progress = 1 - flare.life / flare.maxLife;
      const pulseR = ((progress * 3) % 1) * flare.pulseRadius;
      ctx.strokeStyle = `rgba(129, 140, 248, ${1 - ((progress * 3) % 1)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(flare.x, flare.y, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#c7d2fe';
      ctx.beginPath();
      ctx.arc(flare.x, flare.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Thrown bolts flying in air
    for (const td of this.thrownDistractions) {
      ctx.save();
      const arc = Math.sin(td.progress * Math.PI) * td.arcHeight;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(td.x, td.y - arc, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    if (this.player.isHiding) return;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.angle);

    if (this.player.invulnerableTimer > 0 && Math.sin(performance.now() * 0.03) > 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.fillStyle = this.player.isCrouching ? '#1e293b' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(8, 4, 10, 5);
    if (this.player.flashlightOn && this.player.battery > 0) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(16, 3, 3, 7);
    }

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(5, 0, 6, -Math.PI / 3, Math.PI / 3);
    ctx.fill();

    ctx.restore();
  }

  private renderLightingMask(ctx: CanvasRenderingContext2D) {
    const obstacles: (Wall | Door)[] = [...this.walls, ...this.doors];

    const darknessCanvas = document.createElement('canvas');
    darknessCanvas.width = WORLD_WIDTH;
    darknessCanvas.height = WORLD_HEIGHT;
    const dCtx = darknessCanvas.getContext('2d')!;

    dCtx.fillStyle = 'rgba(2, 4, 8, 0.95)';
    dCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    dCtx.globalCompositeOperation = 'destination-out';

    // Flashlight beam
    if (!this.player.isHiding && this.player.flashlightOn && this.player.battery > 0) {
      const beamAngle = 0.88;
      const beamRange = 450;
      const rayCount = 48;
      const startAngle = this.player.angle - beamAngle / 2;
      const angleStep = beamAngle / rayCount;

      const beamPoints = [{ x: this.player.x, y: this.player.y }];
      for (let i = 0; i <= rayCount; i++) {
        const rayAngle = startAngle + i * angleStep;
        const hit = castRay(this.player, rayAngle, beamRange, obstacles);
        beamPoints.push(hit.point);
      }

      const flashGrad = dCtx.createRadialGradient(
        this.player.x,
        this.player.y,
        15,
        this.player.x,
        this.player.y,
        beamRange
      );
      flashGrad.addColorStop(0, 'rgba(0,0,0,1)');
      flashGrad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
      flashGrad.addColorStop(1, 'rgba(0,0,0,0)');

      dCtx.fillStyle = flashGrad;
      dCtx.beginPath();
      dCtx.moveTo(beamPoints[0].x, beamPoints[0].y);
      for (let i = 1; i < beamPoints.length; i++) {
        dCtx.lineTo(beamPoints[i].x, beamPoints[i].y);
      }
      dCtx.closePath();
      dCtx.fill();
    }

    // Suit ambient glow
    if (!this.player.isHiding) {
      const suitLight = dCtx.createRadialGradient(
        this.player.x,
        this.player.y,
        5,
        this.player.x,
        this.player.y,
        this.player.flashlightOn ? 90 : 55
      );
      suitLight.addColorStop(0, 'rgba(0,0,0,0.95)');
      suitLight.addColorStop(1, 'rgba(0,0,0,0)');
      dCtx.fillStyle = suitLight;
      dCtx.beginPath();
      dCtx.arc(this.player.x, this.player.y, this.player.flashlightOn ? 90 : 55, 0, Math.PI * 2);
      dCtx.fill();
    }

    // Red emergency beacons
    const strobeTime = performance.now() * 0.005;
    const strobeAlpha = Math.sin(strobeTime) * 0.5 + 0.5;
    const redBeacons = [
      { x: 1250, y: 1040 },
      { x: 1850, y: 1040 },
      { x: 2800, y: 550 },
      { x: 950, y: 1750 },
      { x: 2900, y: 2050 },
    ];
    for (const b of redBeacons) {
      const beaconGrad = dCtx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 200);
      beaconGrad.addColorStop(0, `rgba(0,0,0,${0.35 + strobeAlpha * 0.5})`);
      beaconGrad.addColorStop(1, 'rgba(0,0,0,0)');
      dCtx.fillStyle = beaconGrad;
      dCtx.beginPath();
      dCtx.arc(b.x, b.y, 200, 0, Math.PI * 2);
      dCtx.fill();
    }

    // Terminals
    for (const term of this.terminals) {
      const termLight = dCtx.createRadialGradient(term.x, term.y, 2, term.x, term.y, 90);
      termLight.addColorStop(0, 'rgba(0,0,0,0.85)');
      termLight.addColorStop(1, 'rgba(0,0,0,0)');
      dCtx.fillStyle = termLight;
      dCtx.beginPath();
      dCtx.arc(term.x, term.y, 90, 0, Math.PI * 2);
      dCtx.fill();
    }

    ctx.drawImage(darknessCanvas, 0, 0);
  }

  private renderEffects(ctx: CanvasRenderingContext2D) {
    for (const ni of this.noiseIndicators) {
      ctx.save();
      const alpha = Math.max(0, ni.life / ni.maxLife);
      ctx.strokeStyle = ni.color;
      ctx.globalAlpha = alpha * 0.7;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ni.x, ni.y, ni.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderWorldPrompts(ctx: CanvasRenderingContext2D) {
    if (this.player.isHiding) return;

    ctx.save();
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    if (this.activeNoteInRange) {
      const note = this.activeNoteInRange;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(note.x - 120, note.y - 42, 240, 24);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(note.x - 120, note.y - 42, 240, 24);

      ctx.fillStyle = '#f87171';
      ctx.fillText('[E] Read Survivor Slate', note.x, note.y - 26);
    } else if (this.activeHidingSpotInRange) {
      const spot = this.activeHidingSpotInRange;
      const cx = spot.x + spot.w / 2;
      const cy = spot.y + spot.h / 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 110, cy - 42, 220, 24);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 110, cy - 42, 220, 24);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`[E] Hide in ${spot.name}`, cx, cy - 26);
    } else if (this.activeTerminalInRange) {
      const term = this.activeTerminalInRange;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(term.x - 130, term.y - 48, 260, 26);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(term.x - 130, term.y - 48, 260, 26);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(term.prompt, term.x, term.y - 31);
    } else if (this.activeDoorInRange) {
      const door = this.activeDoorInRange;
      const cx = door.x + door.w / 2;
      const cy = door.y + door.h / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 110, cy - 42, 220, 24);
      ctx.strokeStyle = door.isLocked ? '#ef4444' : '#10b981';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 110, cy - 42, 220, 24);

      ctx.fillStyle = door.isLocked ? '#f87171' : '#34d399';
      const promptText = door.isLocked
        ? `[E] Unlock ${door.name}`
        : door.isOpen
        ? `[E] Close ${door.name}`
        : `[E] Open ${door.name}`;
      ctx.fillText(promptText, cx, cy - 26);
    }

    ctx.restore();
  }

  private renderOverlays(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();

    // Damage Blood Vignette
    if (this.bloodFlashAlpha > 0.01) {
      const bloodGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
      bloodGrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
      bloodGrad.addColorStop(1, `rgba(220, 38, 38, ${this.bloodFlashAlpha * 0.85})`);
      ctx.fillStyle = bloodGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Jumpscares
    if (this.jumpscare.active && this.jumpscare.alpha > 0.05) {
      ctx.fillStyle = `rgba(185, 28, 28, ${this.jumpscare.alpha * 0.4})`;
      ctx.fillRect(0, 0, w, h);

      if (this.jumpscare.type === 'oculus_apparition') {
        ctx.fillStyle = `rgba(254, 226, 226, ${this.jumpscare.alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 110, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(220, 38, 38, ${this.jumpscare.alpha})`;
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, 18, 90, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.jumpscare.type === 'mimic_shriek') {
        // Skeletal teeth flash
        ctx.fillStyle = `rgba(255, 255, 255, ${this.jumpscare.alpha * 0.9})`;
        for (let i = 0; i < 12; i++) {
          ctx.fillRect(w / 2 - 120 + i * 20, h / 2 - 40, 14, 80);
        }
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${this.jumpscare.alpha * 0.6})`;
      ctx.fillRect(0, Math.random() * h, w, 14);
    }

    // Vignette
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.4,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // CRT Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }

    ctx.restore();
  }
}
