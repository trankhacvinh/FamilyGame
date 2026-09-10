import * as THREE from 'three';
import { CrocodileBrushGame } from './CrocodileBrushGame.js';
import { BRUSH_CONFIG } from './brushConfig.js';

/**
 * Visual-only upgrade for Brush Teeth.
 * Keeps all brushing/progress/bubble/input logic from CrocodileBrushGame while
 * replacing the flat face with a rounder, layered, kid-friendly crocodile.
 */
export class FriendlyCrocodileBrushGame extends CrocodileBrushGame {
  createSharedResources() {
    super.createSharedResources();

    this.geometry.friendlyBlob = this.track(new THREE.SphereGeometry(1, 40, 28));
    this.geometry.eyeSpark = this.track(new THREE.SphereGeometry(0.055, 10, 8));

    // Softer palette than the original neon-flat face.
    this.material.face.color.setHex(0x69c977);
    this.material.faceLight.color.setHex(0x94df91);
    this.material.mouth.color.setHex(0x73324d);
    this.material.gum.color.setHex(0xf49aaa);
    this.material.nostril.color.setHex(0x315b45);

    this.material.faceBack = this.track(new THREE.MeshStandardMaterial({
      color: 0x55b966,
      roughness: 0.78,
    }));
    this.material.mouthRim = this.track(new THREE.MeshStandardMaterial({
      color: 0x4b7e54,
      roughness: 0.82,
    }));
    this.material.tongue = this.track(new THREE.MeshStandardMaterial({
      color: 0xe9708f,
      roughness: 0.72,
    }));
    this.material.cheek = this.track(new THREE.MeshBasicMaterial({
      color: 0xf6a5b5,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }));
    this.material.eyeSpark = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  }

  addFriendlyBlob(material, x, y, z, sx, sy, sz = 0.6) {
    const mesh = this.trackObject(new THREE.Mesh(this.geometry.friendlyBlob, material));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.scene.add(mesh);
    return mesh;
  }

  createCrocodile() {
    this.scene.background = new THREE.Color(0xe4f7ff);

    // Head silhouette + rounded cheeks create real volume instead of one flat disk.
    this.addFriendlyBlob(this.material.faceBack, 0, -0.05, -3.55, 4.65, 4.05, 0.74);
    this.addFriendlyBlob(this.material.face, 0, -2.28, -2.95, 4.22, 1.68, 0.7);
    this.addFriendlyBlob(this.material.faceLight, 0, 2.12, -2.9, 3.92, 1.52, 0.66);

    // Small side cheeks make the mouth feel attached to the face rather than pasted on it.
    this.addFriendlyBlob(this.material.face, -3.58, -0.28, -2.55, 1.02, 2.25, 0.58);
    this.addFriendlyBlob(this.material.face, 3.58, -0.28, -2.55, 1.02, 2.25, 0.58);

    // Mouth rim, cavity, tongue and gums are layered front-to-back.
    this.addEllipse(this.material.mouthRim, 0, -0.12, -1.92, 3.92, 2.42);
    this.addEllipse(this.material.mouth, 0, -0.12, -1.62, 3.58, 2.08);
    this.addFriendlyBlob(this.material.tongue, 0, -1.28, -0.86, 1.65, 0.66, 0.25);
    this.addEllipse(this.material.gum, 0, 1.03, -0.72, 3.24, 0.48);
    this.addEllipse(this.material.gum, 0, -1.04, -0.72, 3.24, 0.48);

    // Friendly, slightly smaller eyes with eyelid/brow volume and a white catchlight.
    [-1.72, 1.72].forEach((x, index) => {
      const brow = this.addFriendlyBlob(
        this.material.faceBack,
        x,
        3.14,
        -1.2,
        0.72,
        0.28,
        0.28,
      );
      brow.rotation.z = index === 0 ? -0.08 : 0.08;

      const eye = this.trackObject(new THREE.Mesh(this.geometry.eye, this.material.eye));
      eye.position.set(x, 2.86, -0.42);
      eye.scale.set(0.88, 0.92, 0.5);
      this.scene.add(eye);

      const pupil = this.trackObject(new THREE.Mesh(this.geometry.pupil, this.material.pupil));
      pupil.position.set(x + (index === 0 ? 0.035 : -0.035), 2.82, 0.08);
      pupil.scale.set(0.78, 0.86, 0.42);
      this.scene.add(pupil);

      const spark = this.trackObject(new THREE.Mesh(this.geometry.eyeSpark, this.material.eyeSpark));
      spark.position.set(x - 0.055, 2.9, 0.22);
      spark.scale.set(0.8, 0.8, 0.4);
      this.scene.add(spark);
    });

    // Short snout + close nostrils read more like a crocodile face from the front.
    [-0.48, 0.48].forEach((x) => {
      const nostril = this.trackObject(new THREE.Mesh(this.geometry.pupil, this.material.nostril));
      nostril.position.set(x, 2.05, -0.2);
      nostril.scale.set(0.38, 0.26, 0.22);
      this.scene.add(nostril);
    });

    [-3.02, 3.02].forEach((x) => {
      const cheek = this.trackObject(new THREE.Mesh(this.geometry.circle, this.material.cheek));
      cheek.position.set(x, 1.02, -0.18);
      cheek.scale.set(0.44, 0.24, 1);
      this.scene.add(cheek);
    });
  }

