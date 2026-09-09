/**
 * SpeechManager dùng Web Speech API có sẵn trong trình duyệt để đọc tên/nội dung.
 * Trạng thái Read độc lập với âm thanh hiệu ứng và được lưu bằng localStorage.
 *
 * iOS/iPadOS đôi khi làm speechSynthesis mất voice cache hoặc treo sequence sau khi app
 * bị background. Vì vậy khi quay lại foreground manager sẽ cancel sequence cũ và refresh voice.
 */
export class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis ?? null;
    this.available = Boolean(this.synth && window.SpeechSynthesisUtterance);
    this.enabled = this.available && localStorage.getItem('familygame-read') === 'on';
    this.voices = [];
    this.sequenceId = 0;
    this.pauseTimer = null;
    this.voiceRefreshTimer = null;
    this.currentUtterance = null;
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

  unlockFromUserGesture() {
    if (!this.available) return;
    this.refreshVoices();
    // Safari có thể để speech synthesis ở paused state sau background/interruption.
    try {
      if (this.synth.paused) this.synth.resume();
    } catch {
      // Không có gì cần làm; speak() tiếp theo vẫn sẽ thử lại.
    }
  }

  handleBackground() {
    if (!this.available) return;
    // Không để một câu cũ phát tiếp đột ngột khi người dùng quay lại app.
    this.cancel();
  }

  handleForeground() {
    if (!this.available) return;

    this.cancel();
    this.refreshVoices();

    // iOS đôi khi repopulate voice list sau pageshow/visibilitychange một nhịp.
    window.clearTimeout(this.voiceRefreshTimer);
    this.voiceRefreshTimer = window.setTimeout(() => {
      this.refreshVoices();
      try {
        if (this.synth.paused) this.synth.resume();
      } catch {
        // Bỏ qua nếu browser không cho resume khi chưa có user gesture.
      }
    }, 180);
  }

  /**
   * Chỉ chọn voice cùng ngôn ngữ với UI. Không bao giờ gán voice English để đọc tiếng Việt
   * (hoặc ngược lại). Nếu danh sách voice chưa sẵn sàng, để browser chọn theo `lang`.
   */
  resolveVoice(language) {
    this.refreshVoices();

    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    const localeLower = locale.toLowerCase();
    const languagePrefix = localeLower.slice(0, 2);

    const exactVoices = this.voices.filter(
      (voice) => voice.lang?.toLowerCase() === localeLower,
    );
    const languageVoices = this.voices.filter(
      (voice) => voice.lang?.toLowerCase().startsWith(languagePrefix),
    );

    const candidates = exactVoices.length > 0 ? exactVoices : languageVoices;
    if (candidates.length === 0) return null;

    // Giữ voice mặc định của đúng locale nếu hệ điều hành có cấu hình voice ưu tiên.
    return candidates.find((voice) => voice.default) ?? candidates[0];
  }

  /**
   * Tách đoạn dài thành câu ngắn. Web Speech thường phát âm và ngắt nhịp tự nhiên hơn
   * khi mỗi utterance chỉ chứa một câu, đặc biệt với tiếng Việt trên mobile.
   */
  normalizeSpeechParts(content) {
    const rawParts = Array.isArray(content) ? content : [content];
    const parts = [];

    rawParts.forEach((rawPart) => {
      const text = String(rawPart ?? '').replace(/\s+/gu, ' ').trim();
      if (!text) return;

      const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/gu) ?? [text];
      sentences.forEach((sentence) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence) parts.push(cleanSentence);
      });
    });

    return parts;
  }

  createUtterance(text, language, voice, isNarration) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';

    // Tên ngắn giữ tốc độ giống bản trước. Đoạn giải thích dài chậm nhẹ hơn để rõ chữ.
    if (language === 'vi') {
      utterance.rate = isNarration ? 0.82 : 0.86;
    } else {
      utterance.rate = isNarration ? 0.8 : 0.82;
    }

    utterance.pitch = 1;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    return utterance;
  }

  /**
   * Đọc text hoặc mảng các câu theo ngôn ngữ hiện tại.
   * Mỗi lần bé chạm mới sẽ hủy sequence cũ và ưu tiên nội dung mới nhất.
   */
  speak(content, language) {
    if (!this.enabled || !this.available || !content || document.hidden) return false;

    const parts = this.normalizeSpeechParts(content);
    if (parts.length === 0) return false;

    this.cancel();
    const sequenceId = this.sequenceId;

    const start = () => {
      if (!this.enabled || sequenceId !== this.sequenceId || document.hidden) return;
      const voice = this.resolveVoice(language);
      const isNarration = parts.length > 1 || parts[0].length > 70;
      this.speakPart(parts, 0, language, voice, isNarration, sequenceId);
    };

    // Mobile Safari/Chrome đôi lúc trả [] ngay sau reload/pageshow rồi cập nhật sau đó.
    this.refreshVoices();
    if (this.voices.length === 0) {
      this.pauseTimer = window.setTimeout(start, 160);
    } else {
      start();
    }

    return true;
  }

  speakPart(parts, index, language, voice, isNarration, sequenceId) {
    if (
      !this.enabled
      || document.hidden
      || sequenceId !== this.sequenceId
      || index >= parts.length
    ) {
      return;
    }

    const utterance = this.createUtterance(parts[index], language, voice, isNarration);
    this.currentUtterance = utterance;

    const continueSequence = () => {
      if (sequenceId !== this.sequenceId || document.hidden) return;
      this.currentUtterance = null;

      if (index + 1 >= parts.length) return;

      // Một khoảng nghỉ nhỏ giúp phần mô tả/fact không bị đọc dính thành một câu dài.
      this.pauseTimer = window.setTimeout(() => {
        this.speakPart(parts, index + 1, language, voice, isNarration, sequenceId);
      }, 120);
    };

    utterance.onend = continueSequence;
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      continueSequence();
    };

    try {
      this.synth.speak(utterance);
    } catch {
      this.currentUtterance = null;
    }
  }

  cancel() {
    this.sequenceId += 1;
    window.clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    this.currentUtterance = null;
    try {
      this.synth?.cancel?.();
    } catch {
      // Safari có thể throw trong lúc page đang transition/background.
    }
  }

  dispose() {
    this.cancel();
    window.clearTimeout(this.voiceRefreshTimer);
    this.voiceRefreshTimer = null;
    this.synth?.removeEventListener?.('voiceschanged', this.onVoicesChanged);
    this.voices.length = 0;
  }
}
