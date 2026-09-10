import * as THREE from 'three';
import { HiddenObjectsGame } from './HiddenObjectsGame.js';
import { HiddenObjectsShuffleGame } from './HiddenObjectsShuffleGame.js';
import { HIDDEN_OBJECTS_CONFIG } from './hiddenObjectsConfig.js';
import { createPolishedHiddenObjectModel } from './hiddenObjectPolishedFactory.js';

const SESSION_KEY = 'familygame-hidden-objects-round-v2';
const LEGACY_SESSION_KEY = 'familygame-hidden-objects-round-v1';

const ROOM_SLOTS = Object.freeze([
  { id: 'bed', position: [-3.38, -1.12, 0.74], rotationY: 0.12, scale: 0.96 },
  { id: 'floor-far-left', position: [-3.55, -2.22, 0.98], rotationY: -0.1, scale: 0.96 },
  { id: 'floor-left', position: [-2.15, -2.22, 0.98], rotationY: 0.12, scale: 1 },
  { id: 'floor-center', position: [-0.72, -2.2, 1.0], rotationY: -0.08, scale: 1 },
  { id: 'floor-center-right', position: [0.78, -2.2, 1.0], rotationY: 0.1, scale: 1 },
  { id: 'floor-right', position: [2.25, -2.16, 0.98], rotationY: -0.12, scale: 0.98 },
  { id: 'floor-far-right', position: [3.52, -2.08, 0.98], rotationY: 0.08, scale: 0.94 },
  { id: 'table-left', position: [0.12, -0.28, 0.88], rotationY: 0.1, scale: 0.94 },
  { id: 'table-right', position: [1.52, -0.28, 0.88], rotationY: -0.1, scale: 0.94 },
  { id: 'shelf-upper-left', position: [-0.68, 1.16, 0.66], rotationY: -0.08, scale: 0.9 },
  { id: 'shelf-upper-right', position: [0.76, 1.16, 0.66], rotationY: 0.08, scale: 0.9 },
  { id: 'shelf-middle-right', position: [1.78, 0.58, 0.74], rotationY: -0.12, scale: 0.9 },
  { id: 'bookcase-top', position: [3.2, 1.3, 0.64], rotationY: 0.12, scale: 0.9 },
  { id: 'bookcase-middle', position: [3.2, 0.28, 0.7], rotationY: -0.12, scale: 0.88 },
  { id: 'chest-top', position: [3.28, -1.22, 0.86], rotationY: 0.08, scale: 0.9 },
  { id: 'window-low', position: [-2.78, 0.72, 0.7], rotationY: -0.08, scale: 0.88 },
]);

const SLOT_BY_ID = new Map(ROOM_SLOTS.map((slot) => [slot.id, slot]));

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distanceBetweenSlots(a, b) {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  return Math.hypot(dx, dy);
}

export class HiddenObjectsDeluxeGame extends HiddenObjectsShuffleGame {
  constructor(context) {
    super(context);
    this.catalogObjects = [];
    this.allClickTargets = [];
    this.previousActiveIds = new Set();
    this.timeOfDay = 'day';
    this.timeBlend = 0;
    this.targetTimeBlend = 0;
    this.dayNightElapsed = 0;
    this.daySun = null;
    this.nightMoon = null;
    this.nightStars = [];
    this.dayNightDecor = null;
    this.dayColor = new THREE.Color(0xdff3ff);
    this.nightColor = new THREE.Color(0x23355f);
    this.dayWallColor = new THREE.Color(0xf3e8ff);
    this.nightWallColor = new THREE.Color(0x5a567d);
    this.dayFloorColor = new THREE.Color(0xe3c799);
    this.nightFloorColor = new THREE.Color(0x77718a);
    this.dayWindowColor = new THREE.Color(0xbde9ff);
    this.nightWindowColor = new THREE.Color(0x354a80);
    this.tmpColor = new THREE.Color();
  }

