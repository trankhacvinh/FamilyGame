import * as THREE from 'three';
import { CrocodileBrushGame } from './CrocodileBrushGame.js';
import { BRUSH_CONFIG } from './brushConfig.js';

function createTopToothShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.31, 0.32);
  shape.quadraticCurveTo(-0.34, 0.02, -0.25, -0.2);
  shape.quadraticCurveTo(-0.14, -0.43, 0, -0.47);
  shape.quadraticCurveTo(0.14, -0.43, 0.25, -0.2);
  shape.quadraticCurveTo(0.34, 0.02, 0.31, 0.32);
  shape.quadraticCurveTo(0, 0.4, -0.31, 0.32);
  return shape;
}

/**
 * Storybook / vector-like visual pass for Brush Teeth.
 *
 * The base game still owns brushing, touch input, progress, speech, bubbles and
 * completion. This subclass only changes the art direction and camera framing.
 */
export class StorybookCrocodileBrushGame extends CrocodileBrushGame {
  constructor(context) {
    super(context);
    this.storyTime = 0;
    this.ambientBubbles = [];
  }

  createLights() {
    // Keep lighting soft. Most face layers are intentionally flat materials so
    // the character reads like a children's picture book, not a 3D prototype.
    const hemi = this.track(new THREE.HemisphereLight(0xffffff, 0xcceee2, 1.8));
    this.scene.add(hemi);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 1.15));
    key.position.set(-3, 6, 8);
    this.scene.add(key);
  }

  createSharedResources() {
    super.createSharedResources();

    this.geometry.storyTooth = this.track(new THREE.ShapeGeometry(createTopToothShape(), 6));
    this.geometry.storyBubble = this.track(new THREE.RingGeometry(0.11, 0.145, 24));
    this.geometry.storyHandle = this.track(new THREE.CylinderGeometry(0.16, 0.19, 2.05, 18));
    this.geometry.storyGrip = this.track(new THREE.CylinderGeometry(0.22, 0.22, 0.62, 18));
    this.geometry.storyNeck = this.track(new THREE.CylinderGeometry(0.09, 0.11, 0.58, 14));
    this.geometry.storyBrushHead = this.track(new THREE.BoxGeometry(0.82, 0.28, 0.2));
    this.geometry.storyBrushCap = this.track(new THREE.SphereGeometry(0.15, 16, 10));
    this.geometry.storyBristle = this.track(new THREE.BoxGeometry(0.085, 0.25, 0.11));
    this.geometry.storyFloor = this.track(new THREE.PlaneGeometry(30, 1.45));

    const flat = (color, options = {}) => this.track(new THREE.MeshBasicMaterial({
      color,
      ...options,
    }));

    this.material.storyHead = flat(0x78d98d);
    this.material.storySnout = flat(0xa6e9a5);
    this.material.storyMouthRim = flat(0x4d9f72);
    this.material.storyMouth = flat(0x81465f);
    this.material.storyGum = flat(0xf7a6b8);
    this.material.storyTongue = flat(0xf17f9d);
    this.material.storyEye = flat(0xfffdf7);
    this.material.storyPupil = flat(0x35445b);
    this.material.storySpark = flat(0xffffff);
    this.material.storyNostril = flat(0x3d7556);
    this.material.storyCheek = flat(0xf4a7b7, {
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.material.storyBubble = flat(0xffffff, {
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.material.storyFloor = flat(0xd8f1ed);

    this.material.brushHandle.color.setHex(0x67a9ef);
    this.material.brushGrip.color.setHex(0x4f87d8);
    this.material.brushHead.color.setHex(0xfffbf4);
    this.material.bristleA.color.setHex(0xff91ae);
    this.material.bristleB.color.setHex(0x78d7ef);
  }

  addFlatEllipse(material, x, y, z, sx, sy) {
    const mesh = this.trackObject(new THREE.Mesh(this.geometry.circle, material));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, 1);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  createCrocodile() {
    this.scene.background = new THREE.Color(0xeaf8ff);

    // A quiet bathroom-like floor band keeps the background from feeling empty
    // without competing with the mouth and teeth.
    const floor = this.trackObject(new THREE.Mesh(this.geometry.storyFloor, this.material.storyFloor));
    floor.position.set(0, -4.25, -4.5);
    this.scene.add(floor);

    const bubbleSpecs = [
      [-3.15, 3.2, 0.9], [-2.7, 3.7, 0.55], [3.12, 3.35, 0.72],
      [2.72, 3.82, 0.44], [-3.45, -3.35, 0.62], [3.45, -3.25, 0.78],
    ];
    bubbleSpecs.forEach(([x, y, scale], index) => {
      const bubble = this.trackObject(new THREE.Mesh(this.geometry.storyBubble, this.material.storyBubble));
      bubble.position.set(x, y, -4.1);
      bubble.scale.setScalar(scale);
      this.scene.add(bubble);
      this.ambientBubbles.push({
        mesh: bubble,
        baseY: y,
        baseScale: scale,
        phase: index * 0.9,
      });
    });

    // Compact, friendly silhouette. It deliberately leaves breathing room
    // around the character instead of filling the entire viewport with a face.
    this.addFlatEllipse(this.material.storyHead, 0, -0.25, -2.55, 3.18, 2.78);
    this.addFlatEllipse(this.material.storySnout, 0, 1.52, -2.1, 2.7, 0.92);

    // Mouth layers: soft green lip -> berry cavity -> pink tongue/gums.
    this.addFlatEllipse(this.material.storyMouthRim, 0, -0.42, -1.45, 2.48, 1.53);
    this.addFlatEllipse(this.material.storyMouth, 0, -0.42, -1.1, 2.25, 1.31);
    this.addFlatEllipse(this.material.storyTongue, 0, -1.26, -0.45, 1.05, 0.43);
    this.addFlatEllipse(this.material.storyGum, 0, 0.53, -0.4, 1.98, 0.27);
    this.addFlatEllipse(this.material.storyGum, 0, -1.32, -0.4, 1.98, 0.27);

    // Simple flat eyes read better for toddlers than glossy protruding spheres.
    [-1.32, 1.32].forEach((x, index) => {
      const eye = this.addFlatEllipse(this.material.storyEye, x, 2.2, -0.35, 0.5, 0.57);
      eye.rotation.z = index === 0 ? -0.04 : 0.04;

      const pupil = this.addFlatEllipse(
        this.material.storyPupil,
        x + (index === 0 ? 0.035 : -0.035),
        2.16,
        -0.02,
        0.18,
        0.22,
      );
      pupil.rotation.z = eye.rotation.z;

      this.addFlatEllipse(
        this.material.storySpark,
        x - 0.055,
        2.25,
        0.05,
        0.055,
        0.07,
      );
    });

    [-0.35, 0.35].forEach((x) => {
      this.addFlatEllipse(this.material.storyNostril, x, 1.48, -0.12, 0.09, 0.065);
    });

    [-2.45, 2.45].forEach((x) => {
      this.addFlatEllipse(this.material.storyCheek, x, 0.62, -0.05, 0.31, 0.18);
    });
  }

  createTeeth() {
    const count = BRUSH_CONFIG.toothCountPerRow;

    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = THREE.MathUtils.lerp(-1.78, 1.78, t);
        const edgeLift = Math.abs(x) / 1.78;
        const y = row === 0
          ? 0.55 + edgeLift * 0.07
          : -1.3 - edgeLift * 0.06;

        const root = this.trackObject(new THREE.Group());
        root.position.set(x, y, 0.18);
        root.rotation.z = row === 0 ? 0 : Math.PI;

        const toothMaterial = this.track(new THREE.MeshStandardMaterial({
          color: 0xfffdf2,
          roughness: 0.36,
          metalness: 0,
          emissive: 0xfff3c7,
          emissiveIntensity: 0.02,
        }));
        const body = new THREE.Mesh(this.geometry.storyTooth, toothMaterial);
        body.scale.set(0.79, 0.82, 1);
        root.add(body);

        // Plaque is a small warm-gold smudge, not a large brown disk.
        const dirtMaterial = this.track(new THREE.MeshBasicMaterial({
          color: 0xd1a15f,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
        }));
        const dirt = new THREE.Mesh(this.geometry.dirt, dirtMaterial);
        const dirtX = ((i % 3) - 1) * 0.035;
        const dirtY = -0.08 + ((i + row) % 2) * 0.055;
        dirt.position.set(dirtX, dirtY, 0.035);
        dirt.scale.set(0.42 + (i % 2) * 0.06, 0.24 + (i % 3) * 0.025, 1);
        root.add(dirt);

        const shine = new THREE.Mesh(this.geometry.shine, this.material.shine);
        shine.position.set(-0.12, 0.13, 0.045);
        shine.scale.set(0.74, 0.74, 1);
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

  createBrush() {
    this.brush = this.trackObject(new THREE.Group());
    this.brush.position.set(this.brushWorld.x, this.brushWorld.y, 1.2);

    const handle = new THREE.Mesh(this.geometry.storyHandle, this.material.brushHandle);
    handle.position.set(0, -1.28, 0);
    this.brush.add(handle);

    const handleTop = new THREE.Mesh(this.geometry.storyBrushCap, this.material.brushHandle);
    handleTop.position.set(0, -0.27, 0);
    handleTop.scale.set(1.02, 1.02, 0.78);
    this.brush.add(handleTop);

    const handleBottom = new THREE.Mesh(this.geometry.storyBrushCap, this.material.brushHandle);
    handleBottom.position.set(0, -2.3, 0);
    handleBottom.scale.set(1.15, 1.15, 0.82);
    this.brush.add(handleBottom);

    const grip = new THREE.Mesh(this.geometry.storyGrip, this.material.brushGrip);
    grip.position.set(0, -1.78, 0.01);
    this.brush.add(grip);

    const neck = new THREE.Mesh(this.geometry.storyNeck, this.material.brushHead);
    neck.position.set(0, -0.18, 0);
    this.brush.add(neck);

    const head = new THREE.Mesh(this.geometry.storyBrushHead, this.material.brushHead);
    head.position.set(0, 0.11, 0);
    this.brush.add(head);

    [-0.42, 0.42].forEach((x) => {
      const cap = new THREE.Mesh(this.geometry.storyBrushCap, this.material.brushHead);
      cap.position.set(x, 0.11, 0);
      cap.scale.set(0.96, 0.96, 0.72);
      this.brush.add(cap);
    });

    for (let i = 0; i < 7; i += 1) {
      const bristle = new THREE.Mesh(
        this.geometry.storyBristle,
        i % 2 === 0 ? this.material.bristleA : this.material.bristleB,
      );
      bristle.position.set(-0.33 + i * 0.11, 0.34, 0.015);
      bristle.rotation.z = (i - 3) * 0.018;
      this.brush.add(bristle);
    }

    // Toothpaste foam makes the brush feel playful before the first swipe.
    [-0.18, 0.04, 0.24].forEach((x, index) => {
      const foam = new THREE.Mesh(this.geometry.storyBrushCap, this.material.storySpark);
      foam.position.set(x, 0.45 + (index % 2) * 0.035, 0.02);
      foam.scale.setScalar(0.3 + index * 0.035);
      this.brush.add(foam);
    });

    this.trackObject(this.brush);
    this.scene.add(this.brush);
  }

  startNewGame() {
    super.startNewGame();

    // Keep the idle brush close enough to invite interaction but outside the
    // mouth so it does not cover a tooth before the child starts.
    this.brushWorld.set(2.85, -2.7);
    this.lastBrushWorld.copy(this.brushWorld);
    this.brush.position.set(this.brushWorld.x, this.brushWorld.y, 1.2);
    this.brush.rotation.z = -0.18;
  }

  update(delta) {
    super.update(delta);
    this.storyTime += delta;

    this.ambientBubbles.forEach((bubble, index) => {
      bubble.mesh.position.y = bubble.baseY + Math.sin(this.storyTime * 0.75 + bubble.phase) * 0.08;
      const pulse = 1 + Math.sin(this.storyTime * 1.05 + index) * 0.035;
      bubble.mesh.scale.setScalar(bubble.baseScale * pulse);
    });
  }

  resize(width, height) {
    if (!this.camera) return;
    const aspect = Math.max(0.45, width / Math.max(height, 1));

    // Portrait gets a guaranteed minimum width so the whole head stays visible.
    // Landscape gets a shallower vertical framing so the character is not tiny.
    if (aspect < 1) {
      const halfWidth = 3.4;
      const halfHeight = halfWidth / aspect;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
      this.camera.top = halfHeight;
      this.camera.bottom = -halfHeight;
    } else {
      const halfHeight = 4.25;
      const halfWidth = halfHeight * aspect;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
      this.camera.top = halfHeight;
      this.camera.bottom = -halfHeight;
    }

    this.viewWidth = this.camera.right - this.camera.left;
    this.camera.updateProjectionMatrix();
  }
}
