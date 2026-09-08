/**
 * AudioManager dùng Web Audio API cho các âm hiệu ứng đơn giản.
 * Khi cần âm thanh phức tạp, có thể registerSample(name, url) để thay bằng file thật.
 */
export class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = localStorage.getItem('familygame-audio') !== 'off';
    this.samples = new Map();
  }

  async ensureContext() {
    if (!this.enabled) return null;

    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('familygame-audio', enabled ? 'on' : 'off');

    if (!enabled && this.context?.state === 'running') {
      this.context.suspend();
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    if (this.enabled) this.playTap();
    return this.enabled;
  }

  async playTone({
    frequency = 440,
    duration = 0.15,
    type = 'sine',
    volume = 0.08,
    endFrequency = null,
  } = {}) {
    const context = await this.ensureContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playTap() {
    return this.playTone({ frequency: 520, endFrequency: 650, duration: 0.08, volume: 0.04 });
  }

  playSuccess() {
    this.playTone({ frequency: 523.25, duration: 0.16, volume: 0.06 });
    window.setTimeout(() => {
      this.playTone({ frequency: 659.25, duration: 0.16, volume: 0.06 });
    }, 120);
    window.setTimeout(() => {
      this.playTone({ frequency: 783.99, duration: 0.22, volume: 0.07 });
    }, 240);
  }

  playPlanet() {
    return this.playTone({
      frequency: 330,
      endFrequency: 880,
      duration: 0.35,
      type: 'triangle',
      volume: 0.055,
    });
  }

  registerSample(name, url) {
    this.samples.set(name, { url, buffer: null });
  }

  async playSample(name, volume = 0.8) {
    if (!this.enabled) return;

    const sample = this.samples.get(name);
    if (!sample) return;

    const context = await this.ensureContext();
    if (!context) return;

    if (!sample.buffer) {
      const response = await fetch(sample.url);
      const arrayBuffer = await response.arrayBuffer();
      sample.buffer = await context.decodeAudioData(arrayBuffer);
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
    source.buffer = sample.buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  dispose() {
    this.samples.clear();
    this.context?.close();
    this.context = null;
  }
}
