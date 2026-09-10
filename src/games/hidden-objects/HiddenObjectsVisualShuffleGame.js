import * as THREE from 'three';
import { HiddenObjectsStableGame } from './HiddenObjectsStableGame.js';

const SESSION_KEY_V1 = 'familygame-hidden-objects-round-v1';
const SESSION_KEY_V2 = 'familygame-hidden-objects-round-v2';

const ROOM_SLOTS = Object.freeze([
  { id: 'bed-pillow', position: [-3.72, -1.02, 0.82], rotationY: 0.08 },
  { id: 'bed-foot', position: [-2.5, -1.38, 0.9], rotationY: -0.1 },
  { id: 'floor-left', position: [-3.35, -2.22, 0.98], rotationY: 0.12 },
  { id: 'floor-mid-left', position: [-1.78, -2.18, 0.98], rotationY: -0.08 },
  { id: 'floor-center', position: [-0.25, -2.16, 0.98], rotationY: 0.06 },
  { id: 'floor-mid-right', position: [1.28, -2.15, 0.98], rotationY: -0.1 },
  { id: 'chest-front', position: [3.18, -2.15, 0.96], rotationY: 0.1 },
  { id: 'table-left', position: [0.08, -0.28, 0.88], rotationY: -0.06 },
  { id: 'table-right', position: [1.55, -0.28, 0.88], rotationY: 0.1 },
  { id: 'shelf-upper-left', position: [-0.6, 1.18, 0.7], rotationY: -0.08 },
  { id: 'shelf-upper-right', position: [0.55, 1.18, 0.7], rotationY: 0.08 },
  { id: 'shelf-lower', position: [1.08, 0.61, 0.74], rotationY: -0.06 },
  { id: 'bookcase-top', position: [3.28, 1.3, 0.66], rotationY: 0.08 },
  { id: 'bookcase-middle', position: [3.28, 0.34, 0.68], rotationY: -0.08 },
]);

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createBetterBananaModel() {
  const group = new THREE.Group();

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.72, 0.12, 0),
    new THREE.Vector3(-0.38, -0.02, 0.02),
    new THREE.Vector3(0, -0.09, 0),
    new THREE.Vector3(0.38, -0.01, -0.02),
    new THREE.Vector3(0.72, 0.18, 0),
  ]);

  const bodyGeometry = new THREE.TubeGeometry(curve, 28, 0.16, 12, false);
  const ridgeGeometry = new THREE.TubeGeometry(curve, 28, 0.018, 6, false);
  const tipGeometry = new THREE.SphereGeometry(0.075, 10, 8);
  const stemGeometry = new THREE.CylinderGeometry(0.038, 0.055, 0.18, 8);

  const yellow = new THREE.MeshStandardMaterial({ color: 0xf5d94f, roughness: 0.74 });
  const light = new THREE.MeshStandardMaterial({ color: 0xffef87, roughness: 0.72 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.86 });

  const body = new THREE.Mesh(bodyGeometry, yellow);
  body.scale.set(1.04, 1.08, 0.9);
  group.add(body);

  const ridge = new THREE.Mesh(ridgeGeometry, light);
  ridge.position.z = 0.145;
  group.add(ridge);

  const leftTip = new THREE.Mesh(tipGeometry, brown);
  leftTip.position.set(-0.73, 0.125, 0);
  leftTip.scale.set(0.9, 0.72, 0.72);

  const rightTip = new THREE.Mesh(tipGeometry, brown);
  rightTip.position.set(0.73, 0.185, 0);
  rightTip.scale.set(0.9, 0.72, 0.72);

  const stem = new THREE.Mesh(stemGeometry, brown);
  stem.position.set(0.78, 0.25, 0);
  stem.rotation.z = -0.72;

  group.add(leftTip, rightTip, stem);
  group.rotation.z = -0.08;

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  return group;
}

