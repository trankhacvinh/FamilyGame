# FamilyGame 🎈

Bộ trò chơi học tập nhẹ, vui nhộn cho trẻ nhỏ, hỗ trợ **Tiếng Việt / English**, chạy tốt trên máy tính và điện thoại.

## V1 có gì?

- 🔺 **Thả Khối Vào Lỗ**: game 3D kéo thả bằng Raycaster, cấu hình được **3 / 4 / 5 / 6 khối**. Hiện có Circle, Square, Triangle, Rectangle, Star và Hexagon; mỗi khối có tên VI/EN.
- 🪐 **Khám Phá Hệ Mặt Trời**: đủ 8 hành tinh (Sao Thủy → Sao Hải Vương), Mặt Trời, quỹ đạo sin/cos và các visitor ngẫu nhiên như Sao Chổi / Thiên Thạch để bé chạm khám phá.
- 🪨 **Khảo Cổ Học Nhí**: đập khối đá méo 3D khoảng 5–7 lần để làm nứt/vỡ đá, sau đó chọn 1 trong 3 thumbnail model 3D. Đúng thì fireworks + âm thanh chúc mừng; sai thì có hiệu ứng rung + âm báo. Có 16 vật thể toy-style và nút New để random ván mới.
- 🔊 Âm thanh Web Audio nhẹ; có thể thay bằng file audio thật qua `AudioManager.registerSample()`.
- 🗣️ **Read / Đọc**: tùy chọn đọc tên shape, hành tinh, vật thể khảo cổ... theo ngôn ngữ VI/EN hiện tại bằng Web Speech API. Trạng thái được nhớ giữa các lần chơi.
- ℹ️ **Info / Thông tin (Space)**: khi bật, tap vật thể sẽ mở panel thông tin VI/EN ở bottom; nội dung dài có thể cuộn. Nếu Read cũng bật, game sẽ đọc cả tên + nội dung + facts.
- 🌐 Chuyển ngôn ngữ VI / EN.
- 📱 Responsive portrait / landscape, hỗ trợ Pointer Events cho mouse / touch / stylus.
- ♻️ Cleanup geometry, material, texture, listeners và timer khi đổi màn hình; các object động được dọn khi New/Back để tránh memory tăng dần.
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
│   ├── SpeechManager.js    # đọc VI/EN bằng Web Speech API
│   ├── I18n.js
│   └── constants.js
├── games/
│   ├── shapes/
│   ├── space/
│   └── archaeology/
│       ├── ArchaeologyGame.js
│       ├── archaeologyCatalog.js # 16 item + random answers
│       ├── modelFactory.js       # primitive toy models dùng cho secret + thumbnail 3D
│       └── archaeology.css
├── screens/
│   └── MenuScreen.js
├── ui/
│   ├── GameHud.js
│   └── gameHudSpeech.css
├── main.js
└── styles.css
```

### Thêm một game mới

1. Tạo `src/games/my-game/MyGame.js` và kế thừa `BaseGame` nếu game dùng lifecycle Three.js chung.
2. Implement `init()`, `update()`, `resize()` và gọi `super.dispose()` trong `dispose()`.
3. Đăng ký metadata + lazy loader trong `GameRegistry.js`.
4. Menu sẽ tự sinh card game mới từ registry.

Mỗi game có thể là 2D (Canvas/DOM) hoặc 3D (Three.js), miễn tuân thủ lifecycle chung.

### Điều chỉnh Khảo Cổ Học

- Catalog 16 vật thể nằm trong `src/games/archaeology/archaeologyCatalog.js`.
- Model toy-style nằm trong `modelFactory.js`; cùng một builder được dùng cho vật thể bí mật và thumbnail 3D đáp án.
- `ARCHAEOLOGY_CONFIG.minHits/maxHits` quyết định số lần đập đá, mặc định random từ 5 đến 7.
- Mỗi ván luôn sinh đúng 3 đáp án: 1 đúng + 2 distractor random không trùng.
- Trả lời đúng không tự chuyển ván; bé/phụ huynh bấm **New** để chơi tiếp.

### Điều chỉnh Space

- Chỉnh bán kính, màu, tốc độ/quỹ đạo hành tinh trong `src/games/space/spaceConfig.js`.
- Chỉnh tần suất xuất hiện Sao Chổi / Thiên Thạch bằng `SPACE_VISITOR_CONFIG`.
- Chỉnh nội dung giáo dục VI/EN cho Mặt Trời / hành tinh / visitor trong `src/games/space/spaceInfo.js`.
- Trạng thái Info được lưu bằng `localStorage` với key `familygame-space-info`.

### Read / Đọc

- Nút 🗣️ trong HUD bật/tắt đọc và lưu vào `localStorage` với key `familygame-read`.
- `SpeechManager` ưu tiên voice `vi-VN` khi đang ở tiếng Việt và `en-US` khi đang ở English.
- Mỗi lần chạm mới sẽ hủy nội dung đang đọc và ưu tiên nội dung mới nhất để bé không bị hàng đợi âm thanh dài.

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
