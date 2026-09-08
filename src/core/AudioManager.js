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
    delay = 0,
  } = {}) {
    const context = await this.ensureContext();
    if (!context) return;

    const startAt = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  playTap() {
    return this.playTone({ frequency: 520, endFrequency: 650, duration: 0.08, volume: 0.04 });
  }

  playSuccess() {
    // Lập lịch trên Web Audio timeline, không tạo setTimeout rơi rớt khi đổi màn hình.
    this.playTone({ frequency: 523.25, duration: 0.16, volume: 0.06 });
    this.playTone({ frequency: 659.25, duration: 0.16, volume: 0.06, delay: 0.12 });
    this.playTone({ frequency: 783.99, duration: 0.22, volume: 0.07, delay: 0.24 });
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

  playCrack() {
    this.playTone({ frequency: 165, endFrequency: 92, duration: 0.12, type: 'square', volume: 0.045 });
    this.playTone({ frequency: 640, endFrequency: 260, duration: 0.055, type: 'triangle', volume: 0.025, delay: 0.025 });
  }

  playReveal() {
    this.playTone({ frequency: 330, endFrequency: 660, duration: 0.24, type: 'triangle', volume: 0.05 });
    this.playTone({ frequency: 660, endFrequency: 990, duration: 0.22, type: 'sine', volume: 0.04, delay: 0.13 });
  }

  playWrong() {
    return this.playTone({
      frequency: 250,
      endFrequency: 105,
      duration: 0.42,
      type: 'sawtooth',
      volume: 0.045,
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