/**
 * Presentation + layout layer on top of the mobile-stable Hidden Objects game.
 * Keeps the PR #23 restart/session protections, replaces only the banana model,
 * and assigns objects to safe room slots for every new round.
 */
export class HiddenObjectsVisualShuffleGame extends HiddenObjectsStableGame {
  constructor(context) {
    super(context);
    this.pendingLayoutShuffle = false;
  }

  createHiddenObjects() {
    super.createHiddenObjects();
    this.replaceBananaModel();

    this.objects.forEach((object) => {
      const center = new THREE.Vector3(...object.position);
      object.layoutRootOffset = object.homePosition.clone().sub(center);
      object.layoutBaseRotation = object.homeRotation.clone();
      object.layoutSlotId = null;
    });
  }

  replaceBananaModel() {
    const object = this.objects.find((item) => item.id === 'banana');
    if (!object) return;

    const oldRoot = object.root;
    oldRoot.removeFromParent();

    const root = this.trackObject(createBetterBananaModel());
    root.rotation.y = object.rotationY;
    root.updateMatrixWorld(true);

    const initialBounds = new THREE.Box3().setFromObject(root);
    const initialSize = initialBounds.getSize(new THREE.Vector3());
    const fitScale = object.size / Math.max(initialSize.x, initialSize.y, 0.001);
    root.scale.setScalar(fitScale);
    root.updateMatrixWorld(true);

    const fittedBounds = new THREE.Box3().setFromObject(root);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    const [x, y, z] = object.position;
    root.position.set(x - center.x, y - center.y, z - center.z);
    root.updateMatrixWorld(true);
    this.scene.add(root);

    object.root = root;
    object.baseScale = fitScale;
    object.homePosition = root.position.clone();
    object.homeRotation = root.rotation.clone();
  }

  startNewGame() {
    const isFirstRound = !this.roundInitialized;
    const isCompletedRestart = this.roundInitialized && this.completed;

    if (isFirstRound || isCompletedRestart) {
      this.pendingLayoutShuffle = true;
    }

    return super.startNewGame();
  }