  createTeeth() {
    const count = BRUSH_CONFIG.toothCountPerRow;

    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = THREE.MathUtils.lerp(-2.92, 2.92, t);
        const arch = Math.abs(x) / 2.92;
        const y = row === 0
          ? 0.86 + arch * 0.14
          : -0.88 - arch * 0.14;

        const root = this.trackObject(new THREE.Group());
        root.position.set(x, y, 0.08);
        root.rotation.z = (t - 0.5) * (row === 0 ? -0.08 : 0.08);

        const toothMaterial = this.track(new THREE.MeshStandardMaterial({
          color: 0xfffdf1,
          roughness: 0.34,
          emissive: 0xfff4c8,
          emissiveIntensity: 0.025,
        }));
        const body = new THREE.Mesh(this.geometry.tooth, toothMaterial);
        body.scale.set(0.58, 0.78, 0.4);
        body.castShadow = false;
        root.add(body);

        // Smaller, warmer plaque patch: obvious enough to brush but not a giant brown disk.
        const dirtMaterial = this.track(new THREE.MeshBasicMaterial({
          color: 0xb8794d,
          transparent: true,
          opacity: 0.68,
          depthWrite: false,
        }));
        const dirt = new THREE.Mesh(this.geometry.dirt, dirtMaterial);
        const dirtX = ((i % 3) - 1) * 0.055;
        const dirtY = ((i + row) % 2 === 0 ? 0.035 : -0.035);
        dirt.position.set(dirtX, dirtY, 0.42);
        dirt.scale.set(0.62 + (i % 2) * 0.09, 0.48 + (i % 3) * 0.055, 1);
        root.add(dirt);

        const shine = new THREE.Mesh(this.geometry.shine, this.material.shine);
        shine.position.set(-0.15, 0.17, 0.45);
        shine.scale.set(0.86, 0.86, 1);
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

  brushTeeth(travel) {
    super.brushTeeth(travel);

    // The base game intentionally owns the cleaning algorithm. Reapply this
    // visual layer's gentler plaque opacity after each cleaning step.
    this.teeth.forEach((tooth) => {
      if (!tooth.cleaned) tooth.dirtMaterial.opacity = 0.68 * (1 - tooth.progress);
    });
  }

  startNewGame() {
    super.startNewGame();

    // Base reset uses the V1 tooth palette; restore the friendlier V2 palette.
    this.teeth.forEach((tooth) => {
      tooth.dirtMaterial.opacity = 0.68;
      tooth.toothMaterial.color.setHex(0xfffdf1);
      tooth.toothMaterial.emissive.setHex(0xfff4c8);
      tooth.toothMaterial.emissiveIntensity = 0.025;
    });
  }
}
