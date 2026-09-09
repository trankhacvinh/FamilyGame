import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import { createToyModel } from '../archaeology/modelFactory.js';
import { CLAW_CONFIG, CLAW_STATE } from './clawConfig.js';
import { CLAW_TOYS, CLAW_TOY_LAYOUT } from './clawCatalog.js';
import './claw.css';

const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1);
const ease = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export class ClawMachineGame extends BaseGame {
  constructor(context) {
    super(context);
    this.state = CLAW_STATE.IDLE;
    this.stateTime = 0;
    this.clawX = CLAW_CONFIG.clawHomeX;
    this.clawY = CLAW_CONFIG.clawTopY;
    this.stateStartX = this.clawX;
    this.stateStartY = this.clawY;
    this.clawCloseAmount = 0;
    this.dragging = false;
    this.activePointerId = null;
    this.grabbedToy = null;
    this.score = 0;
    this.toys = [];
    this.ui = {};
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd9efff);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 0.35, 10.8);
    this.camera.lookAt(0, 0.25, 0);

    this.createLights();
    this.createMachine();
    this.createClaw();
    this.createToys();
    this.createUi();
    this.bindInput();
    this.resize(this.context.viewport.width, this.context.viewport.height);
    this.startNewGame();
  }

  createLights() {
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xaec4e8, 2.1));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 2.7));
    key.position.set(-4, 7, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = this.track(new THREE.PointLight(0xffd7ef, 18, 16, 2));
    fill.position.set(3.4, 2.8, 4.8);
    this.scene.add(fill);
  }

  makeMesh(geometry, material, position = [0, 0, 0]) {
    const mesh = this.trackObject(new THREE.Mesh(geometry, material));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  createMachine() {
    const frame = this.track(new THREE.MeshStandardMaterial({ color: 0xff92bd, roughness: 0.5 }));
    const frameLight = this.track(new THREE.MeshStandardMaterial({ color: 0xffd3e5, roughness: 0.5 }));
    const baseMat = this.track(new THREE.MeshStandardMaterial({ color: 0x846fd4, roughness: 0.58 }));
    const floorMat = this.track(new THREE.MeshStandardMaterial({ color: 0xffefc7, roughness: 0.82 }));
    const glass = this.track(new THREE.MeshStandardMaterial({
      color: 0xdff7ff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.12,
      metalness: 0,
      depthWrite: false,
    }));
    const dark = this.track(new THREE.MeshStandardMaterial({ color: 0x443b70, roughness: 0.58 }));

    this.makeMesh(new THREE.BoxGeometry(8.6, 0.58, 1.0), baseMat, [0, -2.55, 0]);
    this.makeMesh(new THREE.BoxGeometry(7.7, 0.18, 2.0), floorMat, [-0.18, -2.12, -0.05]);
    this.makeMesh(new THREE.BoxGeometry(8.6, 0.5, 1.0), frame, [0, 4.05, 0]);

    [-4.05, 4.05].forEach((x) => {
      this.makeMesh(new THREE.BoxGeometry(0.38, 6.2, 0.72), frame, [x, 0.72, 0]);
      this.makeMesh(new THREE.BoxGeometry(0.16, 5.65, 0.1), frameLight, [x * 0.985, 0.72, 0.55]);
    });

    this.makeMesh(new THREE.BoxGeometry(7.75, 5.55, 0.08), glass, [-0.05, 0.78, 0.62]);
    this.makeMesh(new THREE.BoxGeometry(7.75, 5.55, 0.08), glass, [-0.05, 0.78, -1.15]);

    const header = this.makeMesh(new THREE.BoxGeometry(5.4, 0.56, 0.18), frameLight, [0, 3.72, 0.62]);
    header.material.emissive = new THREE.Color(0xff5f9f);
    header.material.emissiveIntensity = 0.08;

    // Khay nhận quà phía trước bên phải.
    this.makeMesh(new THREE.BoxGeometry(1.45, 0.88, 0.72), dark, [3.18, -2.18, 0.72]);
    const chuteOpening = this.makeMesh(
      new THREE.BoxGeometry(1.02, 0.48, 0.05),
      this.track(new THREE.MeshBasicMaterial({ color: 0x242039 })),
      [3.18, -2.12, 1.1],
    );
    chuteOpening.castShadow = false;

    // Đèn viền nhỏ, cùng geometry/material để nhẹ hơn.
    const bulbGeo = this.track(new THREE.SphereGeometry(0.075, 10, 8));
    const bulbMat = this.track(new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    for (let i = 0; i < 12; i += 1) {
      const bulb = this.trackObject(new THREE.Mesh(bulbGeo, bulbMat));
      bulb.position.set(-3.3 + i * 0.6, 3.72, 0.75);
      this.scene.add(bulb);
    }
  }

  createClaw() {
    const metal = this.track(new THREE.MeshStandardMaterial({ color: 0xe9eef7, roughness: 0.3, metalness: 0.58 }));
    const jointMat = this.track(new THREE.MeshStandardMaterial({ color: 0x6e67a8, roughness: 0.46, metalness: 0.18 }));
    const railMat = this.track(new THREE.MeshStandardMaterial({ color: 0x5c5592, roughness: 0.52 }));

    this.rail = this.makeMesh(new THREE.BoxGeometry(7.25, 0.16, 0.26), railMat, [0, 3.38, 0.22]);

    this.carriage = this.trackObject(new THREE.Group());
    this.scene.add(this.carriage);

    const carriageBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.58), jointMat);
    carriageBody.castShadow = true;
    this.carriage.add(carriageBody);

    this.cable = this.trackObject(new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1, 8),
      metal,
    ));
    this.scene.add(this.cable);

    this.clawHead = this.trackObject(new THREE.Group());
    this.scene.add(this.clawHead);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.34, 16), jointMat);
    hub.rotation.z = Math.PI / 2;
    hub.castShadow = true;
    this.clawHead.add(hub);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), metal);
    cap.position.y = -0.18;
    cap.castShadow = true;
    this.clawHead.add(cap);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.18, -0.2, 0);
    this.clawHead.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.18, -0.2, 0);
    this.clawHead.add(this.rightArmPivot);

    const armGeo = this.track(new THREE.CylinderGeometry(0.055, 0.065, 0.82, 10));
    const tipGeo = this.track(new THREE.SphereGeometry(0.095, 12, 8));

    const leftArm = new THREE.Mesh(armGeo, metal);
    leftArm.position.y = -0.38;
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);
    const leftTip = new THREE.Mesh(tipGeo, jointMat);
    leftTip.position.y = -0.79;
    this.leftArmPivot.add(leftTip);

    const rightArm = new THREE.Mesh(armGeo, metal);
    rightArm.position.y = -0.38;
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);
    const rightTip = new THREE.Mesh(tipGeo, jointMat);
    rightTip.position.y = -0.79;
    this.rightArmPivot.add(rightTip);

    this.backArmPivot = new THREE.Group();
    this.backArmPivot.position.set(0, -0.2, -0.12);
    this.clawHead.add(this.backArmPivot);
    const backArm = new THREE.Mesh(armGeo, metal);
    backArm.position.y = -0.36;
    backArm.rotation.x = -0.34;
    backArm.castShadow = true;
    this.backArmPivot.add(backArm);

    this.updateClawVisuals();
  }

  createToys() {
    CLAW_TOYS.forEach((definition, index) => {
      const root = this.trackObject(createToyModel(definition.id));
      const [x, y, z, rotationY] = CLAW_TOY_LAYOUT[index];

      root.scale.setScalar(1);
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 1.02 / Math.max(size.x, size.y, 0.001);
      root.scale.setScalar(scale);
      root.rotation.y = rotationY;
      root.updateMatrixWorld(true);

      const scaledBounds = new THREE.Box3().setFromObject(root);
      const center = scaledBounds.getCenter(new THREE.Vector3());
      root.position.set(x - center.x, y - center.y, z - center.z);
      root.updateMatrixWorld(true);

      const item = {
        ...definition,
        root,
        homePosition: root.position.clone(),
        homeRotation: root.rotation.clone(),
        collected: false,
      };
      this.toys.push(item);
      this.scene.add(root);
    });
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    const root = document.createElement('div');
    root.className = 'claw-ui';

    const status = document.createElement('div');
    status.className = 'claw-status';
    this.ui.score = document.createElement('div');
    this.ui.score.className = 'claw-score';
    this.ui.message = document.createElement('div');
    this.ui.message.className = 'claw-message';
    status.append(this.ui.score, this.ui.message);

    const collection = document.createElement('div');
    collection.className = 'claw-collection';
    this.ui.collectionTitle = document.createElement('strong');
    this.ui.collectionItems = document.createElement('div');
    this.ui.collectionItems.className = 'claw-collection__items';
    collection.append(this.ui.collectionTitle, this.ui.collectionItems);

    this.ui.collectionNodes = new Map();
    CLAW_TOYS.forEach((toy) => {
      const chip = document.createElement('span');
      chip.className = 'claw-collection__toy';
      chip.textContent = toy.icon;
      chip.title = this.context.i18n.t(toy.labelKey);
      this.ui.collectionItems.append(chip);
      this.ui.collectionNodes.set(toy.id, chip);
    });

    const controls = document.createElement('div');
    controls.className = 'claw-controls';

    this.ui.hint = document.createElement('div');
    this.ui.hint.className = 'claw-drag-hint';

    this.ui.grabButton = document.createElement('button');
    this.ui.grabButton.type = 'button';
    this.ui.grabButton.className = 'claw-grab-button';
    this.ui.grabButton.addEventListener('click', () => this.startGrab(), { signal: this.signal });

    this.ui.newButton = document.createElement('button');
    this.ui.newButton.type = 'button';
    this.ui.newButton.className = 'claw-new-button';
    this.ui.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    controls.append(this.ui.hint, this.ui.grabButton, this.ui.newButton);

    this.ui.complete = document.createElement('div');
    this.ui.complete.className = 'claw-complete';
    this.ui.complete.setAttribute('aria-live', 'polite');

    root.append(status, collection, controls, this.ui.complete);
    this.context.uiRoot.append(root);
    this.ui.root = root;

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refreshUi());
  }

  bindInput() {
    const start = (event) => {
      if (this.state !== CLAW_STATE.IDLE) return;
      this.dragging = true;
      this.activePointerId = event.pointerId;
      this.context.canvas.setPointerCapture?.(event.pointerId);
      this.moveClawFromPointer(event.clientX);
    };

    const move = (event) => {
      if (!this.dragging || event.pointerId !== this.activePointerId) return;
      this.moveClawFromPointer(event.clientX);
    };

    const end = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.dragging = false;
      this.activePointerId = null;
      this.context.canvas.releasePointerCapture?.(event.pointerId);
    };

    this.context.canvas.addEventListener('pointerdown', start, { signal: this.signal });
    this.context.canvas.addEventListener('pointermove', move, { signal: this.signal });
    this.context.canvas.addEventListener('pointerup', end, { signal: this.signal });
    this.context.canvas.addEventListener('pointercancel', end, { signal: this.signal });
  }

  moveClawFromPointer(clientX) {
    if (this.state !== CLAW_STATE.IDLE) return;
    const width = Math.max(1, this.context.viewport.width);
    const normalized = THREE.MathUtils.clamp(clientX / width, 0, 1);
    this.clawX = THREE.MathUtils.lerp(CLAW_CONFIG.clawMinX, CLAW_CONFIG.clawMaxX, normalized);
    this.updateClawVisuals();
  }

  startGrab() {
    if (this.state !== CLAW_STATE.IDLE) return;
    this.context.audio.playTap();
    this.dragging = false;
    this.activePointerId = null;
    this.grabbedToy = null;
    this.stateStartX = this.clawX;
    this.stateStartY = this.clawY;
    this.setState(CLAW_STATE.LOWERING);
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
    this.stateStartX = this.clawX;
    this.stateStartY = this.clawY;
    this.refreshUi();
  }

  pickNearestToy() {
    let best = null;
    let bestDistance = Infinity;

    this.toys.forEach((toy) => {
      if (toy.collected || !toy.root.visible) return;
      const distance = Math.abs(toy.root.position.x - this.clawX);
      if (distance < bestDistance) {
        best = toy;
        bestDistance = distance;
      }
    });

    if (!best || bestDistance > CLAW_CONFIG.grabRadius) return null;
    return best;
  }

  followGrabbedToy() {
    if (!this.grabbedToy) return;
    this.grabbedToy.root.position.set(this.clawX, this.clawY - 0.75, 0.05);
    this.grabbedToy.root.rotation.y += 0.01;
  }

  finishToyDrop() {
    const toy = this.grabbedToy;
    if (!toy) return;

    toy.collected = true;
    toy.root.visible = false;
    this.grabbedToy = null;
    this.score += 1;
    this.context.audio.playSuccess();

    const name = this.context.i18n.t(toy.labelKey);
    this.context.speech.speak(name, this.context.i18n.language);
    this.refreshUi();

    if (this.remainingCount() === 0) {
      this.setState(CLAW_STATE.COMPLETED);
      this.context.speech.speak(this.context.i18n.t('greatJob'), this.context.i18n.language);
      return;
    }

    this.setState(CLAW_STATE.RETURNING);
  }

  remainingCount() {
    return this.toys.filter((toy) => !toy.collected).length;
  }

  update(delta) {
    if (!this.scene || this.disposed) return;
    this.stateTime += delta;

    if (this.state === CLAW_STATE.LOWERING) {
      const t = ease(this.stateTime / CLAW_CONFIG.lowerDuration);
      this.clawY = THREE.MathUtils.lerp(this.stateStartY, CLAW_CONFIG.clawGrabY, t);
      this.clawCloseAmount = 0;
      if (t >= 1) {
        this.grabbedToy = this.pickNearestToy();
        this.context.audio.playReveal();
        this.setState(CLAW_STATE.GRABBING);
      }
    } else if (this.state === CLAW_STATE.GRABBING) {
      const t = ease(this.stateTime / CLAW_CONFIG.grabDuration);
      this.clawCloseAmount = t;
      if (this.grabbedToy) this.followGrabbedToy();
      if (t >= 1) this.setState(CLAW_STATE.LIFTING);
    } else if (this.state === CLAW_STATE.LIFTING) {
      const t = ease(this.stateTime / CLAW_CONFIG.liftDuration);
      this.clawY = THREE.MathUtils.lerp(this.stateStartY, CLAW_CONFIG.clawTopY, t);
      this.followGrabbedToy();
      if (t >= 1) {
        if (this.grabbedToy) {
          this.setState(CLAW_STATE.DELIVERING);
        } else {
          this.context.audio.playWrong();
          this.setState(CLAW_STATE.RETURNING);
        }
      }
    } else if (this.state === CLAW_STATE.DELIVERING) {
      const t = ease(this.stateTime / CLAW_CONFIG.deliverDuration);
      this.clawX = THREE.MathUtils.lerp(this.stateStartX, CLAW_CONFIG.chuteX, t);
      this.followGrabbedToy();
      if (t >= 1) this.setState(CLAW_STATE.DROPPING);
    } else if (this.state === CLAW_STATE.DROPPING) {
      const t = ease(this.stateTime / CLAW_CONFIG.dropDuration);
      this.clawCloseAmount = 1 - t;
      if (this.grabbedToy) {
        this.grabbedToy.root.position.x = this.clawX;
        this.grabbedToy.root.position.y = THREE.MathUtils.lerp(
          this.stateStartY - 0.75,
          CLAW_CONFIG.chuteDropY,
          t,
        );
        this.grabbedToy.root.rotation.z += delta * 4.2;
      }
      if (t >= 1) this.finishToyDrop();
    } else if (this.state === CLAW_STATE.RETURNING) {
      const t = ease(this.stateTime / CLAW_CONFIG.returnDuration);
      this.clawX = THREE.MathUtils.lerp(this.stateStartX, CLAW_CONFIG.clawHomeX, t);
      this.clawY = THREE.MathUtils.lerp(this.stateStartY, CLAW_CONFIG.clawTopY, t);
      this.clawCloseAmount = THREE.MathUtils.lerp(this.clawCloseAmount, 0, t);
      if (t >= 1) {
        this.clawX = CLAW_CONFIG.clawHomeX;
        this.clawY = CLAW_CONFIG.clawTopY;
        this.clawCloseAmount = 0;
        this.setState(CLAW_STATE.IDLE);
      }
    }

    this.updateClawVisuals();
  }

  updateClawVisuals() {
    if (!this.carriage || !this.clawHead || !this.cable) return;

    this.carriage.position.set(this.clawX, 3.36, 0.22);
    this.clawHead.position.set(this.clawX, this.clawY, 0.22);

    const cableTopY = 3.25;
    const cableBottomY = this.clawY + 0.05;
    const cableLength = Math.max(0.12, cableTopY - cableBottomY);
    this.cable.position.set(this.clawX, cableTopY - cableLength / 2, 0.22);
    this.cable.scale.set(1, cableLength, 1);

    const openAngle = 0.52;
    const closedAngle = 0.12;
    const angle = THREE.MathUtils.lerp(openAngle, closedAngle, this.clawCloseAmount);
    this.leftArmPivot.rotation.z = -angle;
    this.rightArmPivot.rotation.z = angle;
    this.backArmPivot.rotation.x = THREE.MathUtils.lerp(-0.38, -0.1, this.clawCloseAmount);
  }

  startNewGame() {
    this.state = CLAW_STATE.IDLE;
    this.stateTime = 0;
    this.clawX = CLAW_CONFIG.clawHomeX;
    this.clawY = CLAW_CONFIG.clawTopY;
    this.clawCloseAmount = 0;
    this.dragging = false;
    this.activePointerId = null;
    this.grabbedToy = null;
    this.score = 0;

    this.toys.forEach((toy) => {
      toy.collected = false;
      toy.root.visible = true;
      toy.root.position.copy(toy.homePosition);
      toy.root.rotation.copy(toy.homeRotation);
    });

    this.updateClawVisuals();
    this.refreshUi();
  }

  stateMessageKey() {
    if (this.state === CLAW_STATE.LOWERING) return 'clawLowering';
    if (this.state === CLAW_STATE.GRABBING) return 'clawGrabbing';
    if (this.state === CLAW_STATE.LIFTING) return this.grabbedToy ? 'clawGotOne' : 'clawMiss';
    if (this.state === CLAW_STATE.DELIVERING || this.state === CLAW_STATE.DROPPING) return 'clawGotOne';
    if (this.state === CLAW_STATE.RETURNING) return 'clawReturning';
    if (this.state === CLAW_STATE.COMPLETED) return 'clawComplete';
    return 'clawReady';
  }

  refreshUi() {
    if (!this.ui.root) return;

    this.ui.score.textContent = `⭐ ${this.context.i18n.t('clawScore')}: ${this.score} / ${this.toys.length}`;
    this.ui.message.textContent = this.context.i18n.t(this.stateMessageKey());
    this.ui.collectionTitle.textContent = this.context.i18n.t('clawCollection');
    this.ui.hint.textContent = this.context.i18n.t('clawDragHint');
    this.ui.grabButton.textContent = this.context.i18n.t('clawGrab');
    this.ui.newButton.textContent = this.context.i18n.t('clawNewGame');
    this.ui.grabButton.disabled = this.state !== CLAW_STATE.IDLE;

    this.toys.forEach((toy) => {
      const node = this.ui.collectionNodes.get(toy.id);
      node?.classList.toggle('claw-collection__toy--collected', toy.collected);
      if (node) node.title = this.context.i18n.t(toy.labelKey);
    });

    const completed = this.state === CLAW_STATE.COMPLETED;
    this.ui.complete.classList.toggle('claw-complete--show', completed);
    this.ui.complete.textContent = completed
      ? `${this.context.i18n.t('greatJob')} ${this.context.i18n.t('clawComplete')}`
      : '';
  }

  resize(width, height) {
    if (!this.camera) return;
    this.camera.aspect = Math.max(0.4, width / Math.max(height, 1));
    this.camera.updateProjectionMatrix();

    // Portrait cần lùi camera để toàn bộ máy vẫn nằm trong khung nhìn.
    const portrait = height > width;
    this.camera.position.z = portrait ? 13.8 : 10.8;
    this.camera.position.y = portrait ? 0.45 : 0.35;
    this.camera.lookAt(0, 0.25, 0);
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = null;
    this.hud?.dispose();
    this.ui.root?.remove();
    this.ui = {};
    this.toys.length = 0;
    super.dispose();
  }
}
