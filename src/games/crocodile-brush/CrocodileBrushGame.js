import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import { BRUSH_CONFIG } from './brushConfig.js';
import './crocodileBrush.css';

const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1);

export class CrocodileBrushGame extends BaseGame {
  constructor(context) {
    super(context);
    this.viewHeight = 10;
    this.viewWidth = 10;
    this.teeth = [];
    this.bubbles = [];
    this.bubbleCursor = 0;
    this.bubbleTravel = 0;
    this.brush = null;
    this.brushWorld = new THREE.Vector2(3.5, -3.35);
    this.lastBrushWorld = this.brushWorld.clone();
    this.brushing = false;
    this.activePointerId = null;
    this.cleanCount = 0;
    this.completed = false;
    this.showComplete = false;
    this.spokeInstruction = false;
    this.ui = {};
    this.hintTimer = null;
    this.completeTimer = null;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdaf5ff);

    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    this.createLights();
    this.createSharedResources();
    this.createCrocodile();
    this.createTeeth();
    this.createBubbles();
    this.createBrush();
    this.createUi();
    this.bindInput();
    this.resize(this.context.viewport.width, this.context.viewport.height);
    this.startNewGame();
  }

  createLights() {
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xa8d8b0, 2.4));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 2.2));
    key.position.set(-3, 6, 8);
    this.scene.add(key);
  }

  createSharedResources() {
    this.geometry = {
      circle: this.track(new THREE.CircleGeometry(1, 48)),
      eye: this.track(new THREE.SphereGeometry(0.45, 20, 14)),
      pupil: this.track(new THREE.SphereGeometry(0.16, 16, 10)),
      tooth: this.track(new THREE.SphereGeometry(0.5, 22, 16)),
      dirt: this.track(new THREE.CircleGeometry(0.28, 18)),
      shine: this.track(new THREE.CircleGeometry(0.11, 12)),
      bubble: this.track(new THREE.RingGeometry(0.075, 0.11, 16)),
    };

    this.material = {
      face: this.track(new THREE.MeshStandardMaterial({ color: 0x70cf7b, roughness: 0.72 })),
      faceLight: this.track(new THREE.MeshStandardMaterial({ color: 0x91df8e, roughness: 0.72 })),
      mouth: this.track(new THREE.MeshStandardMaterial({ color: 0x7e3150, roughness: 0.8 })),
      gum: this.track(new THREE.MeshStandardMaterial({ color: 0xf28b9e, roughness: 0.74 })),
      eye: this.track(new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 0.45 })),
      pupil: this.track(new THREE.MeshBasicMaterial({ color: 0x26334a })),
      nostril: this.track(new THREE.MeshBasicMaterial({ color: 0x315f46 })),
      shine: this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })),
      brushHandle: this.track(new THREE.MeshStandardMaterial({ color: 0x5d9df6, roughness: 0.46 })),
      brushGrip: this.track(new THREE.MeshStandardMaterial({ color: 0x77b8ff, roughness: 0.5 })),
      brushHead: this.track(new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.42 })),
      bristleA: this.track(new THREE.MeshStandardMaterial({ color: 0xff83aa, roughness: 0.6 })),
      bristleB: this.track(new THREE.MeshStandardMaterial({ color: 0x87d8ff, roughness: 0.6 })),
    };
  }

  addEllipse(material, x, y, z, sx, sy) {
    const mesh = this.trackObject(new THREE.Mesh(this.geometry.circle, material));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, 1);
    this.scene.add(mesh);
    return mesh;
  }

  createCrocodile() {
    this.addEllipse(this.material.face, 0, 0.2, -3.2, 5.15, 4.55);
    this.addEllipse(this.material.faceLight, 0, 2.15, -2.8, 4.35, 2.15);
    this.addEllipse(this.material.faceLight, 0, -2.1, -2.8, 4.55, 1.95);

    this.addEllipse(this.material.mouth, 0, -0.05, -1.8, 4.25, 2.75);
    this.addEllipse(this.material.gum, 0, 1.42, -1.25, 3.75, 0.62);
    this.addEllipse(this.material.gum, 0, -1.44, -1.25, 3.75, 0.62);

    [-2.15, 2.15].forEach((x) => {
      const eye = this.trackObject(new THREE.Mesh(this.geometry.eye, this.material.eye));
      eye.position.set(x, 3.22, -0.65);
      eye.scale.set(1.08, 1.08, 0.55);
      this.scene.add(eye);

      const pupil = this.trackObject(new THREE.Mesh(this.geometry.pupil, this.material.pupil));
      pupil.position.set(x, 3.18, -0.08);
      pupil.scale.set(1, 1, 0.5);
      this.scene.add(pupil);
    });

    [-0.48, 0.48].forEach((x) => {
      const nostril = this.trackObject(new THREE.Mesh(this.geometry.pupil, this.material.nostril));
      nostril.position.set(x, 2.45, -0.2);
      nostril.scale.set(0.46, 0.32, 0.28);
      this.scene.add(nostril);
    });
  }

  createTeeth() {
    const count = BRUSH_CONFIG.toothCountPerRow;
    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = THREE.MathUtils.lerp(-3.15, 3.15, t);
        const arch = Math.abs(x) / 3.15;
        const y = row === 0
          ? 1.02 + arch * 0.22
          : -1.05 - arch * 0.2;

        const root = this.trackObject(new THREE.Group());
        root.position.set(x, y, 0.05);
        root.rotation.z = (t - 0.5) * (row === 0 ? -0.11 : 0.11);

        const toothMaterial = this.track(new THREE.MeshStandardMaterial({
          color: 0xfff8de,
          roughness: 0.42,
          emissive: 0xfff4b2,
          emissiveIntensity: 0.02,
        }));
        const body = new THREE.Mesh(this.geometry.tooth, toothMaterial);
        body.scale.set(0.69, 0.92, 0.42);
        body.castShadow = true;
        root.add(body);

        const dirtMaterial = this.track(new THREE.MeshBasicMaterial({
          color: 0x9a633e,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
        }));
        const dirt = new THREE.Mesh(this.geometry.dirt, dirtMaterial);
        const dirtX = ((i % 3) - 1) * 0.09;
        const dirtY = row === 0 ? -0.05 + (i % 2) * 0.09 : 0.02 - (i % 2) * 0.08;
        dirt.position.set(dirtX, dirtY, 0.43);
        dirt.scale.set(0.92 + (i % 2) * 0.18, 0.72 + (i % 3) * 0.1, 1);
        root.add(dirt);

        const shine = new THREE.Mesh(this.geometry.shine, this.material.shine);
        shine.position.set(-0.18, 0.22, 0.46);
        shine.visible = false;
        root.add(shine);

        this.scene.add(root);
        this.teeth.push({
          root,
          body,
          toothMaterial,
          dirt,
          dirtMaterial,
          shine,
          progress: 0,
          cleaned: false,
          sparkleTime: 0,
        });
      }
    }
  }

  createBubbles() {
    for (let i = 0; i < BRUSH_CONFIG.bubblePoolSize; i += 1) {
      const bubbleMaterial = this.track(new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xd7f7ff : 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }));
      const mesh = this.trackObject(new THREE.Mesh(this.geometry.bubble, bubbleMaterial));
      mesh.visible = false;
      mesh.position.z = 1.45;
      this.scene.add(mesh);
      this.bubbles.push({
        mesh,
        material: bubbleMaterial,
        velocity: new THREE.Vector2(),
        life: 0,
        maxLife: 1,
      });
    }
  }

  createBrush() {
    this.brush = this.trackObject(new THREE.Group());
    this.brush.position.set(this.brushWorld.x, this.brushWorld.y, 1.2);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.25, 0.24), this.material.brushHandle);
    handle.position.set(0, -1.22, 0);
    handle.rotation.z = -0.04;
    handle.castShadow = true;
    this.brush.add(handle);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.29), this.material.brushGrip);
    grip.position.set(0, -1.76, 0.02);
    grip.castShadow = true;
    this.brush.add(grip);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.64, 0.2), this.material.brushHead);
    neck.position.set(0, -0.26, 0);
    this.brush.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.38, 0.28), this.material.brushHead);
    head.position.set(0, 0.08, 0);
    head.castShadow = true;
    this.brush.add(head);

    for (let i = 0; i < 6; i += 1) {
      const bristle = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.28 + (i % 2) * 0.05, 0.13),
        i % 2 === 0 ? this.material.bristleA : this.material.bristleB,
      );
      bristle.position.set(-0.37 + i * 0.15, 0.35, 0.03);
      this.brush.add(bristle);
    }

    this.scene.add(this.brush);
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    const root = document.createElement('div');
    root.className = 'croc-brush-ui';

    this.ui.progress = document.createElement('div');
    this.ui.progress.className = 'croc-brush-progress';
    this.ui.progress.setAttribute('aria-live', 'polite');

    this.ui.hint = document.createElement('div');
    this.ui.hint.className = 'croc-brush-hint';

    this.ui.newButton = document.createElement('button');
    this.ui.newButton.type = 'button';
    this.ui.newButton.className = 'croc-brush-reset';
    this.ui.newButton.textContent = '🔄';
    this.ui.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    this.ui.complete = document.createElement('div');
    this.ui.complete.className = 'croc-brush-complete';

    this.ui.completeTitle = document.createElement('div');
    this.ui.completeTitle.className = 'croc-brush-complete__title';
    this.ui.completeStars = document.createElement('div');
    this.ui.completeStars.className = 'croc-brush-complete__stars';
    this.ui.completeStars.textContent = '✨ 🦷 ✨ 🦷 ✨';
    this.ui.completeAgain = document.createElement('button');
    this.ui.completeAgain.type = 'button';
    this.ui.completeAgain.className = 'croc-brush-complete__again';
    this.ui.completeAgain.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });
    this.ui.complete.append(this.ui.completeTitle, this.ui.completeStars, this.ui.completeAgain);

    root.append(this.ui.progress, this.ui.hint, this.ui.newButton, this.ui.complete);
    this.context.uiRoot.append(root);
    this.ui.root = root;

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refreshUi());
  }

  bindInput() {
    const start = (event) => {
      if (this.completed) return;
      this.brushing = true;
      this.activePointerId = event.pointerId;
      this.context.canvas.setPointerCapture?.(event.pointerId);
      this.hideHint();
      const world = this.pointerToWorld(event.clientX, event.clientY);
      this.lastBrushWorld.copy(world);
      this.moveBrush(world, 0);

      if (!this.spokeInstruction) {
        this.spokeInstruction = true;
        this.context.speech.speak(
          this.context.i18n.t('brushInstruction'),
          this.context.i18n.language,
        );
      }
    };

    const move = (event) => {
      if (!this.brushing || event.pointerId !== this.activePointerId || this.completed) return;
      const world = this.pointerToWorld(event.clientX, event.clientY);
      const travel = world.distanceTo(this.lastBrushWorld);
      this.moveBrush(world, travel);
      this.lastBrushWorld.copy(world);
    };

    const end = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.brushing = false;
      this.activePointerId = null;
      this.context.canvas.releasePointerCapture?.(event.pointerId);
    };

    this.context.canvas.addEventListener('pointerdown', start, { signal: this.signal });
    this.context.canvas.addEventListener('pointermove', move, { signal: this.signal });
    this.context.canvas.addEventListener('pointerup', end, { signal: this.signal });
    this.context.canvas.addEventListener('pointercancel', end, { signal: this.signal });
  }

  pointerToWorld(clientX, clientY) {
    const width = Math.max(1, this.context.viewport.width);
    const height = Math.max(1, this.context.viewport.height);
    const nx = THREE.MathUtils.clamp(clientX / width, 0, 1);
    const ny = THREE.MathUtils.clamp(clientY / height, 0, 1);
    return new THREE.Vector2(
      THREE.MathUtils.lerp(this.camera.left, this.camera.right, nx),
      THREE.MathUtils.lerp(this.camera.top, this.camera.bottom, ny),
    );
  }

  moveBrush(world, travel) {
    this.brushWorld.set(
      THREE.MathUtils.clamp(world.x, this.camera.left + 0.55, this.camera.right - 0.55),
      THREE.MathUtils.clamp(world.y, this.camera.bottom + 0.8, this.camera.top - 0.65),
    );
    this.brush.position.x = this.brushWorld.x;
    this.brush.position.y = this.brushWorld.y;

    const dx = this.brushWorld.x - this.lastBrushWorld.x;
    const targetTilt = THREE.MathUtils.clamp(-dx * 1.8, -0.5, 0.5);
    this.brush.rotation.z = THREE.MathUtils.lerp(this.brush.rotation.z, targetTilt, 0.42);

    if (this.brushing && travel > 0.004) this.brushTeeth(travel);
  }

  brushTeeth(travel) {
    let touched = false;
    const cleanDelta = Math.min(0.12, travel / BRUSH_CONFIG.cleanTravel + 0.003);

    this.teeth.forEach((tooth) => {
      if (tooth.cleaned) return;
      const distance = Math.hypot(
        tooth.root.position.x - this.brushWorld.x,
        tooth.root.position.y - this.brushWorld.y,
      );
      if (distance > BRUSH_CONFIG.brushRadius) return;

      touched = true;
      tooth.progress = clamp01(tooth.progress + cleanDelta);
      tooth.dirtMaterial.opacity = 0.86 * (1 - tooth.progress);
      tooth.toothMaterial.emissiveIntensity = 0.03 + tooth.progress * 0.2;

      if (tooth.progress >= 1) this.finishTooth(tooth);
    });

    if (!touched) return;

    this.bubbleTravel += travel;
    while (this.bubbleTravel >= 0.16) {
      this.bubbleTravel -= 0.16;
      this.spawnBubble();
    }
  }

  finishTooth(tooth) {
    if (tooth.cleaned) return;
    tooth.cleaned = true;
    tooth.progress = 1;
    tooth.dirt.visible = false;
    tooth.shine.visible = true;
    tooth.sparkleTime = 0.9;
    tooth.toothMaterial.color.setHex(0xffffff);
    tooth.toothMaterial.emissive.setHex(0xfff6c9);
    tooth.toothMaterial.emissiveIntensity = 0.42;
    this.cleanCount += 1;

    if (this.cleanCount >= this.teeth.length) {
      this.completeGame();
    } else {
      this.context.audio.playReveal();
      this.refreshUi();
    }
  }

  completeGame() {
    if (this.completed) return;
    this.completed = true;
    this.brushing = false;
    this.activePointerId = null;
    this.context.audio.playSuccess();
    this.context.speech.speak(
      this.context.i18n.t('brushComplete'),
      this.context.i18n.language,
    );
    this.refreshUi();

    window.clearTimeout(this.completeTimer);
    this.completeTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.showComplete = true;
      this.refreshUi();
    }, BRUSH_CONFIG.completionDelayMs);
  }

  spawnBubble() {
    const bubble = this.bubbles[this.bubbleCursor % this.bubbles.length];
    this.bubbleCursor += 1;
    bubble.maxLife = 0.65 + Math.random() * 0.55;
    bubble.life = bubble.maxLife;
    bubble.velocity.set((Math.random() - 0.5) * 0.6, 0.55 + Math.random() * 0.7);
    bubble.mesh.position.set(
      this.brushWorld.x + (Math.random() - 0.5) * 0.8,
      this.brushWorld.y + (Math.random() - 0.5) * 0.35,
      1.5,
    );
    const scale = 0.72 + Math.random() * 0.9;
    bubble.mesh.scale.setScalar(scale);
    bubble.material.opacity = 0.82;
    bubble.mesh.visible = true;
  }

  update(delta) {
    this.bubbles.forEach((bubble) => {
      if (!bubble.mesh.visible) return;
      bubble.life -= delta;
      if (bubble.life <= 0) {
        bubble.mesh.visible = false;
        bubble.material.opacity = 0;
        return;
      }

      bubble.mesh.position.x += bubble.velocity.x * delta;
      bubble.mesh.position.y += bubble.velocity.y * delta;
      const lifeRatio = bubble.life / bubble.maxLife;
      bubble.material.opacity = Math.min(0.9, lifeRatio * 0.9);
      const grow = 1 + (1 - lifeRatio) * 0.55;
      bubble.mesh.scale.multiplyScalar(1 + delta * 0.35 * grow);
    });

    this.teeth.forEach((tooth) => {
      if (tooth.sparkleTime <= 0) return;
      tooth.sparkleTime = Math.max(0, tooth.sparkleTime - delta);
      const pulse = 1 + Math.sin((0.9 - tooth.sparkleTime) * 18) * 0.28;
      tooth.shine.scale.setScalar(pulse);
      if (tooth.sparkleTime === 0) tooth.shine.scale.setScalar(1);
    });
  }

  startNewGame() {
    this.completed = false;
    this.showComplete = false;
    this.cleanCount = 0;
    this.brushing = false;
    this.activePointerId = null;
    this.bubbleTravel = 0;
    this.spokeInstruction = false;
    window.clearTimeout(this.completeTimer);
    this.completeTimer = null;

    this.teeth.forEach((tooth) => {
      tooth.progress = 0;
      tooth.cleaned = false;
      tooth.sparkleTime = 0;
      tooth.dirt.visible = true;
      tooth.dirtMaterial.opacity = 0.86;
      tooth.shine.visible = false;
      tooth.shine.scale.setScalar(1);
      tooth.toothMaterial.color.setHex(0xfff8de);
      tooth.toothMaterial.emissive.setHex(0xfff4b2);
      tooth.toothMaterial.emissiveIntensity = 0.02;
    });

    this.bubbles.forEach((bubble) => {
      bubble.life = 0;
      bubble.mesh.visible = false;
      bubble.material.opacity = 0;
    });

    this.brushWorld.set(3.5, -3.35);
    this.lastBrushWorld.copy(this.brushWorld);
    this.brush.position.set(this.brushWorld.x, this.brushWorld.y, 1.2);
    this.brush.rotation.z = -0.28;
    this.showHint();
    this.refreshUi();
  }

  showHint() {
    window.clearTimeout(this.hintTimer);
    this.ui.hint?.classList.remove('croc-brush-hint--hidden');
    this.hintTimer = window.setTimeout(() => this.hideHint(), BRUSH_CONFIG.hintDurationMs);
  }

  hideHint() {
    this.ui.hint?.classList.add('croc-brush-hint--hidden');
  }

  refreshUi() {
    if (!this.ui.root) return;
    const { i18n } = this.context;
    this.ui.progress.textContent = `🦷 ${i18n.t('brushProgress')}: ${this.cleanCount} / ${this.teeth.length}`;
    this.ui.hint.textContent = i18n.t('brushHint');
    this.ui.newButton.setAttribute('aria-label', i18n.t('brushNewGame'));
    this.ui.newButton.title = i18n.t('brushNewGame');
    this.ui.completeTitle.textContent = i18n.t('brushCompleteTitle');
    this.ui.completeAgain.textContent = i18n.t('brushNewGame');
    this.ui.complete.classList.toggle('croc-brush-complete--show', this.showComplete);
  }

  resize(width, height) {
    if (!this.camera) return;
    const aspect = Math.max(0.45, width / Math.max(height, 1));
    const halfHeight = this.viewHeight / 2;
    const halfWidth = halfHeight * aspect;
    this.viewWidth = halfWidth * 2;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.clearTimeout(this.hintTimer);
    window.clearTimeout(this.completeTimer);
    this.hintTimer = null;
    this.completeTimer = null;
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
    this.hud?.dispose();
    this.ui.root?.remove();
    this.ui = {};
    this.teeth.length = 0;
    this.bubbles.length = 0;
    super.dispose();
  }
}
