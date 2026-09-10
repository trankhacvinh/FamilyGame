import { strToU8, zipSync } from 'fflate';
import './assetTool.css';

const PREVIEW_SIZE = 720;
const DEFAULT_OUTPUT_SIZE = 1024;

const PIECE_LAYOUTS = Object.freeze({
  3: { rows: 1, cols: 3 },
  4: { rows: 2, cols: 2 },
  6: { rows: 2, cols: 3 },
});

const BACKGROUNDS = Object.freeze({
  transparent: null,
  cream: '#fff8e9',
  sky: '#eaf7ff',
  mint: '#ecfbf2',
  lavender: '#f4f0ff',
});

const state = {
  image: null,
  sourceFileName: '',
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
  drag: null,
  idTouched: false,
  exporting: false,
};

const app = document.querySelector('#asset-tool');

app.innerHTML = `
  <main class="asset-tool">
    <header class="asset-tool__header">
      <div>
        <p class="asset-tool__eyebrow">FamilyGame · Parent / Admin</p>
        <h1>Animal Puzzle Asset Tool</h1>
        <p class="asset-tool__subtitle">
          Tạo bộ asset puzzle cố định từ ảnh AI/PNG: căn ảnh, chọn 3–6 mảnh và xuất ZIP sẵn để đưa vào game.
        </p>
      </div>
      <a class="asset-tool__back" href="./">← Về FamilyGame</a>
    </header>

    <div class="asset-tool__privacy">
      <span aria-hidden="true">🔒</span>
      <span>Ảnh chỉ được xử lý trong trình duyệt của bạn. Trang này không upload ảnh lên server.</span>
    </div>

    <div class="asset-tool__grid">
      <div>
        <section class="asset-panel">
          <div class="asset-panel__head">
            <h2>1. Thông tin asset</h2>
            <p>Nhập tên trước để tool tạo prompt AI và metadata dùng trong game.</p>
          </div>
          <div class="asset-panel__body">
            <div class="asset-form-grid">
              <div class="asset-field">
                <label for="name-vi">Tên VI</label>
                <input id="name-vi" type="text" placeholder="Con Thỏ" autocomplete="off" />
              </div>
              <div class="asset-field">
                <label for="name-en">Tên EN</label>
                <input id="name-en" type="text" placeholder="Rabbit" autocomplete="off" />
              </div>
              <div class="asset-field asset-field--wide">
                <label for="asset-id">Asset ID</label>
                <input id="asset-id" type="text" placeholder="rabbit" autocomplete="off" spellcheck="false" />
              </div>
              <div class="asset-field">
                <label for="piece-count">Số mảnh</label>
                <select id="piece-count">
                  <option value="3">3 mảnh · rất dễ</option>
                  <option value="4" selected>4 mảnh · đề xuất</option>
                  <option value="6">6 mảnh · nâng cao</option>
                </select>
              </div>
              <div class="asset-field">
                <label for="output-size">Kích thước output</label>
                <select id="output-size">
                  <option value="768">768 × 768</option>
                  <option value="1024" selected>1024 × 1024</option>
                  <option value="1536">1536 × 1536</option>
                </select>
              </div>
              <div class="asset-field asset-field--wide">
                <label for="background">Nền output</label>
                <select id="background">
                  <option value="transparent" selected>Trong suốt · khuyên dùng</option>
                  <option value="cream">Kem sáng</option>
                  <option value="sky">Xanh trời nhạt</option>
                  <option value="mint">Mint nhạt</option>
                  <option value="lavender">Lavender nhạt</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="asset-panel" style="margin-top: 18px">
          <div class="asset-panel__head">
            <h2>2. Prompt tạo ảnh AI</h2>
            <p>Copy prompt này sang công cụ tạo ảnh. PNG nền trong suốt cho kết quả puzzle tốt nhất.</p>
          </div>
          <div class="asset-panel__body">
            <div class="asset-field">
              <label for="ai-prompt">Prompt</label>
              <textarea id="ai-prompt" readonly></textarea>
            </div>
            <div class="asset-inline-actions">
              <button id="copy-prompt" class="asset-button asset-button--secondary" type="button">📋 Copy prompt</button>
            </div>
          </div>
        </section>

        <section class="asset-panel" style="margin-top: 18px">
          <div class="asset-panel__head">
            <h2>3. Chọn ảnh</h2>
            <p>PNG/WebP có transparency là tốt nhất. JPG vẫn dùng được nhưng nền có sẵn trong ảnh sẽ được giữ lại.</p>
          </div>
          <div class="asset-panel__body">
            <label id="drop-zone" class="asset-drop">
              <input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" />
              <span>
                <span class="asset-drop__icon">🖼️</span>
                <span class="asset-drop__title">Chạm để chọn hoặc kéo ảnh vào đây</span>
                <span class="asset-drop__hint">1 con vật / 1 ảnh · toàn thân · chừa khoảng trống quanh nhân vật</span>
              </span>
            </label>
            <div id="file-status" class="asset-status">Chưa chọn ảnh.</div>
          </div>
        </section>
      </div>

      <section class="asset-panel">
        <div class="asset-panel__head">
          <h2>4. Căn ảnh & xem trước puzzle</h2>
          <p>Kéo trực tiếp ảnh ở ô bên trái để căn vị trí. Đường tím là ranh giới các mảnh sau khi export.</p>
        </div>
        <div class="asset-panel__body">
          <div class="asset-workspace">
            <div class="asset-canvas-card">
              <div class="asset-canvas-card__title">
                <span>Ảnh gốc đã căn</span>
                <span id="zoom-label">100%</span>
              </div>
              <div class="asset-canvas-wrap">
                <canvas id="crop-canvas" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}"></canvas>
                <div id="crop-empty" class="asset-empty">Upload ảnh để bắt đầu</div>
              </div>
            </div>

            <div class="asset-canvas-card">
              <div class="asset-canvas-card__title">
                <span>Puzzle preview</span>
                <span id="piece-label">4 mảnh</span>
              </div>
              <div class="asset-canvas-wrap">
                <canvas id="puzzle-canvas" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}"></canvas>
                <div id="puzzle-empty" class="asset-empty">Preview sẽ hiện ở đây</div>
              </div>
            </div>
          </div>

          <div class="asset-controls">
            <div class="asset-range">
              <div class="asset-range__head">
                <span>Zoom</span>
                <span>Khuyên giữ toàn bộ con vật trong khung</span>
              </div>
              <input id="zoom" type="range" min="55" max="190" value="100" step="1" />
            </div>
            <button id="fit-image" class="asset-button asset-button--secondary" type="button">↺ Fit ảnh</button>
          </div>

          <div class="asset-output-summary">
            <div><strong>ZIP sẽ chứa:</strong> <code>full.png</code>, các <code>piece_XX.png</code>, <code>puzzle.json</code>, <code>prompt.txt</code>.</div>
            <div>Mỗi piece là PNG transparency đã mask theo đường ghép; metadata chứa tọa độ target chuẩn để game snap mảnh về đúng chỗ.</div>
          </div>

          <div class="asset-export-row">
            <button id="export-zip" class="asset-button asset-button--export" type="button" disabled>📦 Xuất Puzzle ZIP</button>
            <span id="export-status" class="asset-small-note">Cần upload ảnh trước khi export.</span>
          </div>
        </div>
      </section>
    </div>
  </main>
`;