  createLights() {
    this.hemiLight = this.track(new THREE.HemisphereLight(0xffffff, 0xc9bfd8, 2.75));
    this.scene.add(this.hemiLight);

    this.keyLight = this.track(new THREE.DirectionalLight(0xffffff, 1.55));
    this.keyLight.position.set(-4, 7, 9);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.00025;
    this.scene.add(this.keyLight);

    this.warmLight = this.track(new THREE.PointLight(0xffe0bd, 4.8, 15, 2));
    this.warmLight.position.set(3.2, 2.2, 4.5);
    this.scene.add(this.warmLight);
  }

  createRoom() {
    super.createRoom();
    this.createDayNightDecor();
    this.applyTimeVisuals();
  }

  createDayNightDecor() {
    this.dayNightDecor = this.trackObject(new THREE.Group());

    const sunMaterial = this.track(new THREE.MeshBasicMaterial({
      color: 0xffdc73,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    }));
    this.daySun = new THREE.Mesh(this.track(new THREE.CircleGeometry(0.36, 28)), sunMaterial);
    this.daySun.position.set(-2.86, 1.72, -0.72);
    this.dayNightDecor.add(this.daySun);

    const moonMaterial = this.track(new THREE.MeshBasicMaterial({
      color: 0xfff2b8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }));
    this.nightMoon = new THREE.Mesh(this.track(new THREE.CircleGeometry(0.31, 28)), moonMaterial);
    this.nightMoon.position.set(-2.78, 1.72, -0.7);
    this.dayNightDecor.add(this.nightMoon);

    const starMaterial = this.track(new THREE.MeshBasicMaterial({
      color: 0xfff4c7,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }));
    const starGeometry = this.track(new THREE.CircleGeometry(0.035, 10));
    const starPositions = [
      [-3.42, 1.88], [-3.15, 1.35], [-2.55, 2.05], [-2.32, 1.45],
      [-3.55, 1.22], [-2.45, 1.08], [-3.02, 2.12],
    ];
    starPositions.forEach(([x, y], index) => {
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.set(x, y, -0.68);
      star.userData.phase = index * 0.75;
      this.dayNightDecor.add(star);
      this.nightStars.push(star);
    });

    this.scene.add(this.dayNightDecor);
    this.trackObject(this.dayNightDecor);
  }

