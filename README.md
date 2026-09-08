# FamilyGame 🎈

Bộ trò chơi học tập nhẹ, vui nhộn cho trẻ nhỏ, hỗ trợ **Tiếng Việt / English**, chạy tốt trên máy tính và điện thoại.

## V1 có gì?

- 🔺 **Thả Khối Vào Lỗ**: game 3D kéo thả bằng Raycaster, cấu hình được **3 / 4 / 5 / 6 khối**. Hiện có Circle, Square, Triangle, Rectangle, Star và Hexagon; mỗi khối có tên VI/EN.
- 🪐 **Khám Phá Hệ Mặt Trời**: đủ 8 hành tinh (Sao Thủy → Sao Hải Vương), Mặt Trời, quỹ đạo sin/cos và các visitor ngẫu nhiên như Sao Chổi / Thiên Thạch để bé chạm khám phá.
- 🔊 Âm thanh Web Audio nhẹ; có thể thay bằng file audio thật qua `AudioManager.registerSample()`.
- 🌐 Chuyển ngôn ngữ VI / EN.
- 📱 Responsive portrait / landscape, hỗ trợ Pointer Events cho mouse / touch / stylus.
- ♻️ Cleanup geometry, material, texture, listeners và timer khi đổi màn hình; visitor động trong Space được dispose ngay khi bay khỏi scene.
- ⚡ Lazy-load từng game bằng dynamic `import()`.

## Kiến trúc

```text
src/
├── core/
│   ├── GameApp.js          # renderer + animation loop duy nhất
│   ├── ScreenManager.js    # currentScreen + lifecycle chuyển màn hình
│   ├── GameRegistry.js     # registry để thêm game mới
│   ├── BaseGame.js         # lifecycle chung cho game
│   ├── ResourceTracker.js  # dispose tài nguyên Three.js
│   ├── AudioManager.js
│   ├── I18n.js
│   └── constants.js
├── games/
│   ├── shapes/
│   │   ├── ShapesGame.js
│   │   ├── shapeConfig.js  # catalog shape + cấu hình số lượng 3–6
│   │   └── shapes.css
│   └── space/
│       ├── SpaceGame.js
│       └── spaceConfig.js  # catalog 8 hành tinh + visitor config
├── screens/
│   └── MenuScreen.js
├── ui/
│   └── GameHud.js
├── main.js
└── styles.css
```

### Thêm một game mới

1. Tạo `src/games/my-game/MyGame.js` và kế thừa `BaseGame` nếu game dùng lifecycle Three.js chung.
2. Implement `init()`, `update()`, `resize()` và gọi `super.dispose()` trong `dispose()`.
3. Đăng ký metadata + lazy loader trong `GameRegistry.js`.
4. Menu sẽ tự sinh card game mới từ registry.

Mỗi game có thể là 2D (Canvas/DOM) hoặc 3D (Three.js), miễn tuân thủ lifecycle chung.

### Thêm shape mới

1. Thêm metadata vào `src/games/shapes/shapeConfig.js`.
2. Nếu cần geometry mới, thêm factory tương ứng trong `ShapesGame.createHoleGeometry()` và `createBlockGeometry()`.
3. Thêm từ VI/EN vào `I18n.js`.

### Điều chỉnh Space

- Chỉnh bán kính, màu, tốc độ/quỹ đạo hành tinh trong `src/games/space/spaceConfig.js`.
- Chỉnh tần suất xuất hiện Sao Chổi / Thiên Thạch bằng `SPACE_VISITOR_CONFIG`.

## Chạy local

Yêu cầu Node.js 20.19+ hoặc Node.js 22.12+.

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## GitHub Pages

`vite.config.js` đã cấu hình:

```js
base: '/FamilyGame/'
```

Workflow `.github/workflows/deploy.yml` sẽ build và deploy khi code được merge/push vào `main`.

Trong GitHub, chọn **Settings → Pages → Source → GitHub Actions** nếu repository chưa bật Pages theo Actions.

## Thay âm thanh mẫu bằng file thật

Ví dụ:

```js
audio.registerSample('shape-success', '/FamilyGame/assets/sounds/success.mp3');
audio.playSample('shape-success');
```

Nên dùng file ngắn, dung lượng nhỏ (`.mp3`, `.ogg` hoặc `.wav`) để tải nhanh trên điện thoại.
