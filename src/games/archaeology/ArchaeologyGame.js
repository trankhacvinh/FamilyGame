import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import {
  ARCHAEOLOGY_CONFIG,
  getRandomItem,
  makeAnswerOptions,
} from './archaeologyCatalog.js';
import { createToyModel } from './modelFactory.js';
import './archaeology.css';

const PHASE = Object.freeze({
  BREAKING: 'BREAKING',
  CHOOSING: 'CHOOSING',
  SOLVED: 'SOLVED',
});

export class ArchaeologyGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.projectPoint = new THREE.Vector3();

    this.phase = PHASE.BREAKING;
    this.hitCount = 0;
    this.requiredHits = 6;
    this.currentItem = null;
    this.answerOptions = [];
    this.answerSlots = [];
    this.answerLabels = [];
    this.dynamicModels = [];
    this.debris = [];
    this.fireworks = [];

    this.rockShakeTime = 0;
    this.splitProgress = 0;
    this.solvedTime = 0;
    this.wrongTime = 0;
    this.wrongSlotIndex = -1;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffedcf);

    const aspect = this.context.viewport.width / this.context.viewport.height;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    this.setCameraForViewport(this.context.viewport.width, this.context.viewport.height);

    this.createLights();
    this.createStage();
    this.createRock();
    this.createAnswerSlots();
    this.createParticleResources();
    this.createUi();
    this.bindInput();
    this.startNewRound();
  }

  createLights() {
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xe6b678, 2.2));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 3.2));
    key.position.set(4, 7, 8);
    key.castShadow = true;
    this.scene.add(key);

    const fill = this.track(new THREE.DirectionalLight(0xffc78a, 1.4));
    fill.position.set(-5, 2, 5);
    this.scene.add(fill);
  }

  createStage() {
    this.stage = this.trackObject(new THREE.Mesh(
      new THREE.CylinderGeometry(4.7, 5.1, 0.5, 48),
      new THREE.MeshStandardMaterial({ color: 0xe4b77f, roughness: 0.75 }),
    ));
    this.stage.position.set(0, -0.78, -0.5);
    this.stage.scale.z = 0.7;
    this.stage.receiveShadow = true;
    this.scene.add(this.stage);

    const backGlow = this.trackObject(new THREE.Mesh(
      new THREE.CircleGeometry(4.1, 64),
      new THREE.MeshBasicMaterial({ color: 0xfff7df, transparent: true, opacity: 0.7 }),
    ));
    backGlow.position.set(0, 1.1, -2.1);
    this.scene.add(backGlow);
  }

  /** Tạo BoxGeometry và làm méo vertex để khối đá trông gồ ghề thay vì là hộp vuông. */
  createDeformedRockGeometry() {
    const geometry = new THREE.BoxGeometry(3.55, 3.0, 2.65, 5, 5, 5);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const wobble = 1
        + Math.sin(x * 2.9 + y * 3.7 + z * 2.2) * 0.07
        + Math.sin(i * 1.83) * 0.045;
      position.setXYZ(i, x * wobble, y * wobble, z * wobble);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  createRock() {
    this.rockRoot = this.trackObject(new THREE.Group());
    this.rockRoot.position.set(0, 1.1, 0);
    this.scene.add(this.rockRoot);

    this.rockMaterial = this.track(new THREE.MeshStandardMaterial({
      color: 0x8c8177,
      roughness: 0.94,
      metalness: 0,
    }));

    this.rockShell = this.trackObject(new THREE.Mesh(
      this.createDeformedRockGeometry(),
      this.rockMaterial,
    ));
    this.rockShell.castShadow = true;
    this.rockShell.receiveShadow = true;
    this.rockShell.userData.rockHit = true;
    this.rockRoot.add(this.rockShell);

    this.rockHitMeshes = [this.rockShell];
    const bumpPositions = [
      [-1.45, 0.45, 0.72, 0.48], [1.38, 0.58, 0.48, 0.42],
      [-1.05, -1.1, 0.65, 0.4], [1.18, -1.05, 0.55, 0.52],
      [-0.38, 1.34, 0.58, 0.43], [0.65, 1.26, 0.2, 0.34],
      [1.55, -0.2, 0.15, 0.35], [-1.55, -0.3, 0.05, 0.33],
    ];

    bumpPositions.forEach(([x, y, z, radius], index) => {
      const bump = this.trackObject(new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius, 1),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0x82776e : 0x978b80,
          roughness: 0.96,
        }),
      ));
      bump.position.set(x, y, z);
      bump.scale.set(1.1, 0.78, 0.72);
      bump.castShadow = true;
      bump.userData.rockHit = true;
      this.rockRoot.add(bump);
      this.rockHitMeshes.push(bump);
    });

    this.createCracks();
    this.createRockHalves();
  }

  createCracks() {
    this.cracks = [];
    const crackPaths = [
      [[0.1, 0.85], [-0.15, 0.48], [0.12, 0.15], [-0.3, -0.22]],
      [[0.15, 0.48], [0.55, 0.2], [0.85, -0.2]],
      [[-0.15, 0.47], [-0.58, 0.25], [-0.88, -0.08]],
      [[-0.28, -0.2], [-0.05, -0.55], [-0.36, -0.95]],
      [[-0.02, -0.55], [0.38, -0.74], [0.68, -1.06]],
      [[0.53, 0.2], [0.48, 0.65], [0.77, 0.95]],
      [[-0.58, 0.24], [-0.72, 0.68], [-1.05, 0.92]],
    ];

    crackPaths.forEach((path) => {
      const points = path.map(([x, y]) => new THREE.Vector3(x, y, 1.42));
      const crack = this.trackObject(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x403b39, transparent: true, opacity: 0.92 }),
      ));
      crack.visible = false;
      this.rockRoot.add(crack);
      this.cracks.push(crack);
    });
  }

  createRockHalves() {
    const halfMaterialLeft = this.track(new THREE.MeshStandardMaterial({
      color: 0x887d74,
      roughness: 0.96,
      transparent: true,
    }));
    const halfMaterialRight = this.track(new THREE.MeshStandardMaterial({
      color: 0x94877d,
      roughness: 0.96,
      transparent: true,
    }));

    this.rockHalfLeft = this.trackObject(new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.38, 1),
      halfMaterialLeft,
    ));
    this.rockHalfRight = this.trackObject(new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.38, 1),
      halfMaterialRight,
    ));

    [this.rockHalfLeft, this.rockHalfRight].forEach((half) => {
      half.visible = false;
      half.castShadow = true;
      half.scale.set(0.9, 1.2, 0.82);
      this.scene.add(half);
    });
  }

  createAnswerSlots() {
    this.answerSlots = [];

    for (let index = 0; index < 3; index += 1) {
      const slot = this.trackObject(new THREE.Group());
      slot.userData.answerIndex = index;
      slot.userData.baseX = 0;
      slot.visible = false;

      const border = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 1.75, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
      );
      border.position.z = -0.24;
      border.userData.answerIndex = index;
      slot.add(border);

      const card = new THREE.Mesh(
        new THREE.BoxGeometry(2.18, 1.58, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xfff7e1, roughness: 0.62 }),
      );
      card.position.z = -0.08;
      card.userData.answerIndex = index;
      slot.userData.card = card;
      slot.add(card);

      this.answerSlots.push(slot);
      this.scene.add(slot);
    }
  }

  createParticleResources() {
    this.debrisGeometry = this.track(new THREE.IcosahedronGeometry(0.11, 0));
    this.debrisMaterial = this.track(new THREE.MeshStandardMaterial({ color: 0x857a71, roughness: 0.98 }));
    this.dustGeometry = this.track(new THREE.SphereGeometry(0.055, 8, 6));
    this.dustMaterial = this.track(new THREE.MeshBasicMaterial({ color: 0xd7c0a7, transparent: true, opacity: 0.75 }));

    this.fireworkGeometry = this.track(new THREE.SphereGeometry(0.065, 8, 6));
    this.fireworkMaterials = [0xff6f91, 0xffcf5c, 0x69d8a0, 0x74a5ff, 0xc98cff]
      .map((color) => this.track(new THREE.MeshBasicMaterial({ color })));
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    this.progress = document.createElement('div');
    this.progress.className = 'arch-progress';
    this.context.uiRoot.append(this.progress);

    this.question = document.createElement('div');
    this.question.className = 'arch-question';
    this.question.hidden = true;
    this.context.uiRoot.append(this.question);

    this.feedback = document.createElement('div');
    this.feedback.className = 'arch-feedback';
    this.feedback.hidden = true;
    this.context.uiRoot.append(this.feedback);

    this.newButton = document.createElement('button');
    this.newButton.type = 'button';
    this.newButton.className = 'arch-new-button';
    this.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewRound();
    }, { signal: this.signal });
    this.context.uiRoot.append(this.newButton);

    this.answerLabels = this.answerSlots.map(() => {
      const label = document.createElement('div');
      label.className = 'arch-answer-label';
      label.hidden = true;
      this.context.uiRoot.append(label);
      return label;
    });

    const refresh = () => this.refreshLanguage();
    this.unsubscribeLanguage = this.context.i18n.subscribe(refresh);
    refresh();
  }

  refreshLanguage() {
    this.newButton.textContent = this.context.i18n.t('archNew');
    this.question.textContent = this.context.i18n.t('archQuestion');
    this.refreshProgress();

    this.answerOptions.forEach((item, index) => {
      const label = this.answerLabels[index];
      if (label) label.textContent = this.context.i18n.t(item.nameKey);
    });

    if (this.phase === PHASE.SOLVED && this.currentItem) {
      this.feedback.textContent = `${this.context.i18n.t('archCorrect')} ${this.context.i18n.t(this.currentItem.nameKey)} 🎉`;
    }
  }

  refreshProgress() {
    if (!this.progress) return;
    this.progress.textContent = this.phase === PHASE.BREAKING
      ? `${this.context.i18n.t('archHitRock')} ${this.hitCount}/${this.requiredHits}`
      : this.context.i18n.t(this.phase === PHASE.CHOOSING ? 'archChoose' : 'archSolved');
  }

  bindInput() {
    this.context.canvas.addEventListener('pointerdown', (event) => {
      this.updatePointer(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.phase === PHASE.BREAKING) {
        const hit = this.raycaster.intersectObjects(this.rockHitMeshes.filter((mesh) => mesh.visible), false)[0];
        if (hit) this.hitRock(hit.point);
        return;
      }

      if (this.phase === PHASE.CHOOSING) {
        const clickable = [];
        this.answerSlots.forEach((slot) => {
          if (!slot.visible) return;
          slot.traverse((child) => child.isMesh && clickable.push(child));
        });
        const hit = this.raycaster.intersectObjects(clickable, false)[0];
        const answerIndex = hit?.object?.userData?.answerIndex;
        if (Number.isInteger(answerIndex)) this.chooseAnswer(answerIndex);
        return;
      }

      if (this.phase === PHASE.SOLVED && this.secretModel) {
        const meshes = [];
        this.secretModel.traverse((child) => child.isMesh && meshes.push(child));
        if (this.raycaster.intersectObjects(meshes, false)[0]) {
          this.context.speech.speak(
            this.context.i18n.t(this.currentItem.nameKey),
            this.context.i18n.language,
          );
        }
      }
    }, { signal: this.signal });
  }

  updatePointer(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  hitRock(point) {
    if (this.phase !== PHASE.BREAKING) return;

    this.hitCount += 1;
    this.rockShakeTime = 0.24;
    const scale = Math.max(0.74, 1 - this.hitCount * 0.038);
    this.rockRoot.scale.setScalar(scale);

    const visibleCracks = Math.min(this.cracks.length, this.hitCount + 1);
    this.cracks.forEach((crack, index) => { crack.visible = index < visibleCracks; });

    this.spawnRockParticles(point, 12);
    this.context.audio.playCrack?.();
    this.refreshProgress();

    if (this.hitCount >= this.requiredHits) {
      this.revealQuestion();
    }
  }

  revealQuestion() {
    this.phase = PHASE.CHOOSING;
    this.splitProgress = 0;
    this.rockRoot.visible = false;

    this.rockHalfLeft.visible = true;
    this.rockHalfRight.visible = true;
    this.rockHalfLeft.position.set(-0.2, 1.1, 0);
    this.rockHalfRight.position.set(0.2, 1.1, 0);
    this.rockHalfLeft.rotation.set(0.1, 0.15, 0.06);
    this.rockHalfRight.rotation.set(-0.08, -0.12, -0.05);
    this.rockHalfLeft.material.opacity = 1;
    this.rockHalfRight.material.opacity = 1;

    this.secretModel.visible = true;
    this.secretModel.scale.setScalar(0.15);
    this.secretModel.position.set(0, 1.05, 0.35);

    this.answerSlots.forEach((slot) => { slot.visible = true; });
    this.answerLabels.forEach((label) => { label.hidden = false; });
    this.question.hidden = false;
    this.feedback.hidden = true;
    this.context.audio.playReveal?.();
    this.refreshProgress();

    this.context.speech.speak(
      this.context.i18n.t('archQuestion'),
      this.context.i18n.language,
    );
  }

  chooseAnswer(index) {
    const item = this.answerOptions[index];
    if (!item) return;

    this.context.speech.speak(
      this.context.i18n.t(item.nameKey),
      this.context.i18n.language,
    );

    if (item.id === this.currentItem.id) {
      this.solveRound(index);
    } else {
      this.wrongSlotIndex = index;
      this.wrongTime = 0.55;
      this.context.audio.playWrong?.();
      this.feedback.textContent = this.context.i18n.t('archWrong');
      this.feedback.classList.remove('arch-feedback--success');
      this.feedback.classList.add('arch-feedback--wrong');
      this.feedback.hidden = false;
    }
  }

  solveRound(index) {
    this.phase = PHASE.SOLVED;
    this.solvedTime = 0;
    this.question.hidden = true;
    this.feedback.textContent = `${this.context.i18n.t('archCorrect')} ${this.context.i18n.t(this.currentItem.nameKey)} 🎉`;
    this.feedback.classList.remove('arch-feedback--wrong');
    this.feedback.classList.add('arch-feedback--success');
    this.feedback.hidden = false;

    this.answerSlots.forEach((slot, slotIndex) => {
      const card = slot.userData.card;
      if (!card) return;
      card.material.color.set(slotIndex === index ? 0xbff2ca : 0xfff7e1);
    });

    this.spawnRockParticles(new THREE.Vector3(0, 1.0, 0.8), 34);
    this.spawnFireworks(new THREE.Vector3(0, 1.2, 1.0));
    this.context.audio.playSuccess();
    this.refreshProgress();

    this.context.speech.speak([
      this.context.i18n.t('archCorrect'),
      this.context.i18n.t(this.currentItem.nameKey),
    ], this.context.i18n.language);
  }

  startNewRound() {
    this.disposeRoundModels();
    this.clearTransientParticles();

    const previousId = this.currentItem?.id ?? null;
    this.currentItem = getRandomItem(previousId);
    this.answerOptions = makeAnswerOptions(this.currentItem);
    this.requiredHits = THREE.MathUtils.randInt(ARCHAEOLOGY_CONFIG.minHits, ARCHAEOLOGY_CONFIG.maxHits);
    this.hitCount = 0;
    this.phase = PHASE.BREAKING;
    this.rockShakeTime = 0;
    this.splitProgress = 0;
    this.solvedTime = 0;
    this.wrongTime = 0;
    this.wrongSlotIndex = -1;

    this.rockRoot.visible = true;
    this.rockRoot.position.set(0, 1.1, 0);
    this.rockRoot.rotation.set(0, 0, 0);
    this.rockRoot.scale.setScalar(1);
    this.cracks.forEach((crack) => { crack.visible = false; });
    this.rockHalfLeft.visible = false;
    this.rockHalfRight.visible = false;

    this.secretModel = createToyModel(this.currentItem.id);
    this.secretModel.visible = false;
    this.secretModel.scale.setScalar(0.15);
    this.scene.add(this.secretModel);
    this.dynamicModels.push(this.secretModel);

    this.answerOptions.forEach((item, index) => {
      const preview = createToyModel(item.id);
      preview.scale.setScalar(0.47);
      preview.position.set(0, 0.12, 0.32);
      preview.userData.answerIndex = index;
      preview.traverse((child) => { child.userData.answerIndex = index; });
      this.answerSlots[index].add(preview);
      this.answerSlots[index].userData.preview = preview;
      this.dynamicModels.push(preview);
      this.answerSlots[index].visible = false;
      this.answerSlots[index].rotation.set(0, 0, 0);
      this.answerSlots[index].userData.card.material.color.set(0xfff7e1);
      this.answerLabels[index].textContent = this.context.i18n.t(item.nameKey);
      this.answerLabels[index].hidden = true;
    });

    this.feedback.hidden = true;
    this.question.hidden = true;
    this.refreshLanguage();
    this.layoutAnswerSlots(this.context.viewport.width, this.context.viewport.height);
  }

  spawnRockParticles(origin, count) {
    for (let i = 0; i < count; i += 1) {
      const isDust = i % 3 === 0;
      const mesh = new THREE.Mesh(
        isDust ? this.dustGeometry : this.debrisGeometry,
        isDust ? this.dustMaterial : this.debrisMaterial,
      );
      mesh.position.copy(origin);
      mesh.position.x += THREE.MathUtils.randFloatSpread(0.35);
      mesh.position.y += THREE.MathUtils.randFloatSpread(0.28);
      mesh.position.z += THREE.MathUtils.randFloatSpread(0.25);
      mesh.scale.setScalar(isDust ? THREE.MathUtils.randFloat(0.8, 1.7) : THREE.MathUtils.randFloat(0.7, 1.4));
      mesh.userData.velocity = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(3.3),
        THREE.MathUtils.randFloat(1.1, 3.5),
        THREE.MathUtils.randFloat(0.2, 2.5),
      );
      mesh.userData.life = THREE.MathUtils.randFloat(0.65, 1.15);
      mesh.userData.spin = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(5),
        THREE.MathUtils.randFloatSpread(5),
        THREE.MathUtils.randFloatSpread(5),
      );
      this.debris.push(mesh);
      this.scene.add(mesh);
    }
  }

  spawnFireworks(origin) {
    for (let i = 0; i < 64; i += 1) {
      const material = this.fireworkMaterials[i % this.fireworkMaterials.length];
      const particle = new THREE.Mesh(this.fireworkGeometry, material);
      particle.position.copy(origin);
      const angle = Math.random() * Math.PI * 2;
      const speed = THREE.MathUtils.randFloat(2.0, 5.6);
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        THREE.MathUtils.randFloat(1.4, 5.0),
        Math.sin(angle) * speed * 0.45,
      );
      particle.userData.life = THREE.MathUtils.randFloat(1.0, 1.8);
      this.fireworks.push(particle);
      this.scene.add(particle);
    }
  }

  update(delta, elapsed) {
    this.updateRock(delta, elapsed);
    this.updateReveal(delta);
    this.updateSolved(delta);
    this.updateWrongAnswer(delta, elapsed);
    this.updateAnswerPreviews(delta);
    this.updateParticles(delta);
    this.updateAnswerLabelPositions();
  }

  updateRock(delta, elapsed) {
    if (this.phase !== PHASE.BREAKING || !this.rockRoot.visible) return;

    this.rockRoot.rotation.y = Math.sin(elapsed * 0.7) * 0.025;

    if (this.rockShakeTime > 0) {
      this.rockShakeTime = Math.max(0, this.rockShakeTime - delta);
      const strength = this.rockShakeTime / 0.24;
      this.rockRoot.position.x = Math.sin(elapsed * 72) * 0.09 * strength;
      this.rockRoot.rotation.z = Math.sin(elapsed * 86) * 0.035 * strength;
    } else {
      this.rockRoot.position.x = THREE.MathUtils.lerp(this.rockRoot.position.x, 0, 0.16);
      this.rockRoot.rotation.z = THREE.MathUtils.lerp(this.rockRoot.rotation.z, 0, 0.16);
    }
  }

  updateReveal(delta) {
    if (this.phase !== PHASE.CHOOSING) return;

    this.splitProgress = Math.min(1, this.splitProgress + delta * 1.9);
    const eased = 1 - Math.pow(1 - this.splitProgress, 3);
    this.rockHalfLeft.position.x = THREE.MathUtils.lerp(-0.2, -1.48, eased);
    this.rockHalfRight.position.x = THREE.MathUtils.lerp(0.2, 1.48, eased);
    this.rockHalfLeft.rotation.z = eased * 0.42;
    this.rockHalfRight.rotation.z = -eased * 0.42;
    const secretScale = THREE.MathUtils.lerp(0.15, 0.92, eased);
    this.secretModel.scale.setScalar(secretScale);
    this.secretModel.rotation.y += delta * 0.8;
  }

  updateSolved(delta) {
    if (this.phase !== PHASE.SOLVED) return;
    this.solvedTime += delta;

    const fly = Math.min(1, this.solvedTime / 1.0);
    this.rockHalfLeft.visible = true;
    this.rockHalfRight.visible = true;
    this.rockHalfLeft.position.x = THREE.MathUtils.lerp(-1.48, -5.5, fly);
    this.rockHalfRight.position.x = THREE.MathUtils.lerp(1.48, 5.5, fly);
    this.rockHalfLeft.position.y = THREE.MathUtils.lerp(1.1, -1.8, fly);
    this.rockHalfRight.position.y = THREE.MathUtils.lerp(1.1, -1.8, fly);
    this.rockHalfLeft.rotation.z += delta * 1.8;
    this.rockHalfRight.rotation.z -= delta * 1.8;
    this.rockHalfLeft.material.opacity = 1 - fly * 0.9;
    this.rockHalfRight.material.opacity = 1 - fly * 0.9;

    const targetScale = 1.18 + Math.sin(this.solvedTime * 5) * 0.035;
    const current = this.secretModel.scale.x;
    const next = THREE.MathUtils.lerp(current, targetScale, 1 - Math.pow(0.002, delta));
    this.secretModel.scale.setScalar(next);
    this.secretModel.rotation.y += delta * 1.8;
  }

  updateWrongAnswer(delta, elapsed) {
    if (this.wrongTime <= 0 || this.wrongSlotIndex < 0) return;
    this.wrongTime = Math.max(0, this.wrongTime - delta);
    const slot = this.answerSlots[this.wrongSlotIndex];
    slot.rotation.z = Math.sin(elapsed * 58) * 0.08 * (this.wrongTime / 0.55);
    slot.userData.card.material.color.set(0xffb8b8);

    if (this.wrongTime <= 0) {
      slot.rotation.z = 0;
      slot.userData.card.material.color.set(0xfff7e1);
      this.wrongSlotIndex = -1;
      if (this.phase === PHASE.CHOOSING) this.feedback.hidden = true;
    }
  }

  updateAnswerPreviews(delta) {
    this.answerSlots.forEach((slot) => {
      const preview = slot.userData.preview;
      if (slot.visible && preview) preview.rotation.y += delta * 0.75;
    });
  }

  updateParticles(delta) {
    for (let i = this.debris.length - 1; i >= 0; i -= 1) {
      const item = this.debris[i];
      item.userData.life -= delta;
      item.userData.velocity.y -= delta * 4.4;
      item.position.addScaledVector(item.userData.velocity, delta);
      item.rotation.x += item.userData.spin.x * delta;
      item.rotation.y += item.userData.spin.y * delta;
      item.rotation.z += item.userData.spin.z * delta;
      item.scale.multiplyScalar(Math.max(0.93, 1 - delta * 1.2));
      if (item.userData.life <= 0) {
        item.removeFromParent();
        this.debris.splice(i, 1);
      }
    }

    for (let i = this.fireworks.length - 1; i >= 0; i -= 1) {
      const item = this.fireworks[i];
      item.userData.life -= delta;
      item.userData.velocity.y -= delta * 2.2;
      item.position.addScaledVector(item.userData.velocity, delta);
      item.scale.multiplyScalar(Math.max(0.94, 1 - delta * 0.8));
      if (item.userData.life <= 0) {
        item.removeFromParent();
        this.fireworks.splice(i, 1);
      }
    }
  }

  updateAnswerLabelPositions() {
    if (!this.camera) return;

    this.answerSlots.forEach((slot, index) => {
      const label = this.answerLabels[index];
      if (!label || label.hidden || !slot.visible) return;

      slot.getWorldPosition(this.projectPoint);
      this.projectPoint.y -= 1.0;
      this.projectPoint.project(this.camera);
      const x = (this.projectPoint.x * 0.5 + 0.5) * this.context.viewport.width;
      const y = (-this.projectPoint.y * 0.5 + 0.5) * this.context.viewport.height;
      label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  }

  layoutAnswerSlots(width, height) {
    const aspect = width / height;
    const portrait = aspect < 0.8;
    const gap = portrait ? 2.15 : aspect < 1.15 ? 2.7 : 3.35;
    const y = portrait ? -2.7 : -2.55;
    const scale = portrait ? 0.82 : aspect < 1.15 ? 0.9 : 1;

    [-gap, 0, gap].forEach((x, index) => {
      const slot = this.answerSlots[index];
      slot.position.set(x, y, 0);
      slot.userData.baseX = x;
      slot.scale.setScalar(scale);
    });
  }

  setCameraForViewport(width, height) {
    const aspect = width / height;
    if (aspect < 0.72) {
      this.camera.position.set(0, 0.4, 17.2);
      this.camera.fov = 46;
    } else if (aspect < 1.15) {
      this.camera.position.set(0, 0.35, 15.2);
      this.camera.fov = 44;
    } else {
      this.camera.position.set(0, 0.35, 13.2);
      this.camera.fov = 42;
    }
    this.camera.lookAt(0, 0.1, 0);
    this.camera.updateProjectionMatrix();
  }

  resize(width, height) {
    if (!this.camera) return;
    this.camera.aspect = width / height;
    this.setCameraForViewport(width, height);
    this.layoutAnswerSlots(width, height);
  }

  clearTransientParticles() {
    [...this.debris, ...this.fireworks].forEach((item) => item.removeFromParent());
    this.debris.length = 0;
    this.fireworks.length = 0;
  }

  disposeRoundModels() {
    this.dynamicModels.forEach((object) => {
      object.removeFromParent();
      object.traverse((child) => {
        child.geometry?.dispose?.();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((mat) => mat.dispose?.());
      });
    });
    this.dynamicModels.length = 0;

    this.answerSlots.forEach((slot) => {
      slot.userData.preview = null;
    });
    this.secretModel = null;
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.context.speech.cancel();
    this.disposeRoundModels();
    this.clearTransientParticles();
    this.hud?.dispose();
    this.progress?.remove();
    this.question?.remove();
    this.feedback?.remove();
    this.newButton?.remove();
    this.answerLabels.forEach((label) => label.remove());
    this.answerLabels.length = 0;
    super.dispose();
  }
}
