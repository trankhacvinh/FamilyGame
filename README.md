# FamilyGame 🎈

Bộ trò chơi học tập nhẹ, vui nhộn cho trẻ nhỏ, hỗ trợ **Tiếng Việt / English**, chạy tốt trên máy tính và điện thoại.

## V1 có gì?

- 🔺 **Thả Khối Vào Lỗ**: game 3D kéo thả hình cầu / hộp / tam giác bằng Raycaster.
- 🪐 **Khám Phá Hệ Mặt Trời**: Mặt Trời, Trái Đất, Sao Hỏa, Sao Thổ chuyển động theo quỹ đạo.
- 🔊 Âm thanh Web Audio nhẹ; có thể thay bằng file audio thật qua `AudioManager.registerSample()`.
- 🌐 Chuyển ngôn ngữ VI / EN.
- 📱 Responsive portrait / landscape, hỗ trợ Pointer Events cho mouse / touch / stylus.
- ♻️ Cleanup geometry, material, texture, listeners và timer khi đổi màn hình.
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
│   └── space/
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
