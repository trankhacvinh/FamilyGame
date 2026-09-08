import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import {
  FALLING_TYPES,
  FRUIT_CATCH_CONFIG,
  FRUIT_TYPES,
} from './fruitCatchConfig.js';
import './fruitCatch.css';

const GAME_STATE = Object.freeze({
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
});

const TEXT_KEYS = Object.freeze({
  score: 'fruitScore',
  speed: 'fruitSpeed',
  newGame: 'fruitNewGame',
  gameOver: 'fruitGameOver',
  finalScore: 'fruitFinalScore',
  worm: 'worm',
  heartBack: 'fruitHeartBack',
});

export class FruitCatchGame extends BaseGame {
  constructor(context) {
    super(context);
    this.viewHeight = 10;
    this.viewWidth = 10;
    this.basket = null;
    this.basketHitMeshes = [];
    this.fallingItems = [];
    this.spawnTimer = 0;
    this.lastSpawnType = null;
    this.draggingBasket = false;
    this.activePointerId = null;
    this.speedMultiplier = this.readStoredSpeed();
    this.gameState = GAME_STATE.PLAYING;

    this.score = 0;
    this.hearts = FRUIT_CATCH_CONFIG.maxHearts;
    this.nextHealScore = FRUIT_CATCH_CONFIG.healEveryPoints;
    this.counts = {
      [FALLING_TYPES.APPLE]: 0,
      [FALLING_TYPES.BANANA]: 0,
      [FALLING_TYPES.STRAWBERRY]: 0,
    };

    this.ui = {};
    this.unsubscribeLanguage = null;
    this.noticeTimer = null;
  }

  readStoredSpeed() {
    const stored = Number.parseInt(localStorage.getItem('familygame-fruit-speed') ?? '1', 10);
    return FRUIT_CATCH_CONFIG.speedOptions.includes(stored) ? stored : 1;
  }