const refs = {
  nameVi: document.querySelector('#name-vi'),
  nameEn: document.querySelector('#name-en'),
  assetId: document.querySelector('#asset-id'),
  pieceCount: document.querySelector('#piece-count'),
  outputSize: document.querySelector('#output-size'),
  background: document.querySelector('#background'),
  aiPrompt: document.querySelector('#ai-prompt'),
  copyPrompt: document.querySelector('#copy-prompt'),
  file: document.querySelector('#image-file'),
  dropZone: document.querySelector('#drop-zone'),
  fileStatus: document.querySelector('#file-status'),
  cropCanvas: document.querySelector('#crop-canvas'),
  puzzleCanvas: document.querySelector('#puzzle-canvas'),
  cropEmpty: document.querySelector('#crop-empty'),
  puzzleEmpty: document.querySelector('#puzzle-empty'),
  zoom: document.querySelector('#zoom'),
  zoomLabel: document.querySelector('#zoom-label'),
  pieceLabel: document.querySelector('#piece-label'),
  fitImage: document.querySelector('#fit-image'),
  exportZip: document.querySelector('#export-zip'),
  exportStatus: document.querySelector('#export-status'),
};

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

function assetId() {
  return slugify(refs.assetId.value) || slugify(refs.nameEn.value) || slugify(refs.nameVi.value) || 'animal';
}