  layoutObjectsForRound() {
    let selected = shuffle(ROOM_SLOTS).slice(0, this.objects.length);

    // Avoid an almost-identical replay layout when Play Again is pressed.
    if (this.objects.some((object) => object.layoutSlotId)) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const unchanged = this.objects.reduce(
          (count, object, index) => count + (object.layoutSlotId === selected[index]?.id ? 1 : 0),
          0,
        );
        if (unchanged <= 2) break;
        selected = shuffle(ROOM_SLOTS).slice(0, this.objects.length);
      }
    }

    this.objects.forEach((object, index) => {
      this.applySlot(object, selected[index]);
    });
  }

  applySlot(object, slot) {
    if (!object || !slot) return;

    const [x, y, z] = slot.position;
    const center = new THREE.Vector3(x, y, z);
    const offset = object.layoutRootOffset ?? new THREE.Vector3();

    object.root.position.copy(center).add(offset);
    object.root.rotation.copy(object.layoutBaseRotation ?? object.homeRotation);
    object.root.rotation.y += slot.rotationY ?? 0;
    object.root.scale.setScalar(object.baseScale);

    // Base success/wrong animation returns to homePosition/homeRotation, so the
    // shuffled position becomes the new home for this round.
    object.homePosition.copy(object.root.position);
    object.homeRotation.copy(object.root.rotation);

    object.hit.position.set(x, y, z + 0.12);
    object.halo.position.set(x, y, z - 0.18);
    object.layoutSlotId = slot.id;
  }

  saveRound() {
    if (this.pendingLayoutShuffle) {
      this.layoutObjectsForRound();
      this.pendingLayoutShuffle = false;
    }

    if (!this.targetOrder?.length || !this.objects?.length) return;

    const snapshot = {
      version: 2,
      orderIds: this.targetOrder.map((item) => item.id),
      foundIds: this.objects.filter((item) => item.found).map((item) => item.id),
      layout: this.objects.map((item) => ({ id: item.id, slotId: item.layoutSlotId })),
    };

    try {
      sessionStorage.setItem(SESSION_KEY_V2, JSON.stringify(snapshot));
      sessionStorage.removeItem(SESSION_KEY_V1);
    } catch {
      // Storage can be unavailable in strict/private modes. Gameplay remains
      // valid; only unexpected-instance restoration is unavailable.
    }
  }

  restoreRound() {
    let snapshot = null;
    let migratedFromV1 = false;

    try {
      const v2 = sessionStorage.getItem(SESSION_KEY_V2);
      if (v2) {
        snapshot = JSON.parse(v2);
      } else {
        const v1 = sessionStorage.getItem(SESSION_KEY_V1);
        if (v1) {
          snapshot = JSON.parse(v1);
          migratedFromV1 = true;
        }
      }
    } catch {
      return false;
    }

    if (!snapshot || (snapshot.version !== 2 && snapshot.version !== 1)) return false;

    const objectById = new Map(this.objects.map((item) => [item.id, item]));
    const slotById = new Map(ROOM_SLOTS.map((slot) => [slot.id, slot]));
    const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds : [];
    const foundIds = Array.isArray(snapshot.foundIds) ? snapshot.foundIds : [];

    const validOrder = orderIds.length === this.objects.length
      && new Set(orderIds).size === this.objects.length
      && orderIds.every((id) => objectById.has(id));

    if (!validOrder) {
      this.clearRound();
      return false;
    }

    const foundSet = new Set(foundIds.filter((id) => objectById.has(id)));
    if (foundSet.size >= this.objects.length) {
      this.clearRound();
      return false;
    }

    const layoutEntries = Array.isArray(snapshot.layout) ? snapshot.layout : [];
    const validLayout = snapshot.version === 2
      && layoutEntries.length === this.objects.length
      && new Set(layoutEntries.map((entry) => entry?.id)).size === this.objects.length
      && new Set(layoutEntries.map((entry) => entry?.slotId)).size === this.objects.length
      && layoutEntries.every((entry) => objectById.has(entry?.id) && slotById.has(entry?.slotId));

    if (validLayout) {
      layoutEntries.forEach((entry) => {
        this.applySlot(objectById.get(entry.id), slotById.get(entry.slotId));
      });
    } else {
      // Seamlessly migrate an active v1 round from PR #23 without losing its
      // score/order. It receives one fresh layout and is then saved as v2.
      this.layoutObjectsForRound();
      migratedFromV1 = true;
    }

    this.pendingLayoutShuffle = false;
    this.targetOrder = orderIds.map((id) => objectById.get(id));
    this.foundCount = foundSet.size;
    this.completed = false;
    this.inputLocked = false;
    this.pointerDown = null;

    this.objects.forEach((object) => {
      object.found = foundSet.has(object.id);
      object.feedbackKind = null;
      object.feedbackTime = 0;
      object.root.position.copy(object.homePosition);
      object.root.rotation.copy(object.homeRotation);
      object.root.scale.setScalar(object.baseScale);
      object.halo.visible = object.found;
      object.hit.visible = true;
    });

    this.currentTarget = this.targetOrder.find((item) => !item.found) ?? null;
    this.targetIndex = Math.max(0, this.targetOrder.indexOf(this.currentTarget));

    if (!this.currentTarget) {
      this.clearRound();
      return false;
    }

    this.ui.toast?.classList.remove('hidden-toast--show');
    this.ui.complete?.classList.remove('hidden-complete--show');
    this.refreshUi();
    this.schedulePromptSpeech();

    if (migratedFromV1) this.saveRound();
    return true;
  }

  clearRound() {
    try {
      sessionStorage.removeItem(SESSION_KEY_V1);
      sessionStorage.removeItem(SESSION_KEY_V2);
    } catch {
      // Ignore storage failures.
    }
  }
}
