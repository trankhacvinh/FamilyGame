import * as THREE from 'three';
import { createToyModel } from '../archaeology/modelFactory.js';
import { HiddenObjectsStableGame } from './HiddenObjectsStableGame.js';
import { HIDDEN_OBJECTS } from './hiddenObjectsConfig.js';

const ROOM_SLOTS = Object.freeze([
  { id: 'bed', position: [-3.38, -1.16, 0.72], rotationY: 0.12 },
  { id: 'floor-left', position: [-2.42, -1.96, 0.92], rotationY: -0.16 },
  { id: 'rug-left', position: [-1.35, -2.04, 0.96], rotationY: 0.08 },
  { id: 'rug-center', position: [-0.15, -2.04, 0.98], rotationY: -0.06 },
  { id: 'rug-right', position: [1.05, -2.0, 0.96], rotationY: 0.1 },
  { id: 'shelf-upper-left', position: [-0.72, 1.18, 0.62], rotationY: -0.08 },
  { id: 'shelf-upper-right', position: [0.32, 1.18, 0.62], rotationY: 0.08 },
  { id: 'shelf-middle-left', position: [0.52, 0.62, 0.72], rotationY: 0.12 },
  { id: 'shelf-middle-right', position: [1.52, 0.62, 0.72], rotationY: -0.12 },
  { id: 'table-left', position: [0.18, -0.28, 0.86], rotationY: 0.1 },
  { id: 'table-right', position: [1.48, -0.28, 0.86], rotationY: -0.1 },
  { id: 'bookcase-top', position: [3.2, 1.3, 0.62], rotationY: 0.12 },
  { id: 'bookcase-middle', position: [3.18, 0.34, 0.66], rotationY: -0.12 },
  { id: 'chest-top', position: [3.28, -1.22, 0.82], rotationY: 0.08 },
]);

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Hidden Objects visual/layout upgrade.
 * - Keeps the session-stability behavior from HiddenObjectsStableGame.
 * - Uses the same curved banana design language as Fruit Catcher.
 * - Reassigns toys to safe room slots for each real New Game / Play Again.
 */
