import * as THREE from 'three';
import { CrocodileBrushGame } from './CrocodileBrushGame.js';
import { BRUSH_CONFIG } from './brushConfig.js';

/**
 * Visual-only refresh for Brush Teeth.
 * Keeps the proven touch/cleaning/state logic from CrocodileBrushGame while
 * replacing the flat frog-like face and oversized dirt blobs with a friendlier
 * crocodile character and clearer teeth.
 */
export class CrocodileBrushVisualGame extends CrocodileBrushGame {
  createSharedResources() {
    super.createSharedResources();

    this.geometry.crocSphere = this.track(new THREE.SphereGeometry(1, 36, 24));
    this.geometry.crocSmallSphere = this.track(new THREE.SphereGeometry(1, 20, 14));
    this.geometry.crocDirt = this.track(new THREE.CircleGeometry(0.16, 18));

    this.material.crocGreen = this.track(new THREE.MeshStandardMaterial({
      color: 0x63c979,
      roughness: 0.78,
    }));
    this.material.crocGreenLight = this.track(new THREE.MeshStandardMaterial({
      color: 0x8ade8d,
      roughness: 0.76,
    }));
    this.material.crocGreenDark = this.track(new THREE.MeshStandardMaterial({
      color: 0x4daf68,
      roughness: 0.82,
    }));
    this.material.crocMouth = this.track(new THREE.MeshStandardMaterial({
      color: 0x74364f,
      roughness: 0.86,
    }));
    this.material.crocGum = this.track(new THREE.MeshStandardMaterial({
      color: 0xf3a1b0,
      roughness: 0.82,
    }));
    this.material.crocTongue = this.track(new THREE.MeshStandardMaterial({
      color: 0xe9859f,
      roughness: 0.84,
    }));
    this.material.crocBlush = this.track(new THREE.MeshBasicMaterial({
      color: 0xff9fb1,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }));
  }

