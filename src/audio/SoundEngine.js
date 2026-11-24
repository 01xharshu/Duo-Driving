export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();

    this.initialized = true;
  }

  update(speedKmh, isActive, wantedLevel, timeSec, settings, isBoosting = false) {
    if (!this.initialized || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const master = settings.masterVol * settings.engineVol;
    if (!isActive) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return;
    }

    const rpmRatio = Math.min(1.15, speedKmh / 170);
    const boostPitch = isBoosting ? 34 : 0;
    const baseFreq = 46 + rpmRatio * 145 + ((rpmRatio * 4) % 1) * 28 + boostPitch;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(
      (0.04 + rpmRatio * 0.07) * master,
      this.ctx.currentTime,
      0.08
    );

    if (wantedLevel > 0) {
      const sirenFreq = 640 + Math.sin(timeSec * 6.5) * 210;
      this.sirenOsc.frequency.setTargetAtTime(sirenFreq, this.ctx.currentTime, 0.03);
      this.sirenGain.gain.setTargetAtTime(0.055 * master, this.ctx.currentTime, 0.08);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  playImpact(intensity = 1, masterVol = 0.8) {
    if (!this.initialized || !this.ctx || masterVol <= 0.01) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110 * Math.max(0.5, intensity), this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(Math.min(0.35, 0.22 * intensity) * masterVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.26);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.27);
  }
}
