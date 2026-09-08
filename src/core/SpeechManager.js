/**
 * SpeechManager dùng Web Speech API có sẵn trong trình duyệt để đọc tên đối tượng.
 * Trạng thái Read độc lập với âm thanh hiệu ứng và được lưu bằng localStorage.
 */
export class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis ?? null;
    this.available = Boolean(this.synth && window.SpeechSynthesisUtterance);
    this.enabled = this.available && localStorage.getItem('familygame-read') === 'on';
    this.voices = [];
    this.onVoicesChanged = this.refreshVoices.bind(this);

    if (this.available) {
      this.refreshVoices();
      this.synth.addEventListener?.('voiceschanged', this.onVoicesChanged);
    }
  }

  refreshVoices() {
    this.voices = this.synth?.getVoices?.() ?? [];
  }

  setEnabled(enabled) {
    this.enabled = this.available && Boolean(enabled);
    localStorage.setItem('familygame-read', this.enabled ? 'on' : 'off');

    if (!this.enabled) this.cancel();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  /**
   * Đọc text theo ngôn ngữ hiện tại. Tốc độ hơi chậm để bé dễ nghe và học từ.
   */
  speak(text, language) {
    if (!this.enabled || !this.available || !text) return false;

    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    const languagePrefix = locale.slice(0, 2).toLowerCase();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = language === 'vi' ? 0.86 : 0.82;
    utterance.pitch = 1.03;
    utterance.volume = 1;

    const exactVoice = this.voices.find(
      (voice) => voice.lang?.toLowerCase() === locale.toLowerCase(),
    );
    const languageVoice = this.voices.find(
      (voice) => voice.lang?.toLowerCase().startsWith(languagePrefix),
    );
    utterance.voice = exactVoice ?? languageVoice ?? null;

    // Không xếp hàng nhiều từ khi bé chạm liên tục; luôn ưu tiên từ mới nhất.
    this.synth.cancel();
    this.synth.speak(utterance);
    return true;
  }

  cancel() {
    this.synth?.cancel?.();
  }

  dispose() {
    this.cancel();
    this.synth?.removeEventListener?.('voiceschanged', this.onVoicesChanged);
    this.voices.length = 0;
  }
}
