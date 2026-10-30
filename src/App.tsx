/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, Player, Objective, GameStats, HidingSpot, Door, Terminal, LoreNote } from './game/types';
import { EnemyBase } from './game/ai/EnemyBase';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { CircuitPuzzleModal } from './components/CircuitPuzzleModal';
import { HidingMinigame } from './components/HidingMinigame';
import { NoteModal } from './components/NoteModal';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { NotificationToast, NotificationItem } from './components/NotificationToast';
import { sound } from './game/audio';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [activePuzzleId, setActivePuzzleId] = useState<string | null>(null);
  const [activeHidingSpotName, setActiveHidingSpotName] = useState<string>('Locker');
  const [activeNote, setActiveNote] = useState<LoreNote | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Synced state for HUD & Radar
  const [playerHud, setPlayerHud] = useState<Player | null>(null);
  const [currentObjective, setCurrentObjective] = useState<Objective | undefined>(undefined);
  const [enemies, setEnemies] = useState<EnemyBase[]>([]);
  const [hidingSpots, setHidingSpots] = useState<HidingSpot[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [facilitySuspicion, setFacilitySuspicion] = useState<number>(0);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    timeElapsed: 0,
    timesSpotted: 0,
    damageTaken: 0,
    circuitsSolved: 0,
    powerCellsUsed: 0,
    notesRead: 0,
    stealthRank: 'Ghost',
  });

  const showNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, []);

  // Initialize Canvas & Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const engine = new GameEngine(canvas, {
      onStateChange: (newState) => {
        setGameState(newState);
      },
      onOpenCircuitPuzzle: (puzzleId) => {
        setActivePuzzleId(puzzleId);
      },
      onOpenHidingMinigame: (spotName) => {
        setActiveHidingSpotName(spotName);
      },
      onOpenNote: (note) => {
        setActiveNote(note);
      },
      onNotification: (msg, type) => {
        showNotification(msg, type);
      },
      onStatsUpdate: (stats) => {
        setGameStats(stats);
      },
    });

    engineRef.current = engine;
    engine.start();

    // 10Hz ticker to sync player stats & radar data to React HUD
    const hudInterval = setInterval(() => {
      if (engineRef.current && engineRef.current.player) {
        setPlayerHud({ ...engineRef.current.player });
        const curObj = engineRef.current.objectives.find((o) => o.current);
        setCurrentObjective(curObj);
        setEnemies([...engineRef.current.aiManager.enemies]);
        setHidingSpots([...engineRef.current.hidingSpots]);
        setDoors([...engineRef.current.doors]);
        setTerminals([...engineRef.current.terminals]);
        setFacilitySuspicion(engineRef.current.aiManager.facilitySuspicion);
        setDebugMode(engineRef.current.aiManager.debugMode);
        setGameStats({ ...engineRef.current.stats });
      }
    }, 100);

    return () => {
      clearInterval(hudInterval);
      window.removeEventListener('resize', resizeCanvas);
      engine.destroy();
    };
  }, [showNotification]);

  // Actions
  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.initMap();
      engineRef.current.setState('PLAYING');
    }
  };

  const handleResumeGame = () => {
    if (engineRef.current) {
      engineRef.current.setState('PLAYING');
    }
  };

  const handleRestartLevel = () => {
    sound.setGameplayActive(false);
    sound.stopAllGameplayAudio();
    if (engineRef.current) {
      engineRef.current.initMap();
      engineRef.current.setState('PLAYING');
      showNotification('Facility Infiltration Reset', 'info');
    }
  };

  const handleExitToTitle = () => {
    sound.setGameplayActive(false);
    sound.stopAllGameplayAudio();
    if (engineRef.current) {
      engineRef.current.initMap();
      engineRef.current.setState('TITLE');
    }
  };

  const handleSolveCircuit = () => {
    if (engineRef.current && activePuzzleId) {
      engineRef.current.onCircuitSolved(activePuzzleId);
      setActivePuzzleId(null);
    }
  };

  const handleCloseCircuit = () => {
    setActivePuzzleId(null);
    if (engineRef.current) {
      engineRef.current.setState('PLAYING');
    }
  };

  const handleToggleFlashlight = () => {
    if (engineRef.current) {
      engineRef.current.toggleFlashlight();
    }
  };

  const handleUsePowerCell = () => {
    if (engineRef.current) {
      engineRef.current.usePowerCell();
    }
  };

  const handleUseMedkit = () => {
    if (engineRef.current) {
      engineRef.current.useMedkit();
    }
  };

  const handleDeployEmp = () => {
    if (engineRef.current) {
      engineRef.current.deployEmpFlare();
    }
  };

  const handleThrowDistraction = () => {
    if (engineRef.current) {
      // Throw in direction player is looking
      const throwDist = 180;
      const tx = engineRef.current.player.x + Math.cos(engineRef.current.player.angle) * throwDist;
      const ty = engineRef.current.player.y + Math.sin(engineRef.current.player.angle) * throwDist;
      engineRef.current.throwDistraction(tx, ty);
    }
  };

  const handleToggleDebug = () => {
    if (engineRef.current) {
      engineRef.current.toggleDebugMode();
    }
  };

  const handleFailHidingBreath = () => {
    if (engineRef.current) {
      engineRef.current.onHidingBreathFailed();
    }
  };

  const handleExitHiding = () => {
    if (engineRef.current) {
      engineRef.current.exitHiding();
    }
  };

  const handleCloseNote = () => {
    setActiveNote(null);
    if (engineRef.current) {
      engineRef.current.setState('PLAYING');
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.setState('PAUSED');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    sound.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    showNotification(muted ? 'Synthesizer Audio Muted' : 'Synthesizer Audio Active', 'info');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 select-none">
      {/* 60fps Native Hardware Accelerated Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'CIRCUIT_PUZZLE') && playerHud && (
        <GameHUD
          player={playerHud}
          currentObjective={currentObjective}
          enemies={enemies}
          hidingSpots={hidingSpots}
          doors={doors}
          terminals={terminals}
          facilitySuspicion={facilitySuspicion}
          debugMode={debugMode}
          onToggleFlashlight={handleToggleFlashlight}
          onUsePowerCell={handleUsePowerCell}
          onUseMedkit={handleUseMedkit}
          onDeployEmp={handleDeployEmp}
          onThrowDistraction={handleThrowDistraction}
          onToggleDebug={handleToggleDebug}
          onPause={handlePause}
        />
      )}

      {/* Interactive Circuit Minigame Modal */}
      {gameState === 'CIRCUIT_PUZZLE' && activePuzzleId && playerHud && (
        <CircuitPuzzleModal
          puzzleId={activePuzzleId}
          hasEmpCharge={playerHud.inventory.empCharges > 0}
          onSolve={handleSolveCircuit}
          onClose={handleCloseCircuit}
        />
      )}

      {/* Keep Quiet Hiding Minigame Overlay */}
      {gameState === 'HIDING' && (
        <HidingMinigame
          hidingSpotName={activeHidingSpotName}
          onFailBreath={handleFailHidingBreath}
          onExitHiding={handleExitHiding}
        />
      )}

      {/* Survivor Lore Note Modal */}
      {gameState === 'NOTE_READING' && activeNote && (
        <NoteModal note={activeNote} onClose={handleCloseNote} />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <PauseMenu
          onResume={handleResumeGame}
          onRestart={handleRestartLevel}
          onExitToTitle={handleExitToTitle}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game-Over Screen Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          stats={gameStats}
          onRestart={handleRestartLevel}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* Victory Screen Modal */}
      {gameState === 'VICTORY' && (
        <VictoryModal
          stats={gameStats}
          onRestart={handleRestartLevel}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* Floating Tactical Notification Toasts */}
      <NotificationToast notifications={notifications} />
    </div>
  );
}