  createHiddenObjectModel(id) {
    const polished = createPolishedHiddenObjectModel(id);
    if (polished) return polished;

    const model = super.createHiddenObjectModel(id);
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((meshMaterial) => {
        if (!meshMaterial) return;
        if ('roughness' in meshMaterial) meshMaterial.roughness = Math.max(0.56, meshMaterial.roughness ?? 0.56);
        if ('metalness' in meshMaterial) meshMaterial.metalness = Math.min(0.03, meshMaterial.metalness ?? 0);
      });
    });
    return model;
  }

  createHiddenObjects() {
    super.createHiddenObjects();
    this.catalogObjects = [...this.objects];
    this.allClickTargets = [...this.clickTargets];

    this.catalogObjects.forEach((object) => {
      object.catalogScale = object.baseScale;
      object.active = true;
    });
  }

  selectActiveObjects() {
    const count = Math.min(HIDDEN_OBJECTS_CONFIG.activeCount, this.catalogObjects.length);
    let selected = shuffle(this.catalogObjects).slice(0, count);

    // A new round should visibly change. If the random subset happens to be the
    // same set as last time, swap one item with an unused catalog item.
    if (this.previousActiveIds.size === count) {
      const sameCount = selected.filter((item) => this.previousActiveIds.has(item.id)).length;
      if (sameCount === count) {
        const replacement = shuffle(this.catalogObjects).find((item) => !this.previousActiveIds.has(item.id));
        if (replacement) selected[selected.length - 1] = replacement;
      }
    }

    this.previousActiveIds = new Set(selected.map((item) => item.id));
    return selected;
  }

  setActiveObjects(activeObjects) {
    const activeSet = new Set(activeObjects.map((item) => item.id));
    this.objects = activeObjects;
    this.clickTargets = activeObjects.map((item) => item.hit);

    this.catalogObjects.forEach((object) => {
      const active = activeSet.has(object.id);
      object.active = active;
      object.found = false;
      object.feedbackKind = null;
      object.feedbackTime = 0;
      object.root.visible = active;
      object.hit.visible = active;
      object.halo.visible = false;
      if (active) {
        object.baseScale = object.catalogScale;
        object.root.scale.setScalar(object.baseScale);
      }
    });

    if (this.ui.completeObjects) {
      this.ui.completeObjects.textContent = activeObjects.map((item) => item.icon).join(' ');
    }
  }

  chooseSeparatedSlots(count) {
    const candidates = shuffle(ROOM_SLOTS);
    const selected = [];

    candidates.forEach((slot) => {
      if (selected.length >= count) return;
      const hasSpace = selected.every(
        (chosen) => distanceBetweenSlots(slot, chosen) >= HIDDEN_OBJECTS_CONFIG.minimumObjectSpacing,
      );
      if (hasSpace) selected.push(slot);
    });

    // The slot list is designed to satisfy the spacing requirement for 10
    // objects. The fallback still chooses the farthest remaining slot rather
    // than accepting the first random candidate if a future layout changes.
    while (selected.length < count) {
      const remaining = ROOM_SLOTS.filter((slot) => !selected.includes(slot));
      if (!remaining.length) break;
      remaining.sort((a, b) => {
        const minA = Math.min(...selected.map((chosen) => distanceBetweenSlots(a, chosen)));
        const minB = Math.min(...selected.map((chosen) => distanceBetweenSlots(b, chosen)));
        return minB - minA;
      });
      selected.push(remaining[0]);
    }

    return shuffle(selected);
  }

  applySlot(object, slot, savedRotation = null, savedScale = null) {
    const [x, y, z] = slot.position;
    const center = object.modelCenter ?? new THREE.Vector3();
    const roundScale = savedScale ?? object.catalogScale * (slot.scale ?? 1);
    const rotationY = savedRotation?.y ?? slot.rotationY + THREE.MathUtils.randFloatSpread(0.16);
    const rotationZ = savedRotation?.z ?? THREE.MathUtils.randFloatSpread(0.045);

    object.slotId = slot.id;
    object.baseScale = roundScale;
    object.root.position.set(x - center.x, y - center.y, z - center.z);
    object.root.rotation.set(0, rotationY, rotationZ);
    object.root.scale.setScalar(roundScale);
    object.homePosition.copy(object.root.position);
    object.homeRotation.copy(object.root.rotation);

    object.halo.position.set(x, y, z - 0.18);
    object.halo.scale.setScalar(Math.max(0.76, object.size * (slot.scale ?? 1)));
    object.hit.position.set(x, y, z + 0.12);
    object.hit.scale.setScalar(Math.max(0.72, object.size * 0.92 * (slot.scale ?? 1)));
    object.root.updateMatrixWorld(true);
  }

  layoutActiveObjects() {
    const slots = this.chooseSeparatedSlots(this.objects.length);
    this.objects.forEach((object, index) => {
      const slot = slots[index];
      if (slot) this.applySlot(object, slot);
    });
  }

  beginFreshRound() {
    const activeObjects = this.selectActiveObjects();
    this.setActiveObjects(activeObjects);
    this.layoutActiveObjects();

    HiddenObjectsGame.prototype.startNewGame.call(this);
    if (this.ui.completeObjects) {
      this.ui.completeObjects.textContent = this.objects.map((item) => item.icon).join(' ');
    }
    this.saveRound();
  }

  startNewGame() {
    if (!this.roundInitialized) {
      this.roundInitialized = true;
      if (this.restoreRound()) return undefined;
      this.beginFreshRound();
      return undefined;
    }

    // Keep the stability rule: no restart/re-layout while a round is active.
    if (!this.completed) return undefined;

    this.clearRound();
    this.beginFreshRound();
    return undefined;
  }

  saveRound() {
    if (!this.objects.length || !this.targetOrder.length) return;

    const snapshot = {
      version: 2,
      activeIds: this.objects.map((item) => item.id),
      orderIds: this.targetOrder.map((item) => item.id),
      foundIds: this.objects.filter((item) => item.found).map((item) => item.id),
      layout: this.objects.map((item) => ({
        id: item.id,
        slotId: item.slotId,
        rotationY: item.homeRotation.y,
        rotationZ: item.homeRotation.z,
        scale: item.baseScale,
      })),
      timeOfDay: this.timeOfDay,
      dayNightElapsed: this.dayNightElapsed,
      savedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // Gameplay remains valid when storage is unavailable.
    }
  }

  restoreRound() {
    let snapshot;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
        return false;
      }
      snapshot = JSON.parse(raw);
    } catch {
      return false;
    }

    if (!snapshot || snapshot.version !== 2) {
      this.clearRound();
      return false;
    }

    const byId = new Map(this.catalogObjects.map((item) => [item.id, item]));
    const activeIds = Array.isArray(snapshot.activeIds) ? snapshot.activeIds : [];
    const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds : [];
    const foundIds = Array.isArray(snapshot.foundIds) ? snapshot.foundIds : [];
    const layouts = Array.isArray(snapshot.layout) ? snapshot.layout : [];
    const count = Math.min(HIDDEN_OBJECTS_CONFIG.activeCount, this.catalogObjects.length);

    const validActive = activeIds.length === count
      && new Set(activeIds).size === count
      && activeIds.every((id) => byId.has(id));
    const validOrder = orderIds.length === count
      && new Set(orderIds).size === count
      && orderIds.every((id) => activeIds.includes(id));

    if (!validActive || !validOrder) {
      this.clearRound();
      return false;
    }

    const activeObjects = activeIds.map((id) => byId.get(id));
    this.previousActiveIds = new Set(activeIds);
    this.setActiveObjects(activeObjects);

    const layoutById = new Map(layouts.map((entry) => [entry.id, entry]));
    for (const object of activeObjects) {
      const saved = layoutById.get(object.id);
      const slot = saved ? SLOT_BY_ID.get(saved.slotId) : null;
      if (!saved || !slot) {
        this.clearRound();
        return false;
      }
      this.applySlot(
        object,
        slot,
        { y: Number(saved.rotationY) || 0, z: Number(saved.rotationZ) || 0 },
        Number(saved.scale) || object.catalogScale,
      );
    }

    const foundSet = new Set(foundIds.filter((id) => activeIds.includes(id)));
    if (foundSet.size >= activeObjects.length) {
      this.clearRound();
      return false;
    }

    this.targetOrder = orderIds.map((id) => byId.get(id));
    this.foundCount = foundSet.size;
    this.completed = false;
    this.inputLocked = false;
    this.pointerDown = null;

    activeObjects.forEach((object) => {
      object.found = foundSet.has(object.id);
      object.halo.visible = object.found;
      object.hit.visible = true;
      object.root.visible = true;
      object.root.position.copy(object.homePosition);
      object.root.rotation.copy(object.homeRotation);
      object.root.scale.setScalar(object.baseScale);
    });

    this.currentTarget = this.targetOrder.find((item) => !item.found) ?? null;
    this.targetIndex = Math.max(0, this.targetOrder.indexOf(this.currentTarget));
    if (!this.currentTarget) {
      this.clearRound();
      return false;
    }

    this.restoreDayNight(snapshot);
    this.ui.toast?.classList.remove('hidden-toast--show');
    this.ui.complete?.classList.remove('hidden-complete--show');
    if (this.ui.completeObjects) {
      this.ui.completeObjects.textContent = activeObjects.map((item) => item.icon).join(' ');
    }
    this.refreshUi();
    this.schedulePromptSpeech();
    return true;
  }

  restoreDayNight(snapshot) {
    const duration = HIDDEN_OBJECTS_CONFIG.dayNightDurationSeconds;
    let elapsed = Number(snapshot.dayNightElapsed) || 0;
    let isNight = snapshot.timeOfDay === 'night';
    const awaySeconds = Math.max(0, (Date.now() - (Number(snapshot.savedAt) || Date.now())) / 1000);
    elapsed += awaySeconds;

    while (elapsed >= duration) {
      elapsed -= duration;
      isNight = !isNight;
    }

    this.timeOfDay = isNight ? 'night' : 'day';
    this.dayNightElapsed = elapsed;
    this.targetTimeBlend = isNight ? 1 : 0;
    this.timeBlend = this.targetTimeBlend;
    this.applyTimeVisuals();
  }

  clearRound() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  toggleTimeOfDay() {
    this.timeOfDay = this.timeOfDay === 'day' ? 'night' : 'day';
    this.targetTimeBlend = this.timeOfDay === 'night' ? 1 : 0;
  }

  applyTimeVisuals() {
    const t = THREE.MathUtils.clamp(this.timeBlend, 0, 1);
    this.scene.background.copy(this.tmpColor.copy(this.dayColor).lerp(this.nightColor, t));

    if (this.material?.wall) {
      this.material.wall.color.copy(this.tmpColor.copy(this.dayWallColor).lerp(this.nightWallColor, t));
    }
    if (this.material?.floor) {
      this.material.floor.color.copy(this.tmpColor.copy(this.dayFloorColor).lerp(this.nightFloorColor, t));
    }
    if (this.material?.window) {
      this.material.window.color.copy(this.tmpColor.copy(this.dayWindowColor).lerp(this.nightWindowColor, t));
    }

    if (this.hemiLight) this.hemiLight.intensity = THREE.MathUtils.lerp(2.75, 1.35, t);
    if (this.keyLight) this.keyLight.intensity = THREE.MathUtils.lerp(1.55, 0.7, t);
    if (this.warmLight) {
      this.warmLight.intensity = THREE.MathUtils.lerp(4.8, 6.2, t);
      this.warmLight.color.setHex(t > 0.5 ? 0xffc98a : 0xffe0bd);
    }

    if (this.daySun?.material) this.daySun.material.opacity = 1 - t;
    if (this.nightMoon?.material) this.nightMoon.material.opacity = t;
    if (this.nightStars[0]?.material) this.nightStars[0].material.opacity = t * 0.9;
  }

  update(delta) {
    super.update(delta);

    const duration = HIDDEN_OBJECTS_CONFIG.dayNightDurationSeconds;
    this.dayNightElapsed += delta;
    while (this.dayNightElapsed >= duration) {
      this.dayNightElapsed -= duration;
      this.toggleTimeOfDay();
    }

    const transition = Math.max(0.1, HIDDEN_OBJECTS_CONFIG.dayNightTransitionSeconds);
    const difference = this.targetTimeBlend - this.timeBlend;
    if (Math.abs(difference) > 0.0001) {
      const step = Math.min(Math.abs(difference), delta / transition);
      this.timeBlend += Math.sign(difference) * step;
      this.applyTimeVisuals();
    }

    if (this.timeBlend > 0.05) {
      this.nightStars.forEach((star) => {
        const pulse = 0.85 + Math.sin(this.elapsed * 2.2 + star.userData.phase) * 0.18;
        star.scale.setScalar(pulse);
      });
    }
  }

  dispose() {
    if (!this.completed && this.objects.length) this.saveRound();
    this.catalogObjects.length = 0;
    this.allClickTargets.length = 0;
    this.nightStars.length = 0;
    super.dispose();
  }
}
