/**
 * Web Audio API Sound Synthesizer
 * Zero external audio dependencies - 100% procedurally synthesized
 * authentic mechanical click, wheel whoosh, haptic button thud, and victory fanfare.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('spin_wheel_muted') === 'true';
    this.lastTickTime = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('spin_wheel_muted', this.muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Realistic mechanical peg click/flapper sound
  playTick(pitchModifier = 1.0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Throttle extreme frequencies
    if (now - this.lastTickTime < 0.015) return;
    this.lastTickTime = now;

    // Transient click burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    // Dynamic pitch: rises when spinning fast, drops when slow
    const baseFreq = 420 * Math.max(0.6, Math.min(pitchModifier, 2.0));
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitchModifier, now);
    filter.Q.setValueAtTime(3.5, now);

    // Sharp percussive envelope
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);

    // Subtle noise slap for tactile click
    this.playNoiseClick(now, pitchModifier);
  }

  playNoiseClick(now, pitchModifier) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.018);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800 * Math.min(pitchModifier, 1.8), now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // Whoosh sound on launch
  playWhoosh() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.9);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.9);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.92);
  }

  // Tactile Glassmorphism button press sound
  playButton() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Grand celebratory victory chime & fanfare
  playWinFanfare() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, t: 0.00, d: 0.25 }, // C5
      { f: 659.25, t: 0.14, d: 0.25 }, // E5
      { f: 783.99, t: 0.28, d: 0.30 }, // G5
      { f: 1046.50, t: 0.44, d: 0.90 }, // C6
      { f: 1318.51, t: 0.58, d: 0.85 }, // E6
      { f: 1567.98, t: 0.72, d: 1.10 }  // G6
    ];

    const now = this.ctx.currentTime;

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.linearRampToValueAtTime(0.28, now + note.t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });

    // Sub bass resonance for victory feeling
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130.81, now + 0.44); // C3
    subGain.gain.setValueAtTime(0.001, now + 0.44);
    subGain.gain.linearRampToValueAtTime(0.32, now + 0.50);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now + 0.44);
    subOsc.stop(now + 1.85);
  }
}

window.soundEngine = new SoundEngine();