function outputSize() {
  return Number(refs.outputSize.value) || DEFAULT_OUTPUT_SIZE;
}

function pieceCount() {
  const count = Number(refs.pieceCount.value);
  return PIECE_LAYOUTS[count] ? count : 4;
}

function generatedPrompt() {
  const englishName = refs.nameEn.value.trim() || assetId().replaceAll('-', ' ');
  return `Create a cute preschool puzzle game asset of a single ${englishName}, full body, centered in the frame, facing front or slightly 3/4 view, simple clean silhouette, large readable shapes, soft rounded proportions, pastel color palette, friendly and adorable expression, children's storybook illustration style, minimal details, no scary features, isolated subject, transparent background, no text, no watermark, high resolution, plenty of empty margin around the character, suitable for cutting into 3 to 6 large puzzle pieces for toddlers. Keep the visual style soft, cheerful, consistent and suitable for a family educational game.`;
}

function refreshPrompt() {
  refs.aiPrompt.value = generatedPrompt();
}

function refreshLabels() {
  refs.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  refs.pieceLabel.textContent = `${pieceCount()} mảnh`;
}

function setStatus(element, message, kind = '') {
  element.textContent = message;
  element.classList.remove('asset-status--success', 'asset-status--error');
  if (kind) element.classList.add(`asset-status--${kind}`);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function currentBackground() {
  return BACKGROUNDS[refs.background.value] ?? null;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCheckerHint(ctx, size) {
  ctx.save();
  ctx.strokeStyle = 'rgba(109, 94, 177, 0.33)';
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = Math.max(1.5, size / 420);
  const margin = size * 0.075;
  ctx.strokeRect(margin, margin, size - margin * 2, size - margin * 2);
  ctx.restore();
}

function imagePlacement(size) {
  if (!state.image) return null;
  const imageWidth = state.image.naturalWidth || state.image.width;
  const imageHeight = state.image.naturalHeight || state.image.height;
  const fitScale = (size * 0.82) / Math.max(imageWidth, imageHeight, 1);
  const scale = fitScale * state.zoom;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: state.centerX * size - width / 2,
    y: state.centerY * size - height / 2,
    width,
    height,
  };
}

function renderComposition(canvas, { includeSafeFrame = false } = {}) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  const background = currentBackground();
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }

  if (state.image) {
    const placement = imagePlacement(size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.image, placement.x, placement.y, placement.width, placement.height);
  }

  if (includeSafeFrame) drawCheckerHint(ctx, size);
}

function verticalBoundarySign(row, boundaryCol) {
  return (row + boundaryCol) % 2 === 0 ? 1 : -1;
}

function horizontalBoundarySign(boundaryRow, col) {
  return (boundaryRow + col) % 2 === 0 ? -1 : 1;
}

function horizontalEdge(path, x1, x2, y, normal, tabSign, depth) {
  const length = x2 - x1;
  if (!tabSign) {
    path.lineTo(x2, y);
    return;
  }

  const p35 = x1 + length * 0.35;
  const p43 = x1 + length * 0.43;
  const p50 = x1 + length * 0.5;
  const p57 = x1 + length * 0.57;
  const p65 = x1 + length * 0.65;
  const bulge = normal * tabSign * depth;

  path.lineTo(p35, y);
  path.bezierCurveTo(p39(x1, length), y, p43, y + bulge * 0.12, p43, y + bulge * 0.5);
  path.bezierCurveTo(p43, y + bulge * 0.9, p47(x1, length), y + bulge, p50, y + bulge);
  path.bezierCurveTo(p53(x1, length), y + bulge, p57, y + bulge * 0.9, p57, y + bulge * 0.5);
  path.bezierCurveTo(p57, y + bulge * 0.12, p61(x1, length), y, p65, y);
  path.lineTo(x2, y);
}

function verticalEdge(path, x, y1, y2, normal, tabSign, depth) {
  const length = y2 - y1;
  if (!tabSign) {
    path.lineTo(x, y2);
    return;
  }

  const p35 = y1 + length * 0.35;
  const p43 = y1 + length * 0.43;
  const p50 = y1 + length * 0.5;
  const p57 = y1 + length * 0.57;
  const p65 = y1 + length * 0.65;
  const bulge = normal * tabSign * depth;

  path.lineTo(x, p35);
  path.bezierCurveTo(x, p39(y1, length), x + bulge * 0.12, p43, x + bulge * 0.5, p43);
  path.bezierCurveTo(x + bulge * 0.9, p43, x + bulge, p47(y1, length), x + bulge, p50);
  path.bezierCurveTo(x + bulge, p53(y1, length), x + bulge * 0.9, p57, x + bulge * 0.5, p57);
  path.bezierCurveTo(x + bulge * 0.12, p57, x, p61(y1, length), x, p65);
  path.lineTo(x, y2);
}

