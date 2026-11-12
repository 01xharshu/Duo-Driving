/**
 * Procedural Web Audio API Synthesizer for Vehicle & Duolingo Tactile UI SFX
 */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private driftFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;

  private lastCrashTime = 0;

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.value = 52;
    this.engineOsc2.frequency.value = 104;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;
    this.engineFilter.Q.value = 3.2;

    this.engineGain.gain.value = 0.04;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1350;
    this.driftFilter.Q.value = 9.5;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    noiseSource.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.ctx.destination);
    noiseSource.start();
  }

  public updateVehicleAudio(speed: number, throttle: number, driftIntensity: number): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain || !this.driftGain || !this.driftFilter) {
      return;
    }

    const now = this.ctx.currentTime;
    if (this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      this.driftGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const speedRatio = Math.min(1, speed / 52);
    const gear = Math.min(5, Math.floor(speedRatio * 5) + 1);
    const gearLocalRpm = ((speedRatio * 5) % 1) * 0.72 + 0.28;
    const baseFreq = 46 + gearLocalRpm * 92 + throttle * 24 + gear * 4;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(160 + speedRatio * 520 + throttle * 260, now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.045 + speedRatio * 0.07 + throttle * 0.035, now, 0.05);

    const activeDrift = driftIntensity > 0.22 && speed > 5 ? Math.min(1, (driftIntensity - 0.22) * 1.35) : 0;
    this.driftFilter.frequency.setTargetAtTime(1180 + activeDrift * 460 + speedRatio * 220, now, 0.05);
    this.driftGain.gain.setTargetAtTime(activeDrift * 0.14, now, 0.04);
  }

  public playCrash(impulse: number): void {
    if (!this.ctx || this.muted || impulse < 1.5) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCrashTime < 0.14) return;
    this.lastCrashTime = now;

    const intensity = Math.min(1, impulse / 32);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115 + intensity * 40, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.26);

    subGain.gain.setValueAtTime(0.32 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.29);

    const len = Math.floor(this.ctx.sampleRate * 0.22);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 680;
    filter.Q.value = 1.4;

    const crunchGain = this.ctx.createGain();
    crunchGain.gain.setValueAtTime(0.28 * intensity, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(crunchGain);
    crunchGain.connect(this.ctx.destination);
    noise.start(now);
  }

  public playUiClick(pitchMultiplier = 1): void {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(760 * pitchMultiplier, now + 0.065);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  public isMuted(): boolean {
    return this.muted;
  }
}

export const soundEngine = new SoundEngine();
