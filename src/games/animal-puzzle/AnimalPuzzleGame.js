import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import { ANIMAL_PUZZLES, getAnimalName } from './animalPuzzleCatalog.js';
import './animalPuzzle.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ART_SIZE = 1000;
const TAB_SIZE = 62;

const TEXT = Object.freeze({
  vi: {
    title: 'Ghép Hình Con Vật 🧩',
    instruction: 'Kéo từng mảnh vào đúng vị trí nhé!',
    progress: 'Đã ghép',
    reset: '🔄 Ghép lại',
    complete: 'HOÀN THÀNH! 🎉',
    next: 'Con khác ➜',
    tapName: 'Chạm vào con vật để nghe tên',
  },
  en: {
    title: 'Animal Puzzle 🧩',
    instruction: 'Drag each big piece into the right place!',
    progress: 'Placed',
    reset: '🔄 Restart',
    complete: 'ALL DONE! 🎉',
    next: 'Next animal ➜',
    tapName: 'Tap the animal to hear its name',
  },
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rightEdgeSign(row, col) {
  return (row + col) % 2 === 0 ? 1 : -1;
}

function bottomEdgeSign(row, col) {
  return (row * 5 + col) % 2 === 0 ? -1 : 1;
}

function edgeSigns(row, col, rows, cols) {
  return {
    top: row === 0 ? 0 : -bottomEdgeSign(row - 1, col),
    right: col === cols - 1 ? 0 : rightEdgeSign(row, col),
    bottom: row === rows - 1 ? 0 : bottomEdgeSign(row, col),
    left: col === 0 ? 0 : -rightEdgeSign(row, col - 1),
  };
}

function horizontalEdge(x1, y, x2, normalY, sign) {
  if (!sign) return `L ${x2} ${y}`;
  const dx = x2 - x1;
  const yTab = y + normalY * sign * TAB_SIZE;
  return [
    `L ${x1 + dx * 0.34} ${y}`,
    `C ${x1 + dx * 0.39} ${y} ${x1 + dx * 0.39} ${yTab} ${x1 + dx * 0.5} ${yTab}`,
    `C ${x1 + dx * 0.61} ${yTab} ${x1 + dx * 0.61} ${y} ${x1 + dx * 0.66} ${y}`,
    `L ${x2} ${y}`,
  ].join(' ');
}

function verticalEdge(x, y1, y2, normalX, sign) {
  if (!sign) return `L ${x} ${y2}`;
  const dy = y2 - y1;
  const xTab = x + normalX * sign * TAB_SIZE;
  return [
    `L ${x} ${y1 + dy * 0.34}`,
    `C ${x} ${y1 + dy * 0.39} ${xTab} ${y1 + dy * 0.39} ${xTab} ${y1 + dy * 0.5}`,
    `C ${xTab} ${y1 + dy * 0.61} ${x} ${y1 + dy * 0.61} ${x} ${y1 + dy * 0.66}`,
    `L ${x} ${y2}`,
  ].join(' ');
}

function createPieceGeometry(row, col, rows, cols) {
  const cellW = ART_SIZE / cols;
  const cellH = ART_SIZE / rows;
  const x0 = col * cellW;
  const y0 = row * cellH;
  const x1 = x0 + cellW;
  const y1 = y0 + cellH;
  const signs = edgeSigns(row, col, rows, cols);

  const path = [
    `M ${x0} ${y0}`,
    horizontalEdge(x0, y0, x1, -1, signs.top),
    verticalEdge(x1, y0, y1, 1, signs.right),
    horizontalEdge(x1, y1, x0, 1, signs.bottom),
    verticalEdge(x0, y1, y0, -1, signs.left),
    'Z',
  ].join(' ');

  const bx = x0 - (signs.left > 0 ? TAB_SIZE : 0);
  const by = y0 - (signs.top > 0 ? TAB_SIZE : 0);
  const br = x1 + (signs.right > 0 ? TAB_SIZE : 0);
  const bb = y1 + (signs.bottom > 0 ? TAB_SIZE : 0);

  return {
    row,
    col,
    path,
    bounds: { x: bx, y: by, w: br - bx, h: bb - by },
    center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
  };
}

function randomOtherAnimal(previousId) {
  const options = ANIMAL_PUZZLES.filter((animal) => animal.id !== previousId);
  const pool = options.length ? options : ANIMAL_PUZZLES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class AnimalPuzzleGame extends BaseGame {
  constructor(context) {
    super(context);
    this.hud = null;
    this.root = null;
    this.board = null;
    this.tray = null;
    this.pieceLayer = null;
    this.completePanel = null;
    this.completeImage = null;
    this.currentAnimal = null;
    this.previousAnimalId = null;
    this.pieces = [];
    this.placedCount = 0;
    this.completed = false;
    this.drag = null;
    this.layoutFrame = null;
    this.completeTimer = null;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.context.renderer.setClearColor(0xf6f0ff, 1);
    this.createUi();
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();
    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refreshText());
    this.startRound();
  }

  createUi() {
    const root = document.createElement('main');
    root.className = 'animal-puzzle-screen';

    const decorations = document.createElement('div');
    decorations.className = 'animal-puzzle-decor';
    decorations.setAttribute('aria-hidden', 'true');
    decorations.innerHTML = '<span>☁️</span><span>⭐</span><span>🌈</span><span>✨</span>';

    const top = document.createElement('section');
    top.className = 'animal-puzzle-top';

    this.titleEl = document.createElement('h1');
    this.titleEl.className = 'animal-puzzle-title';

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'animal-puzzle-name';

    this.progressEl = document.createElement('div');
    this.progressEl.className = 'animal-puzzle-progress';

    this.instructionEl = document.createElement('p');
    this.instructionEl.className = 'animal-puzzle-instruction';

    top.append(this.titleEl, this.nameEl, this.progressEl, this.instructionEl);

    const playArea = document.createElement('section');
    playArea.className = 'animal-puzzle-playarea';

    this.board = document.createElement('div');
    this.board.className = 'animal-puzzle-board';

    this.guideImage = document.createElement('img');
    this.guideImage.className = 'animal-puzzle-guide';
    this.guideImage.alt = '';
    this.guideImage.draggable = false;
    this.board.append(this.guideImage);

    this.completeImage = document.createElement('img');
    this.completeImage.className = 'animal-puzzle-complete-image';
    this.completeImage.alt = '';
    this.completeImage.draggable = false;
    this.completeImage.addEventListener('click', () => this.speakAnimal(), { signal: this.signal });
    this.board.append(this.completeImage);

    this.tray = document.createElement('div');
    this.tray.className = 'animal-puzzle-tray';
    this.tray.setAttribute('aria-label', 'Puzzle pieces');

    playArea.append(this.board, this.tray);

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'animal-puzzle-reset';
    resetButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startRound(this.currentAnimal?.id);
    }, { signal: this.signal });
    this.resetButton = resetButton;

    const complete = document.createElement('div');
    complete.className = 'animal-puzzle-complete';
    complete.innerHTML = '<div class="animal-puzzle-complete__stars" aria-hidden="true">⭐ ✨ ⭐</div>';

    this.completeTitle = document.createElement('div');
    this.completeTitle.className = 'animal-puzzle-complete__title';
    this.completeName = document.createElement('div');
    this.completeName.className = 'animal-puzzle-complete__name';
    this.completeHint = document.createElement('div');
    this.completeHint.className = 'animal-puzzle-complete__hint';
    this.nextButton = document.createElement('button');
    this.nextButton.type = 'button';
    this.nextButton.className = 'animal-puzzle-next';
    this.nextButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startRound();
    }, { signal: this.signal });
    complete.append(this.completeTitle, this.completeName, this.completeHint, this.nextButton);
    this.completePanel = complete;

    this.pieceLayer = document.createElement('div');
    this.pieceLayer.className = 'animal-puzzle-piece-layer';

    root.append(decorations, top, playArea, resetButton, this.pieceLayer, complete);
    this.context.uiRoot.append(root);
    this.root = root;
  }

  startRound(forceAnimalId = null) {
    window.clearTimeout(this.completeTimer);
    this.completeTimer = null;
    this.completed = false;
    this.placedCount = 0;
    this.drag = null;

    const forced = forceAnimalId
      ? ANIMAL_PUZZLES.find((animal) => animal.id === forceAnimalId)
      : null;
    const animal = forced ?? randomOtherAnimal(this.previousAnimalId);
    this.previousAnimalId = animal.id;
    this.currentAnimal = animal;

    this.root.style.setProperty('--puzzle-accent', animal.accent);
    this.guideImage.src = animal.image;
    this.completeImage.src = animal.image;
    this.completeImage.classList.remove('animal-puzzle-complete-image--show');
    this.completePanel.classList.remove('animal-puzzle-complete--show');

    this.pieceLayer.replaceChildren();
    this.pieces = [];

    let index = 0;
    for (let row = 0; row < animal.rows; row += 1) {
      for (let col = 0; col < animal.cols; col += 1) {
        const geometry = createPieceGeometry(row, col, animal.rows, animal.cols);
        const piece = this.createPiece(index, geometry);
        this.pieces.push(piece);
        this.pieceLayer.append(piece.element);
        index += 1;
      }
    }

    this.shufflePieces();
    this.refreshText();
    this.scheduleLayout();
  }

  createPiece(index, geometry) {
    const element = document.createElement('div');
    element.className = 'animal-puzzle-piece';
    element.dataset.index = String(index);
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `Puzzle piece ${index + 1}`);

    const svg = document.createElementNS(SVG_NS, 'svg');
    const { bounds } = geometry;
    svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    const clipId = `animal-piece-${this.currentAnimal.id}-${index}-${Math.random().toString(36).slice(2)}`;
    clip.setAttribute('id', clipId);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const clipPath = document.createElementNS(SVG_NS, 'path');
    clipPath.setAttribute('d', geometry.path);
    clip.append(clipPath);
    defs.append(clip);

    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('href', this.currentAnimal.image);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', String(ART_SIZE));
    image.setAttribute('height', String(ART_SIZE));
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('clip-path', `url(#${clipId})`);

    const outline = document.createElementNS(SVG_NS, 'path');
    outline.setAttribute('d', geometry.path);
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', 'rgba(255,255,255,.96)');
    outline.setAttribute('stroke-width', '11');
    outline.setAttribute('stroke-linejoin', 'round');
    outline.setAttribute('vector-effect', 'non-scaling-stroke');

    svg.append(defs, image, outline);
    element.append(svg);

    const piece = {
      index,
      geometry,
      element,
      placed: false,
      order: index,
      home: null,
      target: null,
    };

    element.addEventListener('pointerdown', (event) => this.onPieceDown(event, piece), { signal: this.signal });
    element.addEventListener('pointermove', (event) => this.onPieceMove(event, piece), { signal: this.signal });
    element.addEventListener('pointerup', (event) => this.onPieceUp(event, piece), { signal: this.signal });
    element.addEventListener('pointercancel', (event) => this.onPieceUp(event, piece), { signal: this.signal });

    return piece;
  }

  shufflePieces() {
    const order = this.pieces.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.pieces.forEach((piece, index) => {
      piece.order = order[index];
    });
  }

  scheduleLayout() {
    cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = null;
      this.layoutPieces();
    });
  }

  layoutPieces() {
    if (!this.root || !this.currentAnimal) return;
    const rootRect = this.root.getBoundingClientRect();
    const boardRect = this.board.getBoundingClientRect();
    const trayRect = this.tray.getBoundingClientRect();
    if (!boardRect.width || !trayRect.width) return;

    const cols = this.currentAnimal.cols;
    const rows = this.currentAnimal.rows;
    const trayCols = Math.min(3, this.pieces.length);
    const trayRows = Math.ceil(this.pieces.length / trayCols);
    const slotW = trayRect.width / trayCols;
    const slotH = trayRect.height / trayRows;

    this.pieces.forEach((piece) => {
      const { bounds, center } = piece.geometry;
      const target = {
        left: boardRect.left - rootRect.left + (bounds.x / ART_SIZE) * boardRect.width,
        top: boardRect.top - rootRect.top + (bounds.y / ART_SIZE) * boardRect.height,
        width: (bounds.w / ART_SIZE) * boardRect.width,
        height: (bounds.h / ART_SIZE) * boardRect.height,
        centerX: boardRect.left - rootRect.left + (center.x / ART_SIZE) * boardRect.width,
        centerY: boardRect.top - rootRect.top + (center.y / ART_SIZE) * boardRect.height,
      };
      piece.target = target;

      const slotCol = piece.order % trayCols;
      const slotRow = Math.floor(piece.order / trayCols);
      const naturalW = target.width;
      const naturalH = target.height;
      const scale = Math.min(0.74, (slotW * 0.82) / naturalW, (slotH * 0.82) / naturalH);
      const homeW = naturalW * scale;
      const homeH = naturalH * scale;
      piece.home = {
        left: trayRect.left - rootRect.left + slotCol * slotW + (slotW - homeW) / 2,
        top: trayRect.top - rootRect.top + slotRow * slotH + (slotH - homeH) / 2,
        width: homeW,
        height: homeH,
      };

      if (piece.placed) {
        this.positionPiece(piece, target, false);
      } else if (!this.drag || this.drag.piece !== piece) {
        this.positionPiece(piece, piece.home, false);
      }
    });
  }

  positionPiece(piece, box, animate = true) {
    const { element } = piece;
    element.classList.toggle('animal-puzzle-piece--moving', animate);
    element.style.left = `${box.left}px`;
    element.style.top = `${box.top}px`;
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
  }

  onPieceDown(event, piece) {
    if (this.completed || piece.placed || this.drag) return;
    event.preventDefault();
    const rootRect = this.root.getBoundingClientRect();
    const rect = piece.element.getBoundingClientRect();
    piece.element.setPointerCapture?.(event.pointerId);
    piece.element.classList.remove('animal-puzzle-piece--moving');
    piece.element.classList.add('animal-puzzle-piece--dragging');
    this.context.audio.playTap();
    this.drag = {
      piece,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      rootRect,
    };
  }

  onPieceMove(event, piece) {
    if (!this.drag || this.drag.piece !== piece || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const { rootRect, offsetX, offsetY } = this.drag;
    const rect = piece.element.getBoundingClientRect();
    const left = clamp(event.clientX - rootRect.left - offsetX, -rect.width * 0.25, rootRect.width - rect.width * 0.75);
    const top = clamp(event.clientY - rootRect.top - offsetY, 72, rootRect.height - rect.height * 0.55);
    piece.element.style.left = `${left}px`;
    piece.element.style.top = `${top}px`;
  }

  onPieceUp(event, piece) {
    if (!this.drag || this.drag.piece !== piece || this.drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    piece.element.releasePointerCapture?.(event.pointerId);
    piece.element.classList.remove('animal-puzzle-piece--dragging');

    const rootRect = this.root.getBoundingClientRect();
    const rect = piece.element.getBoundingClientRect();
    const centerX = rect.left - rootRect.left + rect.width / 2;
    const centerY = rect.top - rootRect.top + rect.height / 2;
    const distance = Math.hypot(centerX - piece.target.centerX, centerY - piece.target.centerY);
    const snapDistance = Math.max(54, this.board.getBoundingClientRect().width * 0.115);
    this.drag = null;

    if (distance <= snapDistance) {
      this.snapPiece(piece);
    } else {
      piece.element.classList.add('animal-puzzle-piece--wrong');
      this.context.audio.playWrong?.();
      this.positionPiece(piece, piece.home, true);
      window.setTimeout(() => piece.element?.classList.remove('animal-puzzle-piece--wrong'), 360);
    }
  }

  snapPiece(piece) {
    if (piece.placed) return;
    piece.placed = true;
    this.placedCount += 1;
    piece.element.classList.add('animal-puzzle-piece--placed');
    piece.element.setAttribute('aria-disabled', 'true');
    this.positionPiece(piece, piece.target, true);
    this.context.audio.playReveal?.();
    this.refreshText();

    if (this.placedCount >= this.pieces.length) {
      this.finishRound();
    }
  }

  finishRound() {
    if (this.completed) return;
    this.completed = true;
    this.context.audio.playSuccess();
    this.completeImage.classList.add('animal-puzzle-complete-image--show');
    this.pieces.forEach((piece) => piece.element.classList.add('animal-puzzle-piece--finished'));

    window.clearTimeout(this.completeTimer);
    this.completeTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.completePanel.classList.add('animal-puzzle-complete--show');
      this.speakAnimal();
    }, 520);
    this.refreshText();
  }

  speakAnimal() {
    if (!this.currentAnimal) return;
    const name = getAnimalName(this.currentAnimal, this.context.i18n.language);
    this.context.speech.speak(name, this.context.i18n.language);
  }

  refreshText() {
    if (!this.root || !this.currentAnimal) return;
    const lang = this.context.i18n.language === 'en' ? 'en' : 'vi';
    const text = TEXT[lang];
    const name = getAnimalName(this.currentAnimal, lang);
    this.titleEl.textContent = text.title;
    this.nameEl.textContent = name;
    this.instructionEl.textContent = text.instruction;
    this.progressEl.textContent = `🧩 ${text.progress}: ${this.placedCount} / ${this.pieces.length}`;
    this.resetButton.textContent = text.reset;
    this.completeTitle.textContent = text.complete;
    this.completeName.textContent = name;
    this.completeHint.textContent = `🔊 ${text.tapName}`;
    this.nextButton.textContent = text.next;
    this.completeImage.alt = name;
  }

  resize() {
    this.scheduleLayout();
  }

  dispose() {
    cancelAnimationFrame(this.layoutFrame);
    window.clearTimeout(this.completeTimer);
    this.layoutFrame = null;
    this.completeTimer = null;
    this.drag = null;
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
    this.hud?.dispose();
    this.hud = null;
    this.root?.remove();
    this.root = null;
    this.pieces.length = 0;
    super.dispose();
  }
}