const p39 = (origin, length) => origin + length * 0.39;
const p47 = (origin, length) => origin + length * 0.47;
const p53 = (origin, length) => origin + length * 0.53;
const p61 = (origin, length) => origin + length * 0.61;

function createPiecePath(row, col, rows, cols, size) {
  const cellWidth = size / cols;
  const cellHeight = size / rows;
  const x0 = col * cellWidth;
  const x1 = (col + 1) * cellWidth;
  const y0 = row * cellHeight;
  const y1 = (row + 1) * cellHeight;
  const depth = Math.min(cellWidth, cellHeight) * 0.16;

  const topSign = row === 0 ? 0 : -horizontalBoundarySign(row - 1, col);
  const rightSign = col === cols - 1 ? 0 : verticalBoundarySign(row, col);
  const bottomSign = row === rows - 1 ? 0 : horizontalBoundarySign(row, col);
  const leftSign = col === 0 ? 0 : -verticalBoundarySign(row, col - 1);

  const path = new Path2D();
  path.moveTo(x0, y0);
  horizontalEdge(path, x0, x1, y0, -1, topSign, depth);
  verticalEdge(path, x1, y0, y1, 1, rightSign, depth);
  horizontalEdge(path, x1, x0, y1, 1, bottomSign, depth);
  verticalEdge(path, x0, y1, y0, -1, leftSign, depth);
  path.closePath();

  const margin = depth + Math.max(4, size * 0.006);
  const bounds = {
    x: Math.max(0, Math.floor(x0 - margin)),
    y: Math.max(0, Math.floor(y0 - margin)),
    right: Math.min(size, Math.ceil(x1 + margin)),
    bottom: Math.min(size, Math.ceil(y1 + margin)),
  };
  bounds.width = bounds.right - bounds.x;
  bounds.height = bounds.bottom - bounds.y;

  return {
    path,
    bounds,
    cell: { x: x0, y: y0, width: cellWidth, height: cellHeight },
  };
}

function renderPuzzlePreview() {
  const canvas = refs.puzzleCanvas;
  renderComposition(canvas);
  if (!state.image) return;

  const ctx = canvas.getContext('2d');
  const count = pieceCount();
  const { rows, cols } = PIECE_LAYOUTS[count];

  ctx.save();
  ctx.strokeStyle = 'rgba(99, 77, 186, 0.86)';
  ctx.lineWidth = Math.max(3, canvas.width / 170);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = canvas.width / 180;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const { path } = createPiecePath(row, col, rows, cols, canvas.width);
      ctx.stroke(path);
    }
  }
  ctx.restore();
}

function renderPreviews() {
  renderComposition(refs.cropCanvas, { includeSafeFrame: true });
  renderPuzzlePreview();
  refs.cropEmpty.hidden = Boolean(state.image);
  refs.puzzleEmpty.hidden = Boolean(state.image);
  refreshLabels();
}

function resetPlacement() {
  state.centerX = 0.5;
  state.centerY = 0.5;
  state.zoom = 1;
  refs.zoom.value = '100';
  renderPreviews();
}

function validateFile(file) {
  if (!file) return 'Không tìm thấy file.';
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return 'Chỉ hỗ trợ PNG, JPG/JPEG hoặc WebP.';
  if (file.size > 20 * 1024 * 1024) return 'Ảnh lớn hơn 20 MB. Hãy giảm kích thước trước khi dùng.';
  return null;
}