  text(key) {
    return this.context.i18n.t(TEXT_KEYS[key] ?? key);
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xccecff);

    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    this.createLights();
    this.createBackground();
    this.createSharedResources();
    this.createBasket();
    this.createUi();
    this.bindInput();
    this.resize(this.context.viewport.width, this.context.viewport.height);
    this.startNewGame();
  }

  createLights() {
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xb8d3a7, 2.3));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 2.7));
    key.position.set(-3, 7, 10);
    key.castShadow = true;
    this.scene.add(key);
  }

  createBackground() {
    const grass = this.trackObject(new THREE.Mesh(
      new THREE.PlaneGeometry(30, 2.1),
      new THREE.MeshBasicMaterial({ color: 0xbde4a1 }),
    ));
    grass.position.set(0, -4.45, -2.2);
    this.scene.add(grass);

    const sun = this.trackObject(new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe28a }),
    ));
    sun.position.set(3.7, 3.7, -2.4);
    this.scene.add(sun);

    const cloudMaterial = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const cloudGeometry = this.track(new THREE.SphereGeometry(0.5, 14, 10));
    const cloudPositions = [
      [-3.4, 3.35, 1], [-3.0, 3.55, 1.25], [-2.55, 3.32, 0.9],
      [1.5, 2.65, 0.85], [1.9, 2.85, 1.15], [2.3, 2.65, 0.82],
    ];
    cloudPositions.forEach(([x, y, scale]) => {
      const puff = this.trackObject(new THREE.Mesh(cloudGeometry, cloudMaterial));
      puff.position.set(x, y, -2.3);
      puff.scale.set(scale * 1.25, scale * 0.72, 1);
      this.scene.add(puff);
    });
  }

  createSharedResources() {
    this.geometry = {
      sphere: this.track(new THREE.SphereGeometry(0.4, 18, 14)),
      smallSphere: this.track(new THREE.SphereGeometry(0.12, 12, 8)),
      appleStem: this.track(new THREE.CylinderGeometry(0.055, 0.065, 0.28, 8)),
      banana: this.track(new THREE.TorusGeometry(0.34, 0.11, 9, 22, Math.PI * 1.25)),
      strawberry: this.track(new THREE.ConeGeometry(0.34, 0.72, 16)),
      leaf: this.track(new THREE.ConeGeometry(0.22, 0.2, 7)),
      wormSegment: this.track(new THREE.SphereGeometry(0.18, 12, 9)),
      basketRim: this.track(new THREE.BoxGeometry(2.85, 0.22, 0.5)),
      basketHit: this.track(new THREE.BoxGeometry(3.25, 1.75, 0.85)),
    };

    const basketShape = new THREE.Shape();
    basketShape.moveTo(-1.33, 0.46);
    basketShape.lineTo(1.33, 0.46);
    basketShape.lineTo(0.96, -0.66);
    basketShape.lineTo(-0.96, -0.66);
    basketShape.closePath();
    this.geometry.basketBody = this.track(new THREE.ExtrudeGeometry(basketShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.06,
      bevelThickness: 0.05,
      curveSegments: 1,
    }));
    this.geometry.basketBody.center();
    this.geometry.basketHandle = this.track(new THREE.TorusGeometry(0.92, 0.07, 8, 28, Math.PI));

    this.material = {
      apple: this.track(new THREE.MeshStandardMaterial({ color: 0xf0525b, roughness: 0.62 })),
      banana: this.track(new THREE.MeshStandardMaterial({ color: 0xffd84d, roughness: 0.66 })),
      strawberry: this.track(new THREE.MeshStandardMaterial({ color: 0xf65d6e, roughness: 0.64 })),
      leaf: this.track(new THREE.MeshStandardMaterial({ color: 0x5ab96a, roughness: 0.74 })),
      stem: this.track(new THREE.MeshStandardMaterial({ color: 0x72513d, roughness: 0.8 })),
      worm: this.track(new THREE.MeshStandardMaterial({ color: 0x7dc95a, roughness: 0.7 })),
      wormHead: this.track(new THREE.MeshStandardMaterial({ color: 0x9bda63, roughness: 0.68 })),
      eye: this.track(new THREE.MeshBasicMaterial({ color: 0x273046 })),
      basket: this.track(new THREE.MeshStandardMaterial({ color: 0xd59b55, roughness: 0.76 })),
      basketDark: this.track(new THREE.MeshStandardMaterial({ color: 0xad733d, roughness: 0.8 })),
      invisible: this.track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })),
    };
  }

  createBasket() {
    this.basket = this.trackObject(new THREE.Group());
    this.basket.position.set(0, -3.82, 0.9);

    const body = new THREE.Mesh(this.geometry.basketBody, this.material.basket);
    body.castShadow = true;
    body.receiveShadow = true;
    this.basket.add(body);

    const rim = new THREE.Mesh(this.geometry.basketRim, this.material.basketDark);
    rim.position.set(0, 0.46, 0.02);
    rim.castShadow = true;
    this.basket.add(rim);

    const handle = new THREE.Mesh(this.geometry.basketHandle, this.material.basketDark);
    handle.position.set(0, 0.45, -0.04);
    this.basket.add(handle);

    const hitTarget = new THREE.Mesh(this.geometry.basketHit, this.material.invisible);
    hitTarget.position.y = 0.12;
    hitTarget.userData.basketHit = true;
    this.basket.add(hitTarget);
    this.basketHitMeshes = [hitTarget];

    this.scene.add(this.basket);
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    const root = document.createElement('div');
    root.className = 'fruit-catch-ui';

    const scoreboard = document.createElement('div');
    scoreboard.className = 'fruit-scoreboard';

    this.ui.hearts = document.createElement('div');
    this.ui.hearts.className = 'fruit-scoreboard__hearts';
    this.ui.score = this.createScoreItem();
    this.ui.apple = this.createScoreItem();
    this.ui.banana = this.createScoreItem();
    this.ui.strawberry = this.createScoreItem();
    scoreboard.append(this.ui.hearts, this.ui.score, this.ui.apple, this.ui.banana, this.ui.strawberry);

    const controls = document.createElement('div');
    controls.className = 'fruit-controls';

    const speedControl = document.createElement('div');
    speedControl.className = 'fruit-speed-control';
    this.ui.speedLabel = document.createElement('span');
    this.ui.speedLabel.className = 'fruit-speed-label';
    speedControl.append(this.ui.speedLabel);
    this.ui.speedButtons = new Map();

    FRUIT_CATCH_CONFIG.speedOptions.forEach((speed) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fruit-speed-button';
      button.textContent = `${speed}x`;
      button.addEventListener('click', () => this.setSpeed(speed), { signal: this.signal });
      speedControl.append(button);
      this.ui.speedButtons.set(speed, button);
    });

    this.ui.newButton = document.createElement('button');
    this.ui.newButton.type = 'button';
    this.ui.newButton.className = 'fruit-new-button';
    this.ui.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    controls.append(speedControl, this.ui.newButton);

    this.ui.notice = document.createElement('div');
    this.ui.notice.className = 'fruit-notice';

    this.ui.gameOver = document.createElement('section');
    this.ui.gameOver.className = 'fruit-game-over';
    this.ui.gameOver.hidden = true;
    this.ui.gameOverTitle = document.createElement('h2');
    this.ui.gameOverTitle.className = 'fruit-game-over__title';
    this.ui.gameOverScore = document.createElement('p');
    this.ui.gameOverScore.className = 'fruit-game-over__score';
    this.ui.gameOverButton = document.createElement('button');
    this.ui.gameOverButton.type = 'button';
    this.ui.gameOverButton.className = 'fruit-game-over__button';
    this.ui.gameOverButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });
    this.ui.gameOver.append(this.ui.gameOverTitle, this.ui.gameOverScore, this.ui.gameOverButton);

    root.append(scoreboard, controls, this.ui.notice, this.ui.gameOver);
    this.context.uiRoot.append(root);
    this.ui.root = root;

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refreshUi());
    this.refreshUi();
  }

  createScoreItem() {
    const item = document.createElement('div');
    item.className = 'fruit-scoreboard__item';
    return item;
  }

  bindInput() {
    this.context.canvas.addEventListener('pointerdown', (event) => {
      if (this.gameState !== GAME_STATE.PLAYING) return;
      const hit = this.pickBasket(event);
      if (!hit) return;
      this.draggingBasket = true;
      this.activePointerId = event.pointerId;
      this.context.canvas.setPointerCapture?.(event.pointerId);
      this.moveBasketToPointer(event);
    }, { signal: this.signal });

    this.context.canvas.addEventListener('pointermove', (event) => {
      if (!this.draggingBasket || event.pointerId !== this.activePointerId) return;
      this.moveBasketToPointer(event);
    }, { signal: this.signal });

    const stopDrag = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.draggingBasket = false;
      if (this.context.canvas.hasPointerCapture?.(event.pointerId)) {
        this.context.canvas.releasePointerCapture(event.pointerId);
      }
      this.activePointerId = null;
    };
    this.context.canvas.addEventListener('pointerup', stopDrag, { signal: this.signal });
    this.context.canvas.addEventListener('pointercancel', stopDrag, { signal: this.signal });
  }

  pickBasket(event) {
    const pointer = this.pointerFromEvent(event);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    return raycaster.intersectObjects(this.basketHitMeshes, false)[0] ?? null;
  }

  pointerFromEvent(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  moveBasketToPointer(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    const ratio = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const worldX = THREE.MathUtils.lerp(this.camera.left, this.camera.right, ratio);
    const maxX = Math.max(0, this.viewWidth / 2 - 1.55);
    this.basket.position.x = THREE.MathUtils.clamp(worldX, -maxX, maxX);
  }

  setSpeed(speed) {
    if (!FRUIT_CATCH_CONFIG.speedOptions.includes(speed)) return;
    this.speedMultiplier = speed;
    localStorage.setItem('familygame-fruit-speed', String(speed));
    this.context.audio.playTap();
    this.refreshUi();
  }

  startNewGame() {
    this.clearFallingItems();
    this.context.speech.cancel?.();
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = null;

    this.gameState = GAME_STATE.PLAYING;
    this.score = 0;
    this.hearts = FRUIT_CATCH_CONFIG.maxHearts;
    this.nextHealScore = FRUIT_CATCH_CONFIG.healEveryPoints;
    this.counts[FALLING_TYPES.APPLE] = 0;
    this.counts[FALLING_TYPES.BANANA] = 0;
    this.counts[FALLING_TYPES.STRAWBERRY] = 0;
    this.spawnTimer = FRUIT_CATCH_CONFIG.firstSpawnDelay;
    this.lastSpawnType = null;
    this.draggingBasket = false;
    this.activePointerId = null;
    this.basket.position.x = 0;
    this.ui.gameOver.hidden = true;
    this.hideNotice();
    this.refreshUi();
  }

  chooseSpawnType() {
    if (this.lastSpawnType !== FALLING_TYPES.WORM && Math.random() < FRUIT_CATCH_CONFIG.wormChance) {
      return FALLING_TYPES.WORM;
    }
    return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  }

  spawnItem() {
    if (this.fallingItems.length >= FRUIT_CATCH_CONFIG.maxActiveItems) return;
    const type = this.chooseSpawnType();
    const root = this.createFallingModel(type);
    const margin = 0.72;
    const x = THREE.MathUtils.randFloat(
      this.camera.left + margin,
      this.camera.right - margin,
    );
    root.position.set(x, this.camera.top + 0.7, 0.9);
    root.rotation.z = THREE.MathUtils.randFloatSpread(0.35);
    this.scene.add(root);

    this.fallingItems.push({
      root,
      type,
      speed: FRUIT_CATCH_CONFIG.baseFallSpeed
        + THREE.MathUtils.randFloatSpread(FRUIT_CATCH_CONFIG.fallSpeedVariance),
      spin: THREE.MathUtils.randFloat(-0.8, 0.8),
    });
    this.lastSpawnType = type;
  }

  createFallingModel(type) {
    const group = new THREE.Group();

    if (type === FALLING_TYPES.APPLE) {
      const fruit = new THREE.Mesh(this.geometry.sphere, this.material.apple);
      fruit.scale.set(1, 0.95, 0.9);
      const stem = new THREE.Mesh(this.geometry.appleStem, this.material.stem);
      stem.position.y = 0.42;
      stem.rotation.z = -0.18;
      group.add(fruit, stem);
    } else if (type === FALLING_TYPES.BANANA) {
      const banana = new THREE.Mesh(this.geometry.banana, this.material.banana);
      banana.rotation.z = -0.9;
      banana.scale.set(1.15, 1.15, 1.05);
      group.add(banana);
    } else if (type === FALLING_TYPES.STRAWBERRY) {
      const berry = new THREE.Mesh(this.geometry.strawberry, this.material.strawberry);
      berry.rotation.x = Math.PI;
      berry.position.y = -0.02;
      const leaf = new THREE.Mesh(this.geometry.leaf, this.material.leaf);
      leaf.position.y = 0.38;
      group.add(berry, leaf);
    } else {
      for (let i = 0; i < 5; i += 1) {
        const segment = new THREE.Mesh(
          this.geometry.wormSegment,
          i === 4 ? this.material.wormHead : this.material.worm,
        );
        segment.position.set((i - 2) * 0.22, Math.sin(i * 1.1) * 0.09, 0);
        group.add(segment);
      }
      const eyeLeft = new THREE.Mesh(this.geometry.smallSphere, this.material.eye);
      const eyeRight = new THREE.Mesh(this.geometry.smallSphere, this.material.eye);
      eyeLeft.scale.setScalar(0.32);
      eyeRight.scale.setScalar(0.32);
      eyeLeft.position.set(0.47, 0.09, 0.16);
      eyeRight.position.set(0.47, -0.03, 0.16);
      group.add(eyeLeft, eyeRight);
      group.scale.setScalar(1.15);
    }

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return group;
  }

  update(delta, elapsed) {
    if (this.gameState !== GAME_STATE.PLAYING) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnItem();
      this.spawnTimer = THREE.MathUtils.randFloat(
        FRUIT_CATCH_CONFIG.spawnDelayMin,
        FRUIT_CATCH_CONFIG.spawnDelayMax,
      );
    }

    const catchY = this.basket.position.y + 0.62;
    const missY = this.camera.bottom - 1.0;

    for (let index = this.fallingItems.length - 1; index >= 0; index -= 1) {
      const item = this.fallingItems[index];
      const previousY = item.root.position.y;
      item.root.position.y -= item.speed * this.speedMultiplier * delta;
      item.root.rotation.z += item.spin * delta * Math.sqrt(this.speedMultiplier);
      item.root.rotation.y += delta * 0.45;

      const crossedBasket = previousY > catchY && item.root.position.y <= catchY;
      if (crossedBasket && this.isInsideBasket(item.root.position.x)) {
        this.catchItem(index, item);
        continue;
      }

      if (item.root.position.y < missY) {
        this.removeFallingItem(index);
      }
    }

    if (this.basket) {
      this.basket.rotation.y = Math.sin(elapsed * 1.8) * 0.018;
    }
  }

  isInsideBasket(itemX) {
    return Math.abs(itemX - this.basket.position.x) <= 1.45;
  }

  catchItem(index, item) {
    const type = item.type;
    this.removeFallingItem(index);

    if (type === FALLING_TYPES.WORM) {
      this.hearts = Math.max(0, this.hearts - 1);
      this.context.audio.playWrong?.();
      this.context.speech.speak(this.text('worm'), this.context.i18n.language);
      this.showNotice('🐛 -1 ❤️');
      this.refreshUi();
      if (this.hearts <= 0) this.endGame();
      return;
    }

    this.score += FRUIT_CATCH_CONFIG.quizlessScorePerFruit;
    this.counts[type] += 1;
    this.context.audio.playTap();
    this.context.speech.speak(this.context.i18n.t(type), this.context.i18n.language);
    this.showNotice(`${this.iconForType(type)} +1`);

    if (this.score >= this.nextHealScore) {
      if (this.hearts < FRUIT_CATCH_CONFIG.maxHearts) {
        this.hearts += 1;
        this.context.audio.playSuccess();
        this.showNotice(`+❤️ ${this.text('heartBack')}`);
      }
      this.nextHealScore += FRUIT_CATCH_CONFIG.healEveryPoints;
    }

    this.refreshUi();
  }

  iconForType(type) {
    if (type === FALLING_TYPES.APPLE) return '🍎';
    if (type === FALLING_TYPES.BANANA) return '🍌';
    if (type === FALLING_TYPES.STRAWBERRY) return '🍓';
    return '🐛';
  }

  removeFallingItem(index) {
    const [item] = this.fallingItems.splice(index, 1);
    item?.root?.removeFromParent();
  }

  clearFallingItems() {
    this.fallingItems.forEach((item) => item.root.removeFromParent());
    this.fallingItems.length = 0;
  }

  showNotice(text) {
    window.clearTimeout(this.noticeTimer);
    this.ui.notice.textContent = text;
    this.ui.notice.classList.add('fruit-notice--show');
    this.noticeTimer = window.setTimeout(() => this.hideNotice(), 850);
  }

  hideNotice() {
    this.ui.notice?.classList.remove('fruit-notice--show');
  }

  endGame() {
    this.gameState = GAME_STATE.GAME_OVER;
    this.draggingBasket = false;
    this.activePointerId = null;
    this.context.audio.playWrong?.();
    this.context.speech.cancel?.();
    this.clearFallingItems();
    this.ui.gameOver.hidden = false;
    this.refreshUi();
  }

  refreshUi() {
    if (!this.ui.root) return;
    const fullHeart = '❤️';
    const emptyHeart = '🤍';
    this.ui.hearts.textContent = Array.from(
      { length: FRUIT_CATCH_CONFIG.maxHearts },
      (_, index) => index < this.hearts ? fullHeart : emptyHeart,
    ).join(' ');
    this.ui.score.textContent = `⭐ ${this.text('score')}: ${this.score}`;
    this.ui.apple.textContent = `🍎 ${this.counts[FALLING_TYPES.APPLE]}`;
    this.ui.banana.textContent = `🍌 ${this.counts[FALLING_TYPES.BANANA]}`;
    this.ui.strawberry.textContent = `🍓 ${this.counts[FALLING_TYPES.STRAWBERRY]}`;
    this.ui.speedLabel.textContent = `${this.text('speed')}:`;
    this.ui.newButton.textContent = this.text('newGame');
    this.ui.gameOverTitle.textContent = this.text('gameOver');
    this.ui.gameOverScore.textContent = `${this.text('finalScore')}: ${this.score}`;
    this.ui.gameOverButton.textContent = this.text('newGame');

    this.ui.speedButtons.forEach((button, speed) => {
      const active = speed === this.speedMultiplier;
      button.classList.toggle('fruit-speed-button--active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  resize(width, height) {
    if (!this.camera) return;
    const aspect = Math.max(0.45, width / Math.max(height, 1));
    this.viewWidth = this.viewHeight * aspect;
    this.camera.left = -this.viewWidth / 2;
    this.camera.right = this.viewWidth / 2;
    this.camera.top = this.viewHeight / 2;
    this.camera.bottom = -this.viewHeight / 2;
    this.camera.updateProjectionMatrix();

    if (this.basket) {
      const maxX = Math.max(0, this.viewWidth / 2 - 1.55);
      this.basket.position.x = THREE.MathUtils.clamp(this.basket.position.x, -maxX, maxX);
    }
  }

  dispose() {
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    this.unsubscribeLanguage?.();
    this.hud?.dispose();
    this.clearFallingItems();
    this.ui.root?.remove();
    this.context.speech.cancel?.();
    super.dispose();
    this.basketHitMeshes.length = 0;
    this.ui = {};
  }
}
