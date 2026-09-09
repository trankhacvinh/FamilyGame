/**
 * AudioManager dùng Web Audio API cho các âm hiệu ứng đơn giản.
 * Khi cần âm thanh phức tạp, có thể registerSample(name, url) để thay bằng file thật.
 *
 * iOS/iPadOS có thể suspend/interrupted AudioContext khi Safari bị đưa xuống background,
 * khóa màn hình hoặc có cuộc gọi. Manager luôn cố resume lại trong user gesture/foreground.
 */
export class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = localStorage.getItem('familygame-audio') !== 'off';
    this.samples = new Map();
    this.disposed = false;
    this.unlocked = false;
  }

  getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  async resumeContext() {
    if (!this.context || !this.enabled || this.disposed) return this.context;

    // Safari có thêm state `interrupted`; resume() cũng là cách khôi phục state này.
    if (this.context.state === 'suspended' || this.context.state === 'interrupted') {
      try {
        await this.context.resume();
      } catch {
        // iOS có thể từ chối resume nếu chưa nằm trong user gesture.
        // Lần pointerdown tiếp theo sẽ gọi unlockFromUserGesture() để thử lại.
      }
    }

    if (this.context.state === 'running') this.unlocked = true;
    return this.context;
  }

  async ensureContext() {
    if (!this.enabled || this.disposed) return null;

    if (!this.context) {
      const AudioContextClass = this.getAudioContextClass();
      if (!AudioContextClass) return null;

      try {
        this.context = new AudioContextClass();
      } catch {
        return null;
      }
    }

    await this.resumeContext();
    return this.context;
  }

  /**
   * Được gọi trực tiếp từ pointer/touch gesture của GameApp.
   * Tạo/resume context sớm để các âm phát sau animation/timer vẫn có quyền phát trên iOS.
   */
  async unlockFromUserGesture() {
    if (!this.enabled || this.disposed) return false;
    const context = await this.ensureContext();
    if (!context) return false;

    // Một buffer im lặng rất ngắn giúp một số phiên bản Safari thực sự "unlock" output.
    if (context.state === 'running' && !this.unlocked) {
      try {
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        this.unlocked = true;
      } catch {
        // Không ảnh hưởng gameplay; các tone sau vẫn tiếp tục thử phát bình thường.
      }
    }

    return context.state === 'running';
  }

  async handleForeground() {
    if (!this.enabled || this.disposed || !this.context) return;
    await this.resumeContext();
  }

  handleBackground() {
    // Không chủ động suspend: Safari tự quản lý lifecycle và explicit suspend có thể khiến
    // việc resume sau khi quay lại app khó hơn trên một số phiên bản iOS.
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    localStorage.setItem('familygame-audio', this.enabled ? 'on' : 'off');

    if (!this.enabled && this.context?.state === 'running') {
      this.context.suspend().catch?.(() => {});
      this.unlocked = false;
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
    if (!context || context.state !== 'running') return;

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
    if (!context || context.state !== 'running') return;

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
    this.disposed = true;
    this.samples.clear();
    const context = this.context;
    this.context = null;
    this.unlocked = false;
    if (context && context.state !== 'closed') {
      context.close().catch?.(() => {});
    }
  }
}