async function loadImageFile(file) {
  const error = validateFile(file);
  if (error) {
    setStatus(refs.fileStatus, error, 'error');
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Không đọc được ảnh.'));
    });

    state.image = image;
    state.sourceFileName = file.name;
    resetPlacement();
    refs.exportZip.disabled = false;
    refs.exportStatus.textContent = 'Sẵn sàng export.';

    const dimensions = `${image.naturalWidth}×${image.naturalHeight}`;
    const transparencyHint = file.type === 'image/png' || file.type === 'image/webp'
      ? 'PNG/WebP: transparency sẽ được giữ nếu ảnh có alpha.'
      : 'JPG không có transparency; nền trong ảnh gốc sẽ vẫn còn.';
    setStatus(refs.fileStatus, `✅ ${file.name} · ${dimensions}. ${transparencyHint}`, 'success');
  } catch (loadError) {
    setStatus(refs.fileStatus, loadError.message || 'Không đọc được ảnh.', 'error');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function createOutputCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  renderComposition(canvas);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Trình duyệt không tạo được PNG.'));
    }, 'image/png');
  });
}

async function blobBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function createPieceCanvas(fullCanvas, pieceInfo) {
  const canvas = document.createElement('canvas');
  canvas.width = pieceInfo.bounds.width;
  canvas.height = pieceInfo.bounds.height;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(-pieceInfo.bounds.x, -pieceInfo.bounds.y);
  ctx.clip(pieceInfo.path);
  ctx.drawImage(fullCanvas, 0, 0);
  ctx.restore();

  return canvas;
}

function metadataForPiece(pieceNumber, row, col, pieceInfo, size) {
  const pad = (value) => Number(value.toFixed(6));
  return {
    id: `piece_${String(pieceNumber).padStart(2, '0')}`,
    file: `piece_${String(pieceNumber).padStart(2, '0')}.png`,
    row,
    col,
    target: {
      x: pieceInfo.bounds.x,
      y: pieceInfo.bounds.y,
      width: pieceInfo.bounds.width,
      height: pieceInfo.bounds.height,
      centerX: pad((pieceInfo.bounds.x + pieceInfo.bounds.width / 2) / size),
      centerY: pad((pieceInfo.bounds.y + pieceInfo.bounds.height / 2) / size),
      normalizedX: pad(pieceInfo.bounds.x / size),
      normalizedY: pad(pieceInfo.bounds.y / size),
      normalizedWidth: pad(pieceInfo.bounds.width / size),
      normalizedHeight: pad(pieceInfo.bounds.height / size),
    },
    cell: {
      x: pad(pieceInfo.cell.x / size),
      y: pad(pieceInfo.cell.y / size),
      width: pad(pieceInfo.cell.width / size),
      height: pad(pieceInfo.cell.height / size),
    },
  };
}

function buildReadme(id, count) {
  return `FamilyGame Animal Puzzle asset package\n\nAsset: ${id}\nPieces: ${count}\n\nFiles:\n- full.png: completed reference image\n- piece_XX.png: transparent puzzle pieces\n- puzzle.json: names, grid and normalized target coordinates\n- prompt.txt: AI image prompt used for this asset\n\nRecommended repo destination:\npublic/assets/puzzles/${id}/\n\nThe game should render each piece PNG at puzzle.json target width/height and snap it to target x/y.\n`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportZip() {
  if (!state.image || state.exporting) return;

  const id = assetId();
  if (!refs.assetId.value.trim()) refs.assetId.value = id;

  state.exporting = true;
  refs.exportZip.disabled = true;
  refs.exportZip.textContent = '⏳ Đang tạo ZIP...';
  refs.exportStatus.textContent = 'Đang render PNG ở độ phân giải đầy đủ.';

  try {
    const size = outputSize();
    const count = pieceCount();
    const { rows, cols } = PIECE_LAYOUTS[count];
    const fullCanvas = createOutputCanvas(size);
    const packageFiles = {};
    const directory = `${id}/`;

    packageFiles[`${directory}full.png`] = await blobBytes(await canvasToBlob(fullCanvas));

    const metadata = {
      schema: 'familygame.animal-puzzle.v1',
      id,
      nameVi: refs.nameVi.value.trim() || id,
      nameEn: refs.nameEn.value.trim() || id,
      sourceFile: state.sourceFileName || null,
      image: {
        width: size,
        height: size,
        file: 'full.png',
        background: refs.background.value,
      },
      puzzle: {
        pieceCount: count,
        rows,
        cols,
        pieceStyle: 'rounded-jigsaw',
      },
      pieces: [],
    };

    let pieceNumber = 1;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const pieceInfo = createPiecePath(row, col, rows, cols, size);
        const pieceCanvas = createPieceCanvas(fullCanvas, pieceInfo);
        const fileName = `piece_${String(pieceNumber).padStart(2, '0')}.png`;
        packageFiles[`${directory}${fileName}`] = await blobBytes(await canvasToBlob(pieceCanvas));
        metadata.pieces.push(metadataForPiece(pieceNumber, row, col, pieceInfo, size));
        pieceNumber += 1;
      }
    }

    packageFiles[`${directory}puzzle.json`] = strToU8(JSON.stringify(metadata, null, 2));
    packageFiles[`${directory}prompt.txt`] = strToU8(generatedPrompt());
    packageFiles[`${directory}README.txt`] = strToU8(buildReadme(id, count));

    refs.exportStatus.textContent = 'Đang nén package...';
    const zipped = zipSync(packageFiles, { level: 6 });
    const zipBlob = new Blob([zipped], { type: 'application/zip' });
    downloadBlob(zipBlob, `${id}-puzzle-assets.zip`);

    refs.exportStatus.textContent = `✅ Đã tạo ${id}-puzzle-assets.zip · ${count} mảnh · ${size}×${size}.`;
  } catch (error) {
    console.error(error);
    refs.exportStatus.textContent = `❌ Export lỗi: ${error.message || 'Không xác định'}`;
  } finally {
    state.exporting = false;
    refs.exportZip.disabled = !state.image;
    refs.exportZip.textContent = '📦 Xuất Puzzle ZIP';
  }
}