export class HiddenObjectsShuffleGame extends HiddenObjectsStableGame {
  createLights() {
    // Softer shadows make small toy silhouettes easier to read.
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xc9bfd8, 2.75));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 1.75));
    key.position.set(-4, 7, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.00025;
    this.scene.add(key);

    const warm = this.track(new THREE.PointLight(0xffe0bd, 5.5, 15, 2));
    warm.position.set(3.2, 2.2, 4.5);
    this.scene.add(warm);
  }

  ensureBananaResources() {
    if (this.geometry.hiddenBananaBody) return;

    const bananaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.12, 0),
      new THREE.Vector3(-0.38, -0.02, 0.02),
      new THREE.Vector3(0, -0.09, 0),
      new THREE.Vector3(0.38, -0.01, -0.02),
      new THREE.Vector3(0.72, 0.18, 0),
    ]);

    this.geometry.hiddenBananaBody = this.track(
      new THREE.TubeGeometry(bananaCurve, 28, 0.16, 12, false),
    );
    this.geometry.hiddenBananaRidge = this.track(
      new THREE.TubeGeometry(bananaCurve, 28, 0.018, 6, false),
    );
    this.geometry.hiddenBananaTip = this.track(new THREE.SphereGeometry(0.075, 10, 8));
    this.geometry.hiddenBananaStem = this.track(new THREE.CylinderGeometry(0.038, 0.055, 0.18, 8));

    this.material.hiddenBanana = this.track(new THREE.MeshStandardMaterial({
      color: 0xffd84d,
      roughness: 0.66,
    }));
    this.material.hiddenBananaLight = this.track(new THREE.MeshStandardMaterial({
      color: 0xffef87,
      roughness: 0.72,
    }));
    this.material.hiddenBananaTip = this.track(new THREE.MeshStandardMaterial({
      color: 0x8a5a2e,
      roughness: 0.86,
    }));
  }

  createBetterBanana() {
    this.ensureBananaResources();
    const group = new THREE.Group();

    const body = new THREE.Mesh(this.geometry.hiddenBananaBody, this.material.hiddenBanana);
    body.scale.set(1.04, 1.08, 0.9);
    group.add(body);

    const ridge = new THREE.Mesh(this.geometry.hiddenBananaRidge, this.material.hiddenBananaLight);
    ridge.position.z = 0.145;
    group.add(ridge);

    const leftTip = new THREE.Mesh(this.geometry.hiddenBananaTip, this.material.hiddenBananaTip);
    leftTip.position.set(-0.73, 0.125, 0);
    leftTip.scale.set(0.9, 0.72, 0.72);

    const rightTip = new THREE.Mesh(this.geometry.hiddenBananaTip, this.material.hiddenBananaTip);
    rightTip.position.set(0.73, 0.185, 0);
    rightTip.scale.set(0.9, 0.72, 0.72);

    const stem = new THREE.Mesh(this.geometry.hiddenBananaStem, this.material.hiddenBananaTip);
    stem.position.set(0.78, 0.25, 0);
    stem.rotation.z = -0.72;

    group.add(leftTip, rightTip, stem);
    group.rotation.z = -0.08;
    group.scale.setScalar(1.04);

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    return group;
  }

  createHiddenObjectModel(id) {
    if (id === 'banana') return this.createBetterBanana();
    return createToyModel(id);
  }

  createHiddenObjects() {
    HIDDEN_OBJECTS.forEach((definition) => {
      const root = this.trackObject(this.createHiddenObjectModel(definition.id));
      root.rotation.y = definition.rotationY;
      root.updateMatrixWorld(true);

      const initialBounds = new THREE.Box3().setFromObject(root);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const fitScale = definition.size / Math.max(initialSize.x, initialSize.y, 0.001);
      root.scale.setScalar(fitScale);
      root.updateMatrixWorld(true);

      // Keep this center offset so the model can be moved to another slot without
      // rebuilding geometry or losing its visual center.
      const fittedBounds = new THREE.Box3().setFromObject(root);
      const modelCenter = fittedBounds.getCenter(new THREE.Vector3());
      const [x, y, z] = definition.position;
      root.position.set(x - modelCenter.x, y - modelCenter.y, z - modelCenter.z);
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
        modelCenter,
        slotId: null,
        homePosition: root.position.clone(),
        homeRotation: root.rotation.clone(),
      });
    });
  }

  layoutObjectsForNewRound() {
    if (!this.objects.length) return;

    const available = shuffle(ROOM_SLOTS);

    this.objects.forEach((object) => {
      // Prefer a different slot than this object used in the previous round.
      const differentIndex = available.findIndex((slot) => slot.id !== object.slotId);
      const slotIndex = differentIndex >= 0 ? differentIndex : 0;
      const [slot] = available.splice(slotIndex, 1);
      if (!slot) return;

      object.slotId = slot.id;
      const [x, y, z] = slot.position;
      const offset = object.modelCenter ?? new THREE.Vector3();

      object.root.position.set(x - offset.x, y - offset.y, z - offset.z);
      object.root.rotation.set(
        0,
        slot.rotationY + THREE.MathUtils.randFloatSpread(0.2),
        THREE.MathUtils.randFloatSpread(0.07),
      );
      object.homePosition.copy(object.root.position);
      object.homeRotation.copy(object.root.rotation);

      object.halo.position.set(x, y, z - 0.18);
      object.halo.scale.setScalar(Math.max(0.82, object.size * 1.05));
      object.hit.position.set(x, y, z + 0.12);
      object.hit.scale.setScalar(Math.max(0.78, object.size * 0.98));
      object.root.updateMatrixWorld(true);
    });
  }

  startNewGame() {
    // HiddenObjectsStableGame only permits initialization and completed-screen
    // Play Again. Match that rule so a stray active-round call never rearranges
    // the room underneath the child.
    const shouldCreateLayout = !this.roundInitialized || this.completed;
    if (shouldCreateLayout) this.layoutObjectsForNewRound();
    return super.startNewGame();
  }
}
