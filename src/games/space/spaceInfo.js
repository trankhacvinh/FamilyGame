export const SPACE_INFO_STORAGE_KEY = 'familygame-space-info';

export const SPACE_INFO = Object.freeze({
  sun: Object.freeze({
    vi: Object.freeze({
      summary: 'Mặt Trời là ngôi sao ở trung tâm Hệ Mặt Trời. Ánh sáng và nhiệt từ Mặt Trời giúp Trái Đất ấm áp và có sự sống.',
      facts: Object.freeze([
        'Mặt Trời lớn hơn Trái Đất rất nhiều.',
        'Các hành tinh chuyển động quanh Mặt Trời nhờ lực hấp dẫn.',
      ]),
    }),
    en: Object.freeze({
      summary: 'The Sun is the star at the center of our Solar System. Its light and heat help keep Earth warm and support life.',
      facts: Object.freeze([
        'The Sun is much bigger than Earth.',
        'Gravity keeps the planets moving around the Sun.',
      ]),
    }),
  }),
  mercury: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Thủy là hành tinh gần Mặt Trời nhất và cũng là hành tinh nhỏ nhất trong Hệ Mặt Trời.',
      facts: Object.freeze([
        'Một năm trên Sao Thủy ngắn hơn một năm trên Trái Đất rất nhiều.',
        'Bề mặt của nó có nhiều hố va chạm giống Mặt Trăng.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Mercury is the closest planet to the Sun and the smallest planet in the Solar System.',
      facts: Object.freeze([
        'A year on Mercury is much shorter than a year on Earth.',
        'Its surface has many impact craters, a little like the Moon.',
      ]),
    }),
  }),
  venus: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Kim có kích thước gần giống Trái Đất, nhưng được bao phủ bởi một lớp khí quyển rất dày và nóng.',
      facts: Object.freeze([
        'Sao Kim là hành tinh nóng nhất trong Hệ Mặt Trời.',
        'Nó quay quanh trục theo hướng khác với phần lớn các hành tinh.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Venus is close to Earth in size, but it is wrapped in a very thick and hot atmosphere.',
      facts: Object.freeze([
        'Venus is the hottest planet in the Solar System.',
        'It spins in the opposite direction from most planets.',
      ]),
    }),
  }),
  earth: Object.freeze({
    vi: Object.freeze({
      summary: 'Trái Đất là ngôi nhà của chúng ta. Đây là hành tinh duy nhất mà chúng ta biết chắc có sự sống.',
      facts: Object.freeze([
        'Phần lớn bề mặt Trái Đất được bao phủ bởi nước.',
        'Trái Đất có một vệ tinh tự nhiên là Mặt Trăng.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Earth is our home. It is the only planet we know for sure has life.',
      facts: Object.freeze([
        'Most of Earth’s surface is covered by water.',
        'Earth has one natural satellite: the Moon.',
      ]),
    }),
  }),
  mars: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Hỏa thường được gọi là Hành tinh Đỏ vì bụi giàu sắt trên bề mặt làm nó có màu đỏ cam.',
      facts: Object.freeze([
        'Sao Hỏa có núi lửa Olympus Mons rất lớn.',
        'Các tàu robot đã được gửi tới Sao Hỏa để tìm hiểu bề mặt của nó.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Mars is often called the Red Planet because iron-rich dust makes its surface look reddish orange.',
      facts: Object.freeze([
        'Mars has a huge volcano called Olympus Mons.',
        'Robot explorers have been sent to Mars to study its surface.',
      ]),
    }),
  }),
  jupiter: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Mộc là hành tinh lớn nhất trong Hệ Mặt Trời. Nó là một hành tinh khí khổng lồ với những dải mây rất dễ nhận ra.',
      facts: Object.freeze([
        'Vết Đỏ Lớn trên Sao Mộc là một cơn bão khổng lồ đã tồn tại rất lâu.',
        'Sao Mộc có rất nhiều vệ tinh tự nhiên quay quanh nó.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Jupiter is the largest planet in the Solar System. It is a gas giant with easy-to-recognize bands of clouds.',
      facts: Object.freeze([
        'Jupiter’s Great Red Spot is a giant storm that has lasted for a very long time.',
        'Jupiter has many natural moons orbiting around it.',
      ]),
    }),
  }),
  saturn: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Thổ là một hành tinh khí khổng lồ nổi tiếng với hệ vòng nhẫn sáng và rộng.',
      facts: Object.freeze([
        'Các vòng của Sao Thổ được tạo bởi vô số mảnh băng và đá nhỏ.',
        'Sao Thổ có rất nhiều vệ tinh tự nhiên.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Saturn is a gas giant famous for its bright, wide ring system.',
      facts: Object.freeze([
        'Saturn’s rings are made of countless small pieces of ice and rock.',
        'Saturn has many natural moons.',
      ]),
    }),
  }),
  uranus: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Thiên Vương là một hành tinh băng khổng lồ có màu xanh lục lam nhạt.',
      facts: Object.freeze([
        'Sao Thiên Vương quay gần như nằm nghiêng sang một bên.',
        'Khí mê-tan trong khí quyển góp phần tạo nên màu xanh của nó.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Uranus is an ice giant with a pale blue-green color.',
      facts: Object.freeze([
        'Uranus spins almost on its side.',
        'Methane gas in its atmosphere helps give it its blue color.',
      ]),
    }),
  }),
  neptune: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao Hải Vương là hành tinh xa Mặt Trời nhất trong tám hành tinh của Hệ Mặt Trời.',
      facts: Object.freeze([
        'Đây là một hành tinh băng khổng lồ có màu xanh đậm.',
        'Sao Hải Vương có những cơn gió rất mạnh.',
      ]),
    }),
    en: Object.freeze({
      summary: 'Neptune is the farthest of the eight planets from the Sun.',
      facts: Object.freeze([
        'It is a deep-blue ice giant.',
        'Neptune has some very powerful winds.',
      ]),
    }),
  }),
  comet: Object.freeze({
    vi: Object.freeze({
      summary: 'Sao chổi là một vật thể nhỏ chứa băng, bụi và đá chuyển động quanh Mặt Trời.',
      facts: Object.freeze([
        'Khi tới gần Mặt Trời, sao chổi có thể tạo ra một chiếc đuôi sáng rất dài.',
        'Đuôi sao chổi thường hướng ra xa Mặt Trời.',
      ]),
    }),
    en: Object.freeze({
      summary: 'A comet is a small object made of ice, dust, and rock that travels around the Sun.',
      facts: Object.freeze([
        'When a comet comes near the Sun, it can grow a long bright tail.',
        'A comet’s tail usually points away from the Sun.',
      ]),
    }),
  }),
  asteroid: Object.freeze({
    vi: Object.freeze({
      summary: 'Thiên thạch trong trò chơi đại diện cho các khối đá nhỏ bay trong không gian. Nhiều vật thể đá như vậy được gọi là tiểu hành tinh khi chúng quay quanh Mặt Trời.',
      facts: Object.freeze([
        'Rất nhiều tiểu hành tinh nằm trong vành đai giữa Sao Hỏa và Sao Mộc.',
        'Chúng có nhiều hình dạng và kích thước khác nhau.',
      ]),
    }),
    en: Object.freeze({
      summary: 'The asteroid visitor in this game represents a small rocky object moving through space. Many rocky objects are called asteroids when they orbit the Sun.',
      facts: Object.freeze([
        'Many asteroids are found in the belt between Mars and Jupiter.',
        'They come in many different shapes and sizes.',
      ]),
    }),
  }),
});

export function getSpaceInfo(nameKey, language) {
  const item = SPACE_INFO[nameKey];
  if (!item) return null;
  return item[language] ?? item.vi;
}

export function readSpaceInfoEnabled() {
  return localStorage.getItem(SPACE_INFO_STORAGE_KEY) === 'on';
}
