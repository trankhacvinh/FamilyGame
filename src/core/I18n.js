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
    info: 'Thông tin',
    infoOn: 'Hiện thông tin khi chạm: bật',
    infoOff: 'Hiện thông tin khi chạm: tắt',
    closeInfo: 'Đóng thông tin',
    funFacts: 'Điều thú vị',
    language: 'Ngôn ngữ',
    shapesTitle: 'Thả Khối Vào Lỗ 🪵',
    shapesDescription: 'Nhận biết hình dạng và màu sắc',
    shapeCountLabel: 'Số khối',
    spaceTitle: 'Khám Phá Hệ Mặt Trời 🪐',
    spaceDescription: 'Làm quen với các hành tinh',
    archaeologyTitle: 'Khảo Cổ Học Nhí - Đập Đá Tìm Bí Mật 🪨',
    archaeologyDescription: 'Đập đá, khám phá đồ chơi và chọn đáp án đúng',
    archNew: '🎲 Mới',
    archQuestion: 'BÊN TRONG LÀ GÌ NHỈ?',
    archHitRock: '🔨 Đập đá',
    archChoose: 'Chọn đáp án nhé!',
    archSolved: 'Đã khám phá xong! Bấm Mới để chơi tiếp.',
    archCorrect: 'CHÍNH XÁC! Đây là',
    archWrong: 'Tèèè! Chưa đúng rồi, thử lại nhé!',
    fruitCatchTitle: 'Hứng Trái Cây Vui Nhộn 🍎',
    fruitCatchDescription: 'Kéo giỏ hứng trái cây, tránh con sâu và giữ đủ trái tim',
    fruitScore: 'Điểm',
    fruitSpeed: 'Tốc độ',
    fruitNewGame: '🔄 Chơi mới',
    fruitGameOver: 'HẾT TIM!',
    fruitFinalScore: 'Tổng điểm',
    fruitHeartBack: 'Hồi lại 1 tim!',
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
    dinosaur: 'Khủng Long',
    goldenEgg: 'Trứng Vàng',
    rabbit: 'Con Thỏ',
    cat: 'Con Mèo',
    fish: 'Con Cá',
    turtle: 'Con Rùa',
    apple: 'Quả Táo',
    banana: 'Quả Chuối',
    strawberry: 'Quả Dâu Tây',
    worm: 'Con Sâu',
    grape: 'Chùm Nho',
    orange: 'Quả Cam',
    car: 'Xe Ô Tô',
    ball: 'Quả Bóng',
    starToy: 'Ngôi Sao',
    duck: 'Con Vịt',
    bear: 'Con Gấu',
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
    info: 'Info',
    infoOn: 'Show information on tap: on',
    infoOff: 'Show information on tap: off',
    closeInfo: 'Close information',
    funFacts: 'Fun facts',
    language: 'Language',
    shapesTitle: 'Shape Sorter 🪵',
    shapesDescription: 'Learn shapes and colors',
    shapeCountLabel: 'Blocks',
    spaceTitle: 'Explore the Solar System 🪐',
    spaceDescription: 'Meet the planets',
    archaeologyTitle: 'Little Archaeologist - Break the Rock 🪨',
    archaeologyDescription: 'Break the rock, discover a toy, and choose the right answer',
    archNew: '🎲 New',
    archQuestion: 'WHAT IS INSIDE?',
    archHitRock: '🔨 Rock hits',
    archChoose: 'Choose the right answer!',
    archSolved: 'Discovery complete! Tap New to play again.',
    archCorrect: 'CORRECT! It is a',
    archWrong: 'Teeeh! Not quite. Try again!',
    fruitCatchTitle: 'Fruit Catcher 🍎',
    fruitCatchDescription: 'Move the basket, catch fruit, avoid worms, and protect your hearts',
    fruitScore: 'Score',
    fruitSpeed: 'Speed',
    fruitNewGame: '🔄 New Game',
    fruitGameOver: 'GAME OVER',
    fruitFinalScore: 'Final score',
    fruitHeartBack: 'One heart restored!',
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
    dinosaur: 'Dinosaur',
    goldenEgg: 'Golden Egg',
    rabbit: 'Rabbit',
    cat: 'Cat',
    fish: 'Fish',
    turtle: 'Turtle',
    apple: 'Apple',
    banana: 'Banana',
    strawberry: 'Strawberry',
    worm: 'Worm',
    grape: 'Grapes',
    orange: 'Orange',
    car: 'Car',
    ball: 'Ball',
    starToy: 'Star',
    duck: 'Duck',
    bear: 'Bear',
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
