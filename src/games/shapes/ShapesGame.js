import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';

export class ShapesGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.dragPoint = new THREE.Vector3();
    this.dragOffset = new THREE.Vector3();
    this.blocks = [];
    this.holes = new Map();
    this.selected = null;
    this.matchedCount = 0;
    this.resetTimer = null;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfff0b5);

    const aspect = this.context.viewport.width / this.context.viewport.height;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 11);
    this.camera.lookAt(0, 0, 0);

    this.createLights();
    this.createBoardAndHoles();
    this.createBlocks();
    this.createUi();
    this.bindInput();
  }

  createLights() {
    const ambient = this.track(new THREE.HemisphereLight(0xffffff, 0xffd18c, 2.2));
    this.scene.add(ambient);

    const key = this.track(new THREE.DirectionalLight(0xffffff, 3.3));
    key.position.set(4, 6, 8);
    key.castShadow = true;
    this.scene.add(key);
  }

  createBoardAndHoles() {
    const board = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 3.2, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xffd785, roughness: 0.62 }),
    ));
    board.position.set(0, 1.7, -0.35);
    board.receiveShadow = true;
    this.scene.add(board);

    const holeDefs = [
      { type: 'circle', x: -2.6, geometry: new THREE.CircleGeometry(0.72, 48) },
      { type: 'square', x: 0, geometry: new THREE.PlaneGeometry(1.32, 1.32) },
      { type: 'triangle', x: 2.6, geometry: this.createTriangleGeometry(0.93) },
    ];

    holeDefs.forEach(({ type, x, geometry }) => {
      const hole = this.trackObject(new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: 0x5d6570,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
        }),
      ));
      hole.position.set(x, 1.7, -0.11);
      this.holes.set(type, hole);
      this.scene.add(hole);
    });
  }

  createTriangleGeometry(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 3; i += 1) {
      const angle = Math.PI / 2 + (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  createBlocks() {
    const definitions = [
      {
        type: 'circle',
        color: 0xff6f7f,
        start: new THREE.Vector3(-2.6, -2.0, 0.35),
        geometry: new THREE.SphereGeometry(0.72, 32, 24),
      },
      {
        type: 'square',
        color: 0x66d59a,
        start: new THREE.Vector3(0, -2.0, 0.35),
        geometry: new THREE.BoxGeometry(1.3, 1.3, 1.3),
      },
      {
        type: 'triangle',
        color: 0x65a9ff,
        start: new THREE.Vector3(2.6, -2.0, 0.35),
        geometry: new THREE.CylinderGeometry(0.85, 0.85, 1.1, 3),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
      },
    ];

    definitions.forEach((definition) => {
      const mesh = this.trackObject(new THREE.Mesh(
        definition.geometry,
        new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.38,
          metalness: 0.02,
        }),
      ));

      mesh.position.copy(definition.start);
      if (definition.rotation) mesh.rotation.copy(definition.rotation);
      mesh.castShadow = true;
      mesh.userData.type = definition.type;
      mesh.userData.startPosition = definition.start.clone();
      mesh.userData.matched = false;
      mesh.userData.celebrateTime = 0;

      this.blocks.push(mesh);
      this.scene.add(mesh);
    });
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    this.celebration = document.createElement('div');
    this.celebration.className = 'celebration-message';
    this.celebration.hidden = true;
    this.context.uiRoot.append(this.celebration);

    const refresh = () => {
      this.celebration.textContent = this.context.i18n.t('greatJob');
    };
    this.unsubscribeLanguage = this.context.i18n.subscribe(refresh);
    refresh();
  }

  /**
   * Raycaster đổi vị trí pointer từ pixel màn hình sang ray trong không gian 3D.
   * Khi giữ một khối, ray giao với mặt phẳng kéo z=0 để ngón tay di chuyển khối mượt.
   */
  bindInput() {
    const canvas = this.context.canvas;

    canvas.addEventListener('pointerdown', (event) => {
      this.updatePointer(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const hit = this.raycaster.intersectObjects(
        this.blocks.filter((block) => !block.userData.matched),
        false,
      )[0];

      if (!hit) return;

      this.selected = hit.object;
      canvas.setPointerCapture?.(event.pointerId);

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPoint)) {
        this.dragOffset.copy(this.selected.position).sub(this.dragPoint);
      }

      this.selected.scale.setScalar(1.08);
      this.context.audio.playTap();
    }, { signal: this.signal });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.selected) return;

      this.updatePointer(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPoint)) {
        this.selected.position.copy(this.dragPoint).add(this.dragOffset);
        this.selected.position.x = THREE.MathUtils.clamp(this.selected.position.x, -3.7, 3.7);
        this.selected.position.y = THREE.MathUtils.clamp(this.selected.position.y, -2.8, 2.7);
        this.selected.position.z = 0.35;
      }
    }, { signal: this.signal });

    const release = () => {
      if (!this.selected) return;
      this.tryMatch(this.selected);
      if (!this.selected.userData.matched) this.selected.scale.setScalar(1);
      this.selected = null;
    };

    canvas.addEventListener('pointerup', release, { signal: this.signal });
    canvas.addEventListener('pointercancel', release, { signal: this.signal });
  }

  updatePointer(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Kiểm tra khoảng cách Vector3 tới đúng lỗ.
   * Dưới ngưỡng 0.6 sẽ tự hút khối vào tâm lỗ và đánh dấu hoàn thành.
   */
  tryMatch(block) {
    const hole = this.holes.get(block.userData.type);
    if (!hole) return;

    if (block.position.distanceTo(hole.position) < 0.6) {
      block.userData.matched = true;
      block.userData.celebrateTime = 0.9;
      block.userData.targetPosition = new THREE.Vector3(hole.position.x, hole.position.y, 0.35);
      this.matchedCount += 1;
      this.context.audio.playSuccess();

      if (this.matchedCount === this.blocks.length) this.showCelebration();
    }
  }

  showCelebration() {
    this.celebration.hidden = false;
    this.celebration.classList.remove('celebration-message--show');
    requestAnimationFrame(() => {
      this.celebration?.classList.add('celebration-message--show');
    });

    this.resetTimer = window.setTimeout(() => this.resetGame(), 3000);
  }

  resetGame() {
    if (this.disposed) return;

    this.matchedCount = 0;
    this.celebration.hidden = true;
    this.blocks.forEach((block) => {
      block.position.copy(block.userData.startPosition);
      block.scale.setScalar(1);
      block.userData.matched = false;
      block.userData.celebrateTime = 0;
    });
  }

  update(delta, elapsed) {
    this.blocks.forEach((block, index) => {
      if (block.userData.matched && block.userData.targetPosition) {
        block.position.lerp(block.userData.targetPosition, 1 - Math.pow(0.001, delta));
      }

      if (block.userData.celebrateTime > 0) {
        block.userData.celebrateTime -= delta;
        block.rotation.y += delta * 10;
        const bounce = 1 + Math.sin(elapsed * 18 + index) * 0.12;
        block.scale.setScalar(bounce);
      } else if (block.userData.matched) {
        block.scale.x = THREE.MathUtils.lerp(block.scale.x, 1, 0.12);
        block.scale.y = THREE.MathUtils.lerp(block.scale.y, 1, 0.12);
        block.scale.z = THREE.MathUtils.lerp(block.scale.z, 1, 0.12);
      }
    });
  }

  resize(width, height) {
    if (!this.camera) return;

    const aspect = width / height;
    this.camera.aspect = aspect;

    // Portrait cần lùi camera để toàn bộ bảng 3 lỗ luôn nằm trong màn hình.
    if (aspect < 0.75) {
      this.camera.position.set(0, 0, 20.5);
      this.camera.fov = 48;
    } else if (aspect < 1.1) {
      this.camera.position.set(0, 0, 15);
      this.camera.fov = 44;
    } else {
      this.camera.position.set(0, 0, 11);
      this.camera.fov = 38;
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.clearTimeout(this.resetTimer);
    this.unsubscribeLanguage?.();
    this.hud?.dispose();
    super.dispose();
    this.blocks.length = 0;
    this.holes.clear();
    this.selected = null;
  }
}