  addCrocSphere(group, material, position, scale) {
    const mesh = new THREE.Mesh(this.geometry.crocSphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  createCrocodile() {
    const root = this.trackObject(new THREE.Group());

    // Back of the head: broad, but flatter than the previous giant circle.
    this.addCrocSphere(root, this.material.crocGreen, [0, 0.05, -3.35], [5.0, 4.25, 0.78]);

    // Long upper snout and rounded lower jaw make the silhouette read as a
    // crocodile instead of a frog. They stay behind the mouth/teeth layers.
    this.addCrocSphere(root, this.material.crocGreenLight, [0, 2.18, -2.55], [4.45, 1.48, 0.72]);
    this.addCrocSphere(root, this.material.crocGreenLight, [0, -2.28, -2.55], [4.55, 1.42, 0.74]);

    const mouth = new THREE.Mesh(this.geometry.circle, this.material.crocMouth);
    mouth.position.set(0, -0.05, -1.72);
    mouth.scale.set(4.15, 2.62, 1);
    root.add(mouth);

    const tongue = new THREE.Mesh(this.geometry.circle, this.material.crocTongue);
    tongue.position.set(0, -0.82, -1.46);
    tongue.scale.set(2.55, 0.72, 1);
    root.add(tongue);

    const topGum = new THREE.Mesh(this.geometry.circle, this.material.crocGum);
    topGum.position.set(0, 1.35, -1.18);
    topGum.scale.set(3.62, 0.43, 1);
    root.add(topGum);

    const bottomGum = new THREE.Mesh(this.geometry.circle, this.material.crocGum);
    bottomGum.position.set(0, -1.38, -1.18);
    bottomGum.scale.set(3.68, 0.43, 1);
    root.add(bottomGum);

    // Small raised eye sockets + smaller eyes are much less frog-like.
    [-2.05, 2.05].forEach((x) => {
      const socket = new THREE.Mesh(this.geometry.crocSmallSphere, this.material.crocGreenDark);
      socket.position.set(x, 3.18, -1.55);
      socket.scale.set(0.72, 0.72, 0.44);
      root.add(socket);

      const eye = new THREE.Mesh(this.geometry.eye, this.material.eye);
      eye.position.set(x, 3.2, -0.82);
      eye.scale.set(0.86, 0.86, 0.46);
      root.add(eye);

      const pupil = new THREE.Mesh(this.geometry.pupil, this.material.pupil);
      pupil.position.set(x + (x < 0 ? 0.05 : -0.05), 3.16, -0.28);
      pupil.scale.set(0.9, 0.9, 0.5);
      root.add(pupil);
    });

    // Nostrils sit on the long snout rather than floating in the face.
    [-0.52, 0.52].forEach((x) => {
      const nostril = new THREE.Mesh(this.geometry.pupil, this.material.nostril);
      nostril.position.set(x, 2.22, -0.18);
      nostril.scale.set(0.4, 0.28, 0.22);
      root.add(nostril);
    });

    // Soft cheek marks and three small scale bumps add a toy-character feel.
    [-3.2, 3.2].forEach((x) => {
      const blush = new THREE.Mesh(this.geometry.circle, this.material.crocBlush);
      blush.position.set(x, 0.82, -0.64);
      blush.scale.set(0.48, 0.2, 1);
      root.add(blush);
    });

    [-1.3, 0, 1.3].forEach((x, index) => {
      const bump = new THREE.Mesh(this.geometry.crocSmallSphere, this.material.crocGreenDark);
      bump.position.set(x, 4.02 - Math.abs(index - 1) * 0.08, -2.35);
      bump.scale.set(0.34, 0.24, 0.3);
      root.add(bump);
    });

    // Children were added after the root was initially tracked.
    this.trackObject(root);
    this.scene.add(root);
    this.crocodileRoot = root;
  }

  createTeeth() {
    const count = BRUSH_CONFIG.toothCountPerRow;

    for (let row = 0; row < 2; row += 1) {
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const x = THREE.MathUtils.lerp(-3.0, 3.0, t);
        const arch = Math.abs(x) / 3.0;
        const y = row === 0
          ? 0.98 + arch * 0.2
          : -1.03 - arch * 0.18;

        const root = this.trackObject(new THREE.Group());
        root.position.set(x, y, 0.06);
        root.rotation.z = (t - 0.5) * (row === 0 ? -0.08 : 0.08);

        const toothMaterial = this.track(new THREE.MeshStandardMaterial({
          color: 0xfff8de,
          roughness: 0.38,
          emissive: 0xfff4b2,
          emissiveIntensity: 0.02,
        }));

        const body = new THREE.Mesh(this.geometry.tooth, toothMaterial);
        body.scale.set(0.58, 0.78, 0.39);
        body.castShadow = true;
        root.add(body);

        const dirtMaterial = this.track(new THREE.MeshBasicMaterial({
          color: 0xa96f48,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
        }));

        // Use a few small plaque spots instead of one large brown disc covering
        // almost the whole tooth. The group still works with base cleaning code.
        const dirt = new THREE.Group();
        const patchLayout = [
          [-0.11, -0.05, 0.34, 0.88],
          [0.12, 0.08, 0.345, 0.62],
          [0.02, -0.2, 0.35, 0.48],
        ];
        patchLayout.forEach(([px, py, pz, scale], patchIndex) => {
          if ((i + row + patchIndex) % 4 === 3 && patchIndex === 2) return;
          const patch = new THREE.Mesh(this.geometry.crocDirt, dirtMaterial);
          patch.position.set(px + ((i % 2) * 0.025), py, pz);
          patch.scale.set(scale, scale * 0.72, 1);
          dirt.add(patch);
        });
        root.add(dirt);

        const shine = new THREE.Mesh(this.geometry.shine, this.material.shine);
        shine.position.set(-0.14, 0.18, 0.405);
        shine.visible = false;
        root.add(shine);

        this.trackObject(root);
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
}
