import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import { SHAPE_CATALOG, SHAPE_GAME_CONFIG, readShapeCount } from './shapeConfig.js';
import './shapes.css';

export class ShapesGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.dragPoint = new THREE.Vector3();
    this.dragOffset = new THREE.Vector3();
    this.projectPoint = new THREE.Vector3();

    this.blocks = [];
    this.holes = new Map();
    this.blockLabels = new Map();
    this.shapeCountButtons = new Map();
    this.shapeCount = readShapeCount();
    this.activeBlocks = [];
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
    this.camera.position.set(0, 0, 12.5);
    this.camera.lookAt(0, 0, 0);

    this.createLights();
    this.createBoardAndHoles();
    this.createBlocks();
    this.createUi();
    this.applyShapeCount(this.shapeCount, { persist: false });
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
    this.board = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xffd785, roughness: 0.62 }),
    ));
    this.board.position.set(0, 1.85, -0.35);
    this.board.receiveShadow = true;
    this.scene.add(this.board);

    SHAPE_CATALOG.forEach((definition) => {
      const hole = this.trackObject(new THREE.Mesh(
        this.createHoleGeometry(definition.geometry),
        new THREE.MeshBasicMaterial({
          color: 0x5d6570,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
        }),
      ));

      hole.position.z = -0.11;
      hole.visible = false;
      hole.userData.type = definition.id;
      hole.userData.nameKey = definition.nameKey;
      this.holes.set(definition.id, hole);
      this.scene.add(hole);
    });
  }

  createBlocks() {
    SHAPE_CATALOG.forEach((definition) => {
      const mesh = this.trackObject(new THREE.Mesh(
        this.createBlockGeometry(definition.geometry),
        new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.38,
          metalness: 0.02,
        }),
      ));

      mesh.position.z = 0.35;
      mesh.castShadow = true;
      mesh.visible = false;
      mesh.userData.type = definition.id;
      mesh.userData.nameKey = definition.nameKey;
      mesh.userData.matched = false;
      mesh.userData.celebrateTime = 0;
      mesh.userData.startPosition = new THREE.Vector3();
      mesh.userData.targetPosition = null;

      this.blocks.push(mesh);
      this.scene.add(mesh);
    });
  }

  createHoleGeometry(geometryType) {
    switch (geometryType) {
      case 'sphere':
        return new THREE.CircleGeometry(0.68, 48);
      case 'box':
        return new THREE.PlaneGeometry(1.18, 1.18);
      case 'trianglePrism':
        return this.createRegularPolygonGeometry(3, 0.82, Math.PI / 2);
      case 'rectangleBox':
        return new THREE.PlaneGeometry(1.42, 0.92);
      case 'starPrism':
        return new THREE.ShapeGeometry(this.createStarShape(0.78, 0.36));
      case 'hexagonPrism':
        return this.createRegularPolygonGeometry(6, 0.75, Math.PI / 6);
      default:
        return new THREE.CircleGeometry(0.68, 48);
    }
  }

  createBlockGeometry(geometryType) {
    switch (geometryType) {
      case 'sphere':
        return new THREE.SphereGeometry(0.68, 32, 24);
      case 'box':
        return new THREE.BoxGeometry(1.18, 1.18, 1.18);
      case 'trianglePrism': {
        const geometry = new THREE.CylinderGeometry(0.78, 0.78, 1, 3);
        geometry.rotateX(Math.PI / 2);
        return geometry;
      }
      case 'rectangleBox':
        return new THREE.BoxGeometry(1.42, 0.92, 0.92);
      case 'starPrism': {
        const geometry = new THREE.ExtrudeGeometry(this.createStarShape(0.78, 0.36), {
          depth: 0.58,
          steps: 1,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.06,
          bevelThickness: 0.06,
        });
        geometry.center();
        return geometry;
      }
      case 'hexagonPrism': {
        const geometry = new THREE.CylinderGeometry(0.72, 0.72, 0.92, 6);
        geometry.rotateX(Math.PI / 2);
        geometry.rotateZ(Math.PI / 6);
        return geometry;
      }
      default:
        return new THREE.SphereGeometry(0.68, 32, 24);
    }
  }

  createRegularPolygonGeometry(sides, radius, rotation = 0) {
    const shape = new THREE.Shape();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + (index * Math.PI * 2) / sides;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  createStarShape(outerRadius, innerRadius) {
    const shape = new THREE.Shape();
    const points = 10;
    for (let index = 0; index < points; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = Math.PI / 2 + (index * Math.PI) / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    this.countControl = document.createElement('div');
    this.countControl.className = 'shape-count-control';

    this.countLabel = document.createElement('span');
    this.countLabel.className = 'shape-count-control__label';
    this.countControl.append(this.countLabel);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'shape-count-control__buttons';

    SHAPE_GAME_CONFIG.countOptions.forEach((count) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shape-count-button';
      button.textContent = String(count);
      button.addEventListener('click', () => this.applyShapeCount(count), { signal: this.signal });
      this.shapeCountButtons.set(count, button);
      buttonGroup.append(button);
    });

    this.countControl.append(buttonGroup);
    this.context.uiRoot.append(this.countControl);

    this.celebration = document.createElement('div');
    this.celebration.className = 'celebration-message';
    this.celebration.hidden = true;
    this.context.uiRoot.append(this.celebration);

    this.blocks.forEach((block) => {
      const label = document.createElement('div');
      label.className = 'shape-name-label';
      label.hidden = true;
      this.context.uiRoot.append(label);
      this.blockLabels.set(block, label);
    });

    const refresh = () => {
      this.celebration.textContent = this.context.i18n.t('greatJob');
      this.countLabel.textContent = this.context.i18n.t('shapeCountLabel');
      this.blocks.forEach((block) => {
        const label = this.blockLabels.get(block);
        if (label) label.textContent = this.context.i18n.t(block.userData.nameKey);
      });
    };

    this.unsubscribeLanguage = this.context.i18n.subscribe(refresh);
    refresh();
  }

  /**
   * Đổi số lượng shape đang chơi mà không tạo lại geometry/material.
   * Tất cả 6 shape được tạo một lần; shape không dùng chỉ được hidden,
   * giúp thay cấu hình nhanh và tránh tạo/huỷ tài nguyên GPU liên tục.
   */
  applyShapeCount(count, { persist = true } = {}) {
    const safeCount = SHAPE_GAME_CONFIG.countOptions.includes(count)
      ? count
      : SHAPE_GAME_CONFIG.defaultCount;

    window.clearTimeout(this.resetTimer);
    this.resetTimer = null;
    this.shapeCount = safeCount;
    if (persist) localStorage.setItem(SHAPE_GAME_CONFIG.storageKey, String(safeCount));

    this.shapeCountButtons.forEach((button, buttonCount) => {
      const selected = buttonCount === safeCount;
      button.classList.toggle('shape-count-button--active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const holePositions = this.getGridPositions(safeCount, 'holes');
    const blockPositions = this.getGridPositions(safeCount, 'blocks');

    this.matchedCount = 0;
    this.selected = null;
    this.celebration.hidden = true;
    this.activeBlocks = this.blocks.slice(0, safeCount);

    this.blocks.forEach((block, index) => {
      const active = index < safeCount;
      block.visible = active;
      block.userData.matched = false;
      block.userData.celebrateTime = 0;
      block.userData.targetPosition = null;
      block.scale.setScalar(1);

      const label = this.blockLabels.get(block);
      if (label) label.hidden = !active;

      if (active) {
        const start = blockPositions[index];
        block.userData.startPosition.copy(start);
        block.position.copy(start);
        block.rotation.set(0, 0, 0);
      }
    });

    SHAPE_CATALOG.forEach((definition, index) => {
      const hole = this.holes.get(definition.id);
      const active = index < safeCount;
      hole.visible = active;
      if (active) hole.position.copy(holePositions[index]);
    });

    const maxAbsX = Math.max(...holePositions.map((position) => Math.abs(position.x)));
    const boardHeight = safeCount <= 4 ? 2.55 : 3.75;
    const boardCenterY = safeCount <= 4 ? 1.85 : 1.9;
    this.board.position.y = boardCenterY;
    this.board.scale.set(maxAbsX * 2 + 2.2, boardHeight, 1);

    this.resize(this.context.viewport.width, this.context.viewport.height);
  }

  getGridPositions(count, area) {
    const oneRow = count <= 4;
    const columns = oneRow ? count : 3;
    const xGap = count === 3 ? 2.65 : oneRow ? 2.12 : 2.35;
    const firstY = area === 'holes'
      ? (oneRow ? 1.85 : 2.68)
      : (oneRow ? -1.85 : -1.0);
    const rowGap = -1.55;
    const z = area === 'holes' ? -0.11 : 0.35;
    const positions = [];

    let index = 0;
    let row = 0;
    while (index < count) {
      const itemsThisRow = Math.min(columns, count - index);
      const startX = -((itemsThisRow - 1) * xGap) / 2;

      for (let column = 0; column < itemsThisRow; column += 1) {
        positions.push(new THREE.Vector3(
          startX + column * xGap,
          firstY + row * rowGap,
          z,
        ));
        index += 1;
      }
      row += 1;
    }

    return positions;
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
        this.activeBlocks.filter((block) => block.visible && !block.userData.matched),
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
        this.selected.position.x = THREE.MathUtils.clamp(this.selected.position.x, -4.1, 4.1);
        this.selected.position.y = THREE.MathUtils.clamp(this.selected.position.y, -3.25, 3.35);
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
   * Dưới ngưỡng 0.7 sẽ tự hút khối vào tâm lỗ và đánh dấu hoàn thành.
   */
  tryMatch(block) {
    const hole = this.holes.get(block.userData.type);
    if (!hole?.visible) return;

    if (block.position.distanceTo(hole.position) < 0.7) {
      block.userData.matched = true;
      block.userData.celebrateTime = 0.9;
      block.userData.targetPosition = new THREE.Vector3(hole.position.x, hole.position.y, 0.35);
      this.matchedCount += 1;
      this.context.audio.playSuccess();

      if (this.matchedCount === this.activeBlocks.length) this.showCelebration();
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
    this.activeBlocks.forEach((block) => {
      block.position.copy(block.userData.startPosition);
      block.rotation.set(0, 0, 0);
      block.scale.setScalar(1);
      block.userData.matched = false;
      block.userData.celebrateTime = 0;
      block.userData.targetPosition = null;
    });
  }

  update(delta, elapsed) {
    this.activeBlocks.forEach((block, index) => {
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

      this.updateBlockLabel(block);
    });
  }

  updateBlockLabel(block) {
    const label = this.blockLabels.get(block);
    if (!label || !block.visible) return;

    this.projectPoint.copy(block.position);
    this.projectPoint.y -= 0.93;
    this.projectPoint.project(this.camera);

    const x = (this.projectPoint.x * 0.5 + 0.5) * this.context.viewport.width;
    const y = (-this.projectPoint.y * 0.5 + 0.5) * this.context.viewport.height;
    label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  resize(width, height) {
    if (!this.camera) return;

    const aspect = width / height;
    this.camera.aspect = aspect;
    const crowded = this.shapeCount >= 5;

    if (aspect < 0.75) {
      this.camera.position.set(0, 0, crowded ? 24.5 : 21.5);
      this.camera.fov = crowded ? 50 : 48;
    } else if (aspect < 1.1) {
      this.camera.position.set(0, 0, crowded ? 18 : 15.5);
      this.camera.fov = crowded ? 47 : 44;
    } else {
      this.camera.position.set(0, 0, crowded ? 14.2 : 12.2);
      this.camera.fov = crowded ? 42 : 38;
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.clearTimeout(this.resetTimer);
    this.unsubscribeLanguage?.();
    this.hud?.dispose();
    this.countControl?.remove();
    this.celebration?.remove();
    this.blockLabels.forEach((label) => label.remove());
    super.dispose();
    this.blocks.length = 0;
    this.activeBlocks.length = 0;
    this.holes.clear();
    this.blockLabels.clear();
    this.shapeCountButtons.clear();
    this.selected = null;
  }
}
