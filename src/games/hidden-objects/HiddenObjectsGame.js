import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import { createToyModel } from '../archaeology/modelFactory.js';
import { HIDDEN_OBJECTS, HIDDEN_OBJECTS_CONFIG } from './hiddenObjectsConfig.js';
import './hiddenObjects.css';

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class HiddenObjectsGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.objects = [];
    this.clickTargets = [];
    this.targetOrder = [];
    this.currentTarget = null;
    this.targetIndex = 0;
    this.foundCount = 0;
    this.completed = false;
    this.inputLocked = false;
    this.pointerDown = null;
    this.ui = {};
    this.unsubscribeLanguage = null;
    this.nextTimer = null;
    this.promptTimer = null;
    this.toastTimer = null;
    this.elapsed = 0;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdff3ff);

    this.camera = new THREE.OrthographicCamera(-5, 5, 3.5, -3.5, 0.1, 100);
    this.camera.position.set(0, 0.2, 10);
    this.camera.lookAt(0, 0.1, 0);

    this.createLights();
    this.createRoomResources();
    this.createRoom();
    this.createHiddenObjects();
    this.createUi();
    this.bindInput();
    this.resize(this.context.viewport.width, this.context.viewport.height);
    this.startNewGame();
  }

  createLights() {
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xc3b5d9, 2.3));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 2.6));
    key.position.set(-4, 7, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const warm = this.track(new THREE.PointLight(0xffd8aa, 11, 15, 2));
    warm.position.set(3.2, 2.2, 4.5);
    this.scene.add(warm);
  }

  createRoomResources() {
    this.geometry = {
      box: this.track(new THREE.BoxGeometry(1, 1, 1)),
      circle: this.track(new THREE.CircleGeometry(1, 28)),
      ring: this.track(new THREE.RingGeometry(0.48, 0.58, 32)),
      hit: this.track(new THREE.SphereGeometry(0.58, 10, 8)),
    };

    const standard = (color, roughness = 0.72) => this.track(new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.01,
    }));

    this.material = {
      wall: standard(0xf3e8ff, 0.86),
      floor: standard(0xe3c799, 0.82),
      trim: standard(0xffffff, 0.68),
      window: standard(0xbde9ff, 0.35),
      curtain: standard(0xffa9c7, 0.72),
      bed: standard(0xa68be2, 0.72),
      mattress: standard(0xfff8ef, 0.84),
      pillow: standard(0xffd6e4, 0.8),
      wood: standard(0xc78d5c, 0.78),
      woodDark: standard(0x9f6c48, 0.82),
      shelf: standard(0x85b8d8, 0.76),
      rug: standard(0x9edecb, 0.9),
      chest: standard(0xffba6c, 0.78),
      picture: standard(0xffe17d, 0.74),
      plant: standard(0x6fc384, 0.78),
      pot: standard(0xee8f79, 0.8),
      halo: this.track(new THREE.MeshBasicMaterial({
        color: 0x6bd99d,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      })),
      hit: this.track(new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })),
    };
  }

  addBox(scale, material, position, rotation = [0, 0, 0]) {
    const mesh = this.trackObject(new THREE.Mesh(this.geometry.box, material));
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  createRoom() {
    // Back wall and floor.
    this.addBox([9.4, 6.1, 0.22], this.material.wall, [0, 0.35, -1.2]);
    this.addBox([9.4, 1.55, 1.8], this.material.floor, [0, -2.55, -0.48]);
    this.addBox([9.4, 0.13, 0.16], this.material.trim, [0, -1.76, -0.9]);

    // Window and curtains on the left wall.
    this.addBox([2.15, 1.55, 0.08], this.material.window, [-2.8, 1.55, -1.02]);
    this.addBox([2.35, 0.12, 0.12], this.material.trim, [-2.8, 2.34, -0.92]);
    this.addBox([2.35, 0.12, 0.12], this.material.trim, [-2.8, 0.76, -0.92]);
    this.addBox([0.12, 1.68, 0.12], this.material.trim, [-3.93, 1.55, -0.92]);
    this.addBox([0.12, 1.68, 0.12], this.material.trim, [-1.67, 1.55, -0.92]);
    this.addBox([0.1, 1.62, 0.12], this.material.trim, [-2.8, 1.55, -0.9]);
    this.addBox([0.54, 1.9, 0.16], this.material.curtain, [-4.02, 1.52, -0.78]);
    this.addBox([0.54, 1.9, 0.16], this.material.curtain, [-1.58, 1.52, -0.78]);

    // Bed on the left.
    this.addBox([2.45, 0.62, 1.25], this.material.bed, [-3.12, -1.5, -0.18]);
    this.addBox([2.3, 0.32, 1.08], this.material.mattress, [-3.12, -1.12, -0.05]);
    this.addBox([0.72, 0.24, 0.78], this.material.pillow, [-3.76, -0.88, 0.12], [0, 0, -0.08]);
    this.addBox([0.2, 1.45, 1.28], this.material.bed, [-4.28, -0.98, -0.24]);

    // Central table for fruit and small toys.
    this.addBox([2.55, 0.2, 1.02], this.material.wood, [0.92, -0.62, -0.05]);
    [-0.05, 1.86].forEach((x) => {
      this.addBox([0.18, 1.18, 0.22], this.material.woodDark, [x, -1.3, -0.2]);
    });

    // Floating shelves.
    this.addBox([1.8, 0.13, 0.48], this.material.shelf, [-0.05, 0.94, -0.48]);
    this.addBox([2.25, 0.13, 0.48], this.material.shelf, [1.15, 0.38, -0.48]);

    // Bookcase on the right.
    this.addBox([1.62, 3.1, 0.62], this.material.shelf, [3.35, 0.35, -0.48]);
    this.addBox([1.35, 2.72, 0.67], this.material.wall, [3.35, 0.35, -0.1]);
    [1.62, 0.65, -0.35].forEach((y) => {
      this.addBox([1.4, 0.12, 0.72], this.material.shelf, [3.35, y, 0]);
    });

    // Toy chest and rug.
    this.addBox([1.55, 0.82, 1.05], this.material.chest, [3.28, -1.72, -0.08]);
    this.addBox([1.62, 0.16, 1.12], this.material.woodDark, [3.28, -1.24, -0.02], [0, 0, -0.05]);
    this.addBox([4.15, 0.08, 1.55], this.material.rug, [-0.55, -2.22, 0.28]);

    // Small decorative picture and plant, not clickable.
    this.addBox([1.05, 0.82, 0.08], this.material.trim, [0.52, 2.05, -0.85]);
    this.addBox([0.83, 0.62, 0.09], this.material.picture, [0.52, 2.05, -0.79]);
    this.addBox([0.55, 0.5, 0.52], this.material.pot, [2.12, -1.58, 0.1]);
    this.addBox([0.18, 0.82, 0.16], this.material.plant, [2.02, -0.92, 0.05], [0, 0, -0.25]);
    this.addBox([0.18, 0.82, 0.16], this.material.plant, [2.28, -0.92, 0.05], [0, 0, 0.25]);
  }

  createHiddenObjects() {
    HIDDEN_OBJECTS.forEach((definition) => {
      const root = this.trackObject(createToyModel(definition.id));
      root.rotation.y = definition.rotationY;
      root.updateMatrixWorld(true);

      const initialBounds = new THREE.Box3().setFromObject(root);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const fitScale = definition.size / Math.max(initialSize.x, initialSize.y, 0.001);
      root.scale.setScalar(fitScale);
      root.updateMatrixWorld(true);

      const fittedBounds = new THREE.Box3().setFromObject(root);
      const center = fittedBounds.getCenter(new THREE.Vector3());
      const [x, y, z] = definition.position;
      root.position.set(x - center.x, y - center.y, z - center.z);
      root.updateMatrixWorld(true);
      this.scene.add(root);

      const halo = this.trackObject(new THREE.Mesh(this.geometry.ring, this.material.halo));
      halo.position.set(x, y, z - 0.18);
      halo.scale.setScalar(Math.max(0.82, definition.size * 1.05));
      halo.visible = false;
      this.scene.add(halo);

      const hit = this.trackObject(new THREE.Mesh(this.geometry.hit, this.material.hit));
      hit.position.set(x, y, z + 0.12);
      hit.scale.setScalar(Math.max(0.78, definition.size * 0.98));
      hit.userData.hiddenObjectId = definition.id;
      this.scene.add(hit);
      this.clickTargets.push(hit);

      this.objects.push({
        ...definition,
        root,
        halo,
        hit,
        found: false,
        feedbackKind: null,
        feedbackTime: 0,
        baseScale: fitScale,
        homePosition: root.position.clone(),
        homeRotation: root.rotation.clone(),
      });
    });
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    const root = document.createElement('div');
    root.className = 'hidden-objects-ui';

    const prompt = document.createElement('div');
    prompt.className = 'hidden-prompt';

    this.ui.clue = document.createElement('div');
    this.ui.clue.className = 'hidden-prompt__clue';

    this.ui.score = document.createElement('div');
    this.ui.score.className = 'hidden-prompt__score';

    this.ui.repeatButton = document.createElement('button');
    this.ui.repeatButton.type = 'button';
    this.ui.repeatButton.className = 'hidden-prompt__repeat';
    this.ui.repeatButton.textContent = '🔊';
    this.ui.repeatButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.speakPrompt();
    }, { signal: this.signal });

    prompt.append(this.ui.clue, this.ui.score, this.ui.repeatButton);

    this.ui.toast = document.createElement('div');
    this.ui.toast.className = 'hidden-toast';
    this.ui.toast.setAttribute('aria-live', 'polite');

    this.ui.newButton = document.createElement('button');
    this.ui.newButton.type = 'button';
    this.ui.newButton.className = 'hidden-reset';
    this.ui.newButton.textContent = '🔄';
    this.ui.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    this.ui.complete = document.createElement('div');
    this.ui.complete.className = 'hidden-complete';

    this.ui.completeTitle = document.createElement('div');
    this.ui.completeTitle.className = 'hidden-complete__title';

    this.ui.completeObjects = document.createElement('div');
    this.ui.completeObjects.className = 'hidden-complete__objects';
    this.ui.completeObjects.textContent = HIDDEN_OBJECTS.map((item) => item.icon).join(' ');

    this.ui.completeButton = document.createElement('button');
    this.ui.completeButton.type = 'button';
    this.ui.completeButton.className = 'hidden-complete__button';
    this.ui.completeButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    this.ui.complete.append(this.ui.completeTitle, this.ui.completeObjects, this.ui.completeButton);
    root.append(prompt, this.ui.toast, this.ui.newButton, this.ui.complete);
    this.context.uiRoot.append(root);
    this.ui.root = root;

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => {
      this.refreshUi();
      if (!this.completed && this.currentTarget) this.schedulePromptSpeech(80);
    });
  }

  bindInput() {
    this.context.canvas.addEventListener('pointerdown', (event) => {
      if (this.completed || this.inputLocked) return;
      this.pointerDown = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    }, { signal: this.signal });

    const finish = (event) => {
      if (!this.pointerDown || event.pointerId !== this.pointerDown.id) return;
      const distance = Math.hypot(
        event.clientX - this.pointerDown.x,
        event.clientY - this.pointerDown.y,
      );
      this.pointerDown = null;
      if (distance > HIDDEN_OBJECTS_CONFIG.tapMoveThresholdPx) return;
      this.handleTap(event.clientX, event.clientY);
    };

    this.context.canvas.addEventListener('pointerup', finish, { signal: this.signal });
    this.context.canvas.addEventListener('pointercancel', () => {
      this.pointerDown = null;
    }, { signal: this.signal });
  }

  handleTap(clientX, clientY) {
    if (this.completed || this.inputLocked || !this.currentTarget) return;

    const rect = this.context.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObjects(this.clickTargets, false)[0];
    if (!hit) return;

    const object = this.objects.find((item) => item.id === hit.object.userData.hiddenObjectId);
    if (!object) return;

    if (object.id === this.currentTarget.id) {
      this.handleCorrect(object);
    } else {
      this.handleWrong(object);
    }
  }

  handleCorrect(object) {
    if (object.found) return;
    object.found = true;
    object.feedbackKind = 'success';
    object.feedbackTime = HIDDEN_OBJECTS_CONFIG.successAnimationSeconds;
    object.halo.visible = true;
    this.foundCount += 1;
    this.inputLocked = true;
    this.context.audio.playSuccess();

    const name = this.context.i18n.t(object.labelKey);
    this.showToast(`✅ ${this.context.i18n.t('hiddenFound')} ${object.icon} ${name}`, 'success');
    this.refreshUi();

    window.clearTimeout(this.nextTimer);
    if (this.foundCount >= this.objects.length) {
      this.nextTimer = window.setTimeout(() => this.finishGame(), 780);
      return;
    }

    this.nextTimer = window.setTimeout(() => {
      this.targetIndex += 1;
      this.currentTarget = this.targetOrder[this.targetIndex];
      this.inputLocked = false;
      this.refreshUi();
      this.schedulePromptSpeech();
    }, HIDDEN_OBJECTS_CONFIG.nextTargetDelayMs);
  }

  handleWrong(object) {
    object.feedbackKind = 'wrong';
    object.feedbackTime = HIDDEN_OBJECTS_CONFIG.wrongAnimationSeconds;
    this.context.audio.playWrong();
    this.showToast(`👀 ${this.context.i18n.t('hiddenWrong')}`, 'wrong');
  }

  showToast(text, kind) {
    if (!this.ui.toast) return;
    window.clearTimeout(this.toastTimer);
    this.ui.toast.textContent = text;
    this.ui.toast.classList.remove('hidden-toast--success', 'hidden-toast--wrong', 'hidden-toast--show');
    this.ui.toast.classList.add(`hidden-toast--${kind}`);
    requestAnimationFrame(() => this.ui.toast?.classList.add('hidden-toast--show'));
    this.toastTimer = window.setTimeout(() => {
      this.ui.toast?.classList.remove('hidden-toast--show');
    }, 1250);
  }

  promptText() {
    if (!this.currentTarget) return '';
    return `${this.context.i18n.t('hiddenFind')} ${this.context.i18n.t(this.currentTarget.labelKey)}`;
  }

  speakPrompt() {
    const text = this.promptText();
    if (!text) return;
    this.context.speech.speak(text, this.context.i18n.language);
  }

  schedulePromptSpeech(delay = HIDDEN_OBJECTS_CONFIG.promptDelayMs) {
    window.clearTimeout(this.promptTimer);
    this.promptTimer = window.setTimeout(() => this.speakPrompt(), delay);
  }

  startNewGame() {
    window.clearTimeout(this.nextTimer);
    window.clearTimeout(this.promptTimer);
    window.clearTimeout(this.toastTimer);
    this.nextTimer = null;
    this.promptTimer = null;
    this.toastTimer = null;

    this.targetOrder = shuffle(this.objects);
    this.targetIndex = 0;
    this.currentTarget = this.targetOrder[0] ?? null;
    this.foundCount = 0;
    this.completed = false;
    this.inputLocked = false;
    this.pointerDown = null;

    this.objects.forEach((object) => {
      object.found = false;
      object.feedbackKind = null;
      object.feedbackTime = 0;
      object.root.position.copy(object.homePosition);
      object.root.rotation.copy(object.homeRotation);
      object.root.scale.setScalar(object.baseScale);
      object.halo.visible = false;
      object.hit.visible = true;
    });

    this.ui.toast?.classList.remove('hidden-toast--show');
    this.ui.complete?.classList.remove('hidden-complete--show');
    this.refreshUi();
    this.schedulePromptSpeech();
  }

  finishGame() {
    this.completed = true;
    this.inputLocked = true;
    this.currentTarget = null;
    this.context.audio.playReveal();
    this.context.audio.playSuccess();
    this.refreshUi();
    this.ui.complete?.classList.add('hidden-complete--show');
    this.context.speech.speak(
      this.context.i18n.t('hiddenComplete'),
      this.context.i18n.language,
    );
  }

  refreshUi() {
    if (!this.ui.root) return;

    if (this.currentTarget && !this.completed) {
      const name = this.context.i18n.t(this.currentTarget.labelKey);
      this.ui.clue.textContent = `🔎 ${this.context.i18n.t('hiddenFind')} ${this.currentTarget.icon} ${name}`;
    } else {
      this.ui.clue.textContent = `🎉 ${this.context.i18n.t('hiddenCompleteTitle')}`;
    }

    this.ui.score.textContent = `${this.context.i18n.t('hiddenScore')}: ${this.foundCount} / ${this.objects.length}`;
    this.ui.repeatButton.title = this.context.i18n.t('hiddenRepeat');
    this.ui.repeatButton.setAttribute('aria-label', this.context.i18n.t('hiddenRepeat'));
    this.ui.repeatButton.disabled = !this.context.speech.available || this.completed;

    this.ui.newButton.title = this.context.i18n.t('hiddenNewGame');
    this.ui.newButton.setAttribute('aria-label', this.context.i18n.t('hiddenNewGame'));

    this.ui.completeTitle.textContent = this.context.i18n.t('hiddenCompleteTitle');
    this.ui.completeButton.textContent = this.context.i18n.t('hiddenNewGame');
  }

  update(delta) {
    this.elapsed += delta;

    this.objects.forEach((object, index) => {
      if (object.feedbackTime > 0) {
        object.feedbackTime = Math.max(0, object.feedbackTime - delta);

        if (object.feedbackKind === 'success') {
          const duration = HIDDEN_OBJECTS_CONFIG.successAnimationSeconds;
          const progress = 1 - object.feedbackTime / duration;
          const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.12 * (1 - progress * 0.55);
          object.root.scale.setScalar(object.baseScale * pulse);
        } else if (object.feedbackKind === 'wrong') {
          const duration = HIDDEN_OBJECTS_CONFIG.wrongAnimationSeconds;
          const progress = 1 - object.feedbackTime / duration;
          object.root.position.x = object.homePosition.x + Math.sin(progress * Math.PI * 7) * 0.09;
        }

        if (object.feedbackTime === 0) {
          object.root.scale.setScalar(object.baseScale);
          object.root.position.copy(object.homePosition);
          object.feedbackKind = null;
        }
      }

      if (object.found && object.halo.visible) {
        const pulse = 1 + Math.sin(this.elapsed * 4.5 + index * 0.7) * 0.05;
        object.halo.scale.setScalar(Math.max(0.82, object.size * 1.05) * pulse);
      }
    });
  }

  resize(width, height) {
    if (!this.camera) return;
    const aspect = Math.max(0.42, width / Math.max(height, 1));

    if (aspect < 1) {
      const halfWidth = 4.65;
      const halfHeight = halfWidth / aspect;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
      this.camera.top = halfHeight;
      this.camera.bottom = -halfHeight;
    } else {
      const halfHeight = HIDDEN_OBJECTS_CONFIG.roomViewHeight / 2;
      const halfWidth = halfHeight * aspect;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
      this.camera.top = halfHeight;
      this.camera.bottom = -halfHeight;
    }

    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.clearTimeout(this.nextTimer);
    window.clearTimeout(this.promptTimer);
    window.clearTimeout(this.toastTimer);
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
    this.hud?.dispose();
    this.ui.root?.remove();
    this.ui = {};
    this.objects.length = 0;
    this.clickTargets.length = 0;
    this.targetOrder.length = 0;
    this.currentTarget = null;
    super.dispose();
  }
}
