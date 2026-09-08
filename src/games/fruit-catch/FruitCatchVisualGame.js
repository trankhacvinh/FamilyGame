import * as THREE from 'three';
import { FruitCatchGame } from './FruitCatchGame.js';
import { FALLING_TYPES } from './fruitCatchConfig.js';

/**
 * Chỉ thay phần hiển thị của chuối và dâu tây.
 * Gameplay (điểm, tim, tốc độ, kéo giỏ) vẫn dùng nguyên từ FruitCatchGame.
 */
export class FruitCatchVisualGame extends FruitCatchGame {
  createSharedResources() {
    super.createSharedResources();

    const bananaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 0.12, 0),
      new THREE.Vector3(-0.38, -0.02, 0.02),
      new THREE.Vector3(0, -0.09, 0),
      new THREE.Vector3(0.38, -0.01, -0.02),
      new THREE.Vector3(0.72, 0.18, 0),
    ]);

    this.geometry.bananaBodyBetter = this.track(
      new THREE.TubeGeometry(bananaCurve, 28, 0.16, 12, false),
    );
    this.geometry.bananaRidge = this.track(
      new THREE.TubeGeometry(bananaCurve, 28, 0.018, 6, false),
    );
    this.geometry.bananaTip = this.track(new THREE.SphereGeometry(0.075, 10, 8));
    this.geometry.bananaStem = this.track(new THREE.CylinderGeometry(0.038, 0.055, 0.18, 8));

    this.geometry.strawberryBodyBetter = this.track(this.createStrawberryBodyGeometry());
    this.geometry.strawberryLeafBetter = this.track(new THREE.ConeGeometry(0.095, 0.32, 5));
    this.geometry.strawberrySeed = this.track(new THREE.SphereGeometry(0.028, 7, 6));

    this.material.bananaLight = this.track(new THREE.MeshStandardMaterial({
      color: 0xffef87,
      roughness: 0.72,
    }));
    this.material.bananaTip = this.track(new THREE.MeshStandardMaterial({
      color: 0x8a5a2e,
      roughness: 0.86,
    }));
    this.material.strawberrySeed = this.track(new THREE.MeshStandardMaterial({
      color: 0xffe7a3,
      roughness: 0.72,
    }));
  }

  /**
   * Tạo thân dâu từ SphereGeometry rồi bóp vertex để có dáng giọt nước:
   * phình ở vai quả, thuôn dần về đáy và không còn giống hình nón.
   */
  createStrawberryBodyGeometry() {
    const geometry = new THREE.SphereGeometry(0.48, 24, 20);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i += 1) {
      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      const normalizedY = THREE.MathUtils.clamp((y + 0.48) / 0.96, 0, 1);
      const shoulder = 0.62 + 0.5 * Math.pow(normalizedY, 0.58);
      const bottomTaper = y < 0 ? THREE.MathUtils.lerp(0.72, 1, normalizedY * 2) : 1;

      x *= shoulder * bottomTaper;
      z *= shoulder * bottomTaper * 0.94;

      if (y < -0.08) {
        y *= 1.22;
      } else if (y > 0.22) {
        y *= 0.9;
      }

      positions.setXYZ(i, x, y, z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  createFallingModel(type) {
    if (type === FALLING_TYPES.BANANA) {
      return this.createBetterBanana();
    }
    if (type === FALLING_TYPES.STRAWBERRY) {
      return this.createBetterStrawberry();
    }
    return super.createFallingModel(type);
  }

  createBetterBanana() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(this.geometry.bananaBodyBetter, this.material.banana);
    body.scale.set(1.04, 1.08, 0.9);
    group.add(body);

    // Một đường sáng nhỏ làm sống chuối, giúp khối cong đọc hình tốt hơn ở màn hình nhỏ.
    const ridge = new THREE.Mesh(this.geometry.bananaRidge, this.material.bananaLight);
    ridge.position.z = 0.145;
    group.add(ridge);

    const leftTip = new THREE.Mesh(this.geometry.bananaTip, this.material.bananaTip);
    leftTip.position.set(-0.73, 0.125, 0);
    leftTip.scale.set(0.9, 0.72, 0.72);

    const rightTip = new THREE.Mesh(this.geometry.bananaTip, this.material.bananaTip);
    rightTip.position.set(0.73, 0.185, 0);
    rightTip.scale.set(0.9, 0.72, 0.72);

    const stem = new THREE.Mesh(this.geometry.bananaStem, this.material.bananaTip);
    stem.position.set(0.78, 0.25, 0);
    stem.rotation.z = -0.72;

    group.add(leftTip, rightTip, stem);
    group.rotation.z = -0.08;
    group.scale.setScalar(1.04);

    this.prepareFruitMeshes(group);
    return group;
  }

  createBetterStrawberry() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      this.geometry.strawberryBodyBetter,
      this.material.strawberry,
    );
    body.position.y = -0.035;
    group.add(body);

    // Lá tỏa ra thành hình ngôi sao trên đầu quả.
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(this.geometry.strawberryLeafBetter, this.material.leaf);
      leaf.position.set(Math.cos(angle) * 0.15, 0.43, Math.sin(angle) * 0.1);
      leaf.rotation.z = Math.PI + Math.cos(angle) * 0.28;
      leaf.rotation.x = Math.sin(angle) * 0.3;
      leaf.rotation.y = angle;
      leaf.scale.set(1, 0.82, 1);
      group.add(leaf);
    }

    const seedPositions = [
      [-0.19, 0.25, 0.39], [0, 0.29, 0.43], [0.19, 0.24, 0.38],
      [-0.28, 0.08, 0.32], [-0.09, 0.1, 0.43], [0.12, 0.09, 0.42], [0.28, 0.06, 0.31],
      [-0.22, -0.1, 0.32], [0, -0.08, 0.42], [0.22, -0.1, 0.31],
      [-0.12, -0.27, 0.27], [0.12, -0.27, 0.27],
    ];

    seedPositions.forEach(([x, y, z]) => {
      const seed = new THREE.Mesh(this.geometry.strawberrySeed, this.material.strawberrySeed);
      seed.position.set(x, y, z);
      seed.scale.set(0.78, 1.08, 0.48);
      group.add(seed);
    });

    group.scale.setScalar(1.08);
    this.prepareFruitMeshes(group);
    return group;
  }

  prepareFruitMeshes(group) {
    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }
}