function handleMetadataInput(event) {
  if (event.target === refs.assetId) state.idTouched = Boolean(refs.assetId.value.trim());

  if (!state.idTouched && (event.target === refs.nameEn || event.target === refs.nameVi)) {
    const suggested = slugify(refs.nameEn.value) || slugify(refs.nameVi.value);
    refs.assetId.value = suggested;
  }

  refreshPrompt();
}

[refs.nameVi, refs.nameEn, refs.assetId].forEach((input) => {
  input.addEventListener('input', handleMetadataInput);
});

refs.pieceCount.addEventListener('change', renderPreviews);
refs.background.addEventListener('change', renderPreviews);
refs.outputSize.addEventListener('change', () => {
  refs.exportStatus.textContent = state.image ? 'Sẵn sàng export với kích thước mới.' : 'Cần upload ảnh trước khi export.';
});

refs.zoom.addEventListener('input', () => {
  state.zoom = Number(refs.zoom.value) / 100;
  renderPreviews();
});

refs.fitImage.addEventListener('click', resetPlacement);
refs.copyPrompt.addEventListener('click', async () => {
  try {
    await copyText(refs.aiPrompt.value);
    const original = refs.copyPrompt.textContent;
    refs.copyPrompt.textContent = '✅ Đã copy';
    window.setTimeout(() => { refs.copyPrompt.textContent = original; }, 1300);
  } catch {
    refs.aiPrompt.focus();
    refs.aiPrompt.select();
  }
});

refs.file.addEventListener('change', () => loadImageFile(refs.file.files?.[0]));

['dragenter', 'dragover'].forEach((type) => {
  refs.dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    refs.dropZone.classList.add('asset-drop--active');
  });
});

['dragleave', 'drop'].forEach((type) => {
  refs.dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    refs.dropZone.classList.remove('asset-drop--active');
  });
});

refs.dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) loadImageFile(file);
});

refs.cropCanvas.addEventListener('pointerdown', (event) => {
  if (!state.image) return;
  const rect = refs.cropCanvas.getBoundingClientRect();
  state.drag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    centerX: state.centerX,
    centerY: state.centerY,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  };
  refs.cropCanvas.setPointerCapture?.(event.pointerId);
  refs.cropCanvas.classList.add('is-dragging');
});

refs.cropCanvas.addEventListener('pointermove', (event) => {
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  const dx = (event.clientX - state.drag.x) / state.drag.width;
  const dy = (event.clientY - state.drag.y) / state.drag.height;
  state.centerX = Math.max(-0.25, Math.min(1.25, state.drag.centerX + dx));
  state.centerY = Math.max(-0.25, Math.min(1.25, state.drag.centerY + dy));
  renderPreviews();
});

function finishDrag(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  refs.cropCanvas.releasePointerCapture?.(event.pointerId);
  state.drag = null;
  refs.cropCanvas.classList.remove('is-dragging');
}

refs.cropCanvas.addEventListener('pointerup', finishDrag);
refs.cropCanvas.addEventListener('pointercancel', finishDrag);
refs.exportZip.addEventListener('click', exportZip);

refreshPrompt();
renderPreviews();
