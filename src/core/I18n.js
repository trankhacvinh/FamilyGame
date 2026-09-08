import { LANGUAGE } from './constants.js';

const DICTIONARY = {
  vi: {
    appTitle: 'THẾ GIỚI TRÒ CHƠI CHO BÉ ✨',
    appSubtitle: 'Chạm vào một trò chơi và cùng khám phá nhé!',
    backToMenu: '⬅️ Quay lại Menu',
    soundOn: '🔊 Âm thanh',
    soundOff: '🔇 Tắt tiếng',
    read: 'Đọc',
    readOn: 'Đọc tên khi chạm: bật',
    readOff: 'Đọc tên khi chạm: tắt',
    readUnavailable: 'Thiết bị không hỗ trợ đọc giọng nói',
    language: 'Ngôn ngữ',
    shapesTitle: 'Thả Khối Vào Lỗ 🪵',
    shapesDescription: 'Nhận biết hình dạng và màu sắc',
    shapeCountLabel: 'Số khối',
    spaceTitle: 'Khám Phá Hệ Mặt Trời 🪐',
    spaceDescription: 'Làm quen với các hành tinh',
    greatJob: 'BÉ GIỎI QUÁ! 🎉',
    circle: 'Hình Tròn',
    square: 'Hình Vuông',
    triangle: 'Hình Tam Giác',
    rectangle: 'Hình Chữ Nhật',
    star: 'Ngôi Sao',
    hexagon: 'Hình Lục Giác',
    mercury: 'Sao Thủy',
    venus: 'Sao Kim',
    earth: 'Trái Đất',
    mars: 'Sao Hỏa',
    jupiter: 'Sao Mộc',
    saturn: 'Sao Thổ',
    uranus: 'Sao Thiên Vương',
    neptune: 'Sao Hải Vương',
    sun: 'Mặt Trời',
    comet: 'Sao Chổi',
    asteroid: 'Thiên Thạch',
    loading: 'Đang mở trò chơi...',
  },
  en: {
    appTitle: 'MY LITTLE GAME WORLD ✨',
    appSubtitle: 'Tap a game and let’s explore together!',
    backToMenu: '⬅️ Back to Menu',
    soundOn: '🔊 Sound',
    soundOff: '🔇 Muted',
    read: 'Read',
    readOn: 'Read names on tap: on',
    readOff: 'Read names on tap: off',
    readUnavailable: 'Speech is not supported on this device',
    language: 'Language',
    shapesTitle: 'Shape Sorter 🪵',
    shapesDescription: 'Learn shapes and colors',
    shapeCountLabel: 'Blocks',
    spaceTitle: 'Explore the Solar System 🪐',
    spaceDescription: 'Meet the planets',
    greatJob: 'GREAT JOB! 🎉',
    circle: 'Circle',
    square: 'Square',
    triangle: 'Triangle',
    rectangle: 'Rectangle',
    star: 'Star',
    hexagon: 'Hexagon',
    mercury: 'Mercury',
    venus: 'Venus',
    earth: 'Earth',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    sun: 'Sun',
    comet: 'Comet',
    asteroid: 'Asteroid',
    loading: 'Opening game...',
  },
};

export class I18n {
  constructor() {
    const stored = localStorage.getItem('familygame-language');
    this.language = stored === LANGUAGE.EN ? LANGUAGE.EN : LANGUAGE.VI;
    this.listeners = new Set();
    document.documentElement.lang = this.language;
  }

  t(key) {
    return DICTIONARY[this.language]?.[key] ?? DICTIONARY.vi[key] ?? key;
  }

  setLanguage(language) {
    if (!DICTIONARY[language] || language === this.language) return;
    this.language = language;
    localStorage.setItem('familygame-language', language);
    document.documentElement.lang = language;
    this.listeners.forEach((listener) => listener(language));
  }

  toggle() {
    this.setLanguage(this.language === LANGUAGE.VI ? LANGUAGE.EN : LANGUAGE.VI);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
