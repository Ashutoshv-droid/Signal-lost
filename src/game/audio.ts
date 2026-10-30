/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sirenGain: GainNode | null = null;
  private chaseBreathGain: GainNode | null = null;
  private glitchGain: GainNode | null = null;

  private ambientOsc: OscillatorNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private chaseBreathOsc: OscillatorNode | null = null;
  private glitchNoiseNode: AudioBufferSourceNode | null = null;

  private volume: number = 0.7;
  private isMuted: boolean = false;
  private initialized: boolean = false;
  private lastEnemyStepTime: number = 0;
  private isBreathing: boolean = false;
  private isGameplayActive: boolean = false;

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbient();
      this.startChaseBreathingSynth();
      this.initialized = true;
    } catch {
      // AudioContext waiting for gesture
    }
  }

  public resume() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setGameplayActive(active: boolean) {
    this.isGameplayActive = active;
    if (!active) {
      this.stopAllGameplayAudio();
      if (this.ambientGain && this.ctx) {
        try {
          this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.ambientGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        } catch {
          this.ambientGain.gain.value = 0.02;
        }
      }
    } else {
      if (this.ambientGain && this.ctx) {
        try {
          this.ambientGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.ambientGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        } catch {
          this.ambientGain.gain.value = 0.06;
        }
      }
    }
  }

  public stopAllGameplayAudio() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Immediately silence emergency alarm siren
    if (this.sirenGain) {
      try {
        this.sirenGain.gain.cancelScheduledValues(now);
        this.sirenGain.gain.setValueAtTime(0, now);
      } catch {
        this.sirenGain.gain.value = 0;
      }
    }

    // Immediately silence frantic panting / breathing
    if (this.chaseBreathGain) {
      try {
        this.chaseBreathGain.gain.cancelScheduledValues(now);
        this.chaseBreathGain.gain.setValueAtTime(0, now);
      } catch {
        this.chaseBreathGain.gain.value = 0;
      }
    }
    this.isBreathing = false;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  private startAmbient() {
    if (!this.ctx || !this.masterGain) return;

    // Atmospheric subtle facility background drone
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(95, this.ctx.currentTime);

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientOsc.type = 'sawtooth';
    this.ambientOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(38, this.ctx.currentTime);

    this.ambientOsc.connect(filter);
    subOsc.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientOsc.start();
    subOsc.start();

    // Emergency alarm node
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.setValueAtTime(440, this.ctx.currentTime);

    const sirenFilter = this.ctx.createBiquadFilter();
    sirenFilter.type = 'bandpass';
    sirenFilter.frequency.setValueAtTime(750, this.ctx.currentTime);
    sirenFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.sirenOsc.connect(sirenFilter);
    sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();
  }

  // Player heavy panting / gasping in ears during chases
  private startChaseBreathingSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.chaseBreathGain = this.ctx.createGain();
    this.chaseBreathGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Modulated noise filter simulating frantic breathing
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const breathFilter = this.ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    breathFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    whiteNoise.connect(breathFilter);
    breathFilter.connect(this.chaseBreathGain);
    this.chaseBreathGain.connect(this.masterGain);

    try {
      whiteNoise.start();
    } catch {
      // Ignored
    }
  }

  public setChaseBreathing(active: boolean) {
    if (!this.ctx || !this.chaseBreathGain) return;
    const now = this.ctx.currentTime;
    if (active && this.isGameplayActive) {
      if (!this.isBreathing) {
        this.isBreathing = true;
        this.chaseBreathGain.gain.setTargetAtTime(0.18, now, 0.2);
      }
    } else {
      this.isBreathing = false;
      try {
        this.chaseBreathGain.gain.cancelScheduledValues(now);
        this.chaseBreathGain.gain.setValueAtTime(0, now);
      } catch {
        this.chaseBreathGain.gain.value = 0;
      }
    }
  }

  public setAlarmIntensity(inPursuit: boolean) {
    if (!this.ctx || !this.sirenGain || !this.sirenOsc) return;
    const now = this.ctx.currentTime;
    if (inPursuit && this.isGameplayActive) {
      this.sirenGain.gain.setTargetAtTime(0.15, now, 0.08);
      const freq = (Math.sin(now * 8) * 0.5 + 0.5) * 360 + 440;
      this.sirenOsc.frequency.setValueAtTime(freq, now);
    } else {
      try {
        this.sirenGain.gain.cancelScheduledValues(now);
        this.sirenGain.gain.setValueAtTime(0, now);
      } catch {
        this.sirenGain.gain.value = 0;
      }
    }
  }

  // Monster piercing screams & alert screeches
  public playEnemyScreech(type: string) {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(type === 'WATCHER' ? 600 : 400, now);

    if (type === 'WATCHER') {
      // Piercing high-pitched bio-siren screech that calls others
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(700, now + 0.65);
      osc2.frequency.setValueAtTime(1750, now);
      osc2.frequency.exponentialRampToValueAtTime(850, now + 0.65);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    } else if (type === 'MIMIC') {
      // Visceral bone-cracking screech
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(350, now);
      osc1.frequency.linearRampToValueAtTime(1600, now + 0.25);
      osc1.frequency.exponentialRampToValueAtTime(200, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    } else if (type === 'CRAWLER') {
      // Rapid chittering hiss
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(900, now);
      osc1.frequency.exponentialRampToValueAtTime(250, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    } else {
      // Sentinel / Warden war horn
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.linearRampToValueAtTime(680, now + 0.3);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    }

    osc1.connect(filter);
    if (type === 'WATCHER') osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    if (type === 'WATCHER') osc2.start(now);
    osc1.stop(now + 0.7);
    if (type === 'WATCHER') osc2.stop(now + 0.7);
  }

  // Mimic eerie whispered radio lure
  public playMimicWhisper() {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(5, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.4);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Crawler vent scratching noise
  public playVentScratch() {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Glitch static audio interference
  public playGlitchInterference() {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.setValueAtTime(1200, now + 0.05);
    osc.frequency.setValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Thrown distraction bolt impact
  public playDistractionImpact() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [750, 420, 220].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(60, now + idx * 0.04 + 0.15);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.16);
    });
  }

  // Lore note pickup & page turn
  public playNotePickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Proximity enemy footsteps
  public playEnemyProximityStep(distance: number, enemyType: string) {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = performance.now();
    const interval = enemyType === 'CRAWLER' ? 180 : enemyType === 'WARDEN' ? 520 : 340;

    if (now - this.lastEnemyStepTime < interval) return;
    this.lastEnemyStepTime = now;

    const factor = Math.max(0, 1 - distance / 360);
    if (factor <= 0.02) return;

    const audioNow = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (enemyType === 'CRAWLER') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, audioNow);
      osc.type = 'square';
      osc.frequency.setValueAtTime(140 + Math.random() * 80, audioNow);
      osc.frequency.exponentialRampToValueAtTime(30, audioNow + 0.04);
      gain.gain.setValueAtTime(0.14 * factor, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.05);
    } else if (enemyType === 'WATCHER') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, audioNow);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, audioNow);
      osc.frequency.linearRampToValueAtTime(220, audioNow + 0.06);
      gain.gain.setValueAtTime(0.15 * factor, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.09);
    } else if (enemyType === 'WARDEN') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, audioNow);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, audioNow);
      osc.frequency.exponentialRampToValueAtTime(20, audioNow + 0.12);
      gain.gain.setValueAtTime(0.22 * factor, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.14);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, audioNow);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(75, audioNow);
      osc.frequency.exponentialRampToValueAtTime(25, audioNow + 0.08);
      gain.gain.setValueAtTime(0.14 * factor, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.1);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(audioNow);
    osc.stop(audioNow + 0.14);
  }

  public playPlayerHitSmack() {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.22);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playJumpscareScreech() {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [1250, 1680].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.45);

      gain.gain.setValueAtTime(0.28, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.48);
    });
  }

  public playHeartbeat(panic: boolean) {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(panic ? 95 : 65, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(panic ? 0.28 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playLockerDoor() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playFootstep(isSprinting: boolean, isCrouching: boolean) {
    if (!this.isGameplayActive || !this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCrouching ? 220 : isSprinting ? 640 : 400, now);

    const baseFreq = isCrouching ? 65 : isSprinting ? 100 : 85;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq + (Math.random() * 15 - 7), now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const vol = isCrouching ? 0.03 : isSprinting ? 0.16 : 0.08;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isSprinting ? 0.12 : 0.09));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playFlashlightToggle() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playKeycardPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [587.33, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  public playDoorOpen() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.3);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playDoorDenied() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [180, 160].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.1, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.12);
    });
  }

  public playPowerCellCharge() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCircuitRotate() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCircuitSolved() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.12, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.5);
    });
  }

  public playEmpBlast() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playGameOver() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    [220, 196, 174, 130].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0.18, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.6);
    });
  }

  public playVictory() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const chord = [392.0, 523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.15, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.8);
    });
  }
}

export const sound = new SoundSystem();
