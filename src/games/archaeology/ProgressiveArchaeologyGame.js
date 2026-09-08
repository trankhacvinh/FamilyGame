import * as THREE from 'three';
import { ArchaeologyGame } from './ArchaeologyGame.js';
import { getRandomItem, makeAnswerOptions } from './archaeologyCatalog.js';
import { createToyModel } from './modelFactory.js';

const PHASE = Object.freeze({
  BREAKING: 'BREAKING',
  CHOOSING: 'CHOOSING',
  SOLVED: 'SOLVED',
});

const TILE_COUNT = 9;
const QUIZ_AFTER_HITS = 6;

/**
 * Phiên bản đơn giản và dễ kiểm soát hơn:
 * - đúng 9 phiến đá xếp theo lưới 3x3 và che kín vật thể;
 * - vật thể được auto-fit lớn phía sau lớp đá;
 * - mỗi lần chạm rơi ngẫu nhiên đúng 1 phiến chưa vỡ;
 * - sau 6 phiến mới hiện câu hỏi, 3 phiến còn lại vẫn che vật thể;
 * - chỉ khi trả lời đúng mới phá hết các phiến còn lại.
 */
export class ProgressiveArchaeologyGame extends ArchaeologyGame {
  constructor(context) {
    super(context);
    this.coverTiles = [];
    this.remainingTileIndexes = [];
    this.revealedTileIndexes = [];
    this.secretBaseScale = 1;
  }

  /** Làm mặt BoxGeometry hơi lồi lõm nhưng giữ nguyên biên để 9 ô vẫn che kín. */
  createStoneTileGeometry(width, height, depth, seed = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth, 3, 3, 1);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const onFrontOrBack = Math.abs(z) > depth * 0.45;
      const bump = onFrontOrBack
        ? Math.sin(x * 4.2 + y * 3.7 + seed * 1.31) * depth * 0.055
        : 0;
      position.setZ(i, z + bump);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  createRock() {
    this.rockRoot = this.trackObject(new THREE.Group());
    this.rockRoot.position.set(0, 1.1, 0);
    this.scene.add(this.rockRoot);

    this.cavityMaterial = this.track(new THREE.MeshStandardMaterial({
      color: 0x5b4b40,
      roughness: 1,
      transparent: true,
      opacity: 0.28,
    }));

    this.rockCavity = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 3.35, 0.5),
      this.cavityMaterial,
    ));
    this.rockCavity.position.set(0, 0, -0.95);
    this.rockCavity.receiveShadow = true;
    this.rockRoot.add(this.rockCavity);

    // Vùng chạm lớn để bé có thể bấm bất kỳ đâu trên khung đá.
    this.rockHitTarget = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(4.05, 3.55, 1.7),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ));
    this.rockHitTarget.position.z = 0.8;
    this.rockHitTarget.userData.rockHit = true;
    this.rockRoot.add(this.rockHitTarget);
    this.rockHitMeshes = [this.rockHitTarget];

    this.coverTiles = [];
    const tileWidth = 1.34;
    const tileHeight = 1.16;
    const stepX = 1.24;
    const stepY = 1.08;
    const palette = [0xa98d76, 0xb2967e, 0x9f846f, 0xb18f75, 0xa08470];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const index = row * 3 + col;
        const material = this.track(new THREE.MeshStandardMaterial({
          color: palette[index % palette.length],
          roughness: 0.97,
          metalness: 0,
          transparent: true,
          opacity: 1,
          flatShading: true,
        }));

        const tile = this.trackObject(new THREE.Mesh(
          this.createStoneTileGeometry(tileWidth, tileHeight, 0.52, index + 1),
          material,
        ));
        tile.position.set((col - 1) * stepX, (1 - row) * stepY, 0.52);
        tile.castShadow = true;
        tile.receiveShadow = true;
        tile.userData.index = index;
        tile.userData.detaching = false;
        tile.userData.detachLife = 0;
        tile.userData.homePosition = tile.position.clone();
        tile.userData.homeRotation = tile.rotation.clone();
        tile.userData.velocity = new THREE.Vector3();
        tile.userData.spin = new THREE.Vector3();
        this.rockRoot.add(tile);
        this.coverTiles.push(tile);
      }
    }

    // Bản 3x3 không cần crack line nổi phía trước vì sẽ tạo cảm giác "vẽ" trên lỗ đã mở.
    this.cracks = [];
  }

  shuffleTileIndexes() {
    const indexes = Array.from({ length: TILE_COUNT }, (_, index) => index);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes;
  }

  fitSecretModelToRock(model, targetWidth = 3.15, targetHeight = 2.75) {
    model.scale.setScalar(1);
    model.position.set(0, 0, -0.68);
    model.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = Math.min(
      targetWidth / Math.max(size.x, 0.001),
      targetHeight / Math.max(size.y, 0.001),
    );
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);

    box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const targetWorld = this.rockRoot.localToWorld(new THREE.Vector3(0, 0, -0.68));
    model.position.x += targetWorld.x - center.x;
    model.position.y += targetWorld.y - center.y;
    model.position.z += targetWorld.z - center.z;
    model.updateMatrixWorld(true);

    this.secretBaseScale = model.scale.x;
  }

  hitRock(point) {
    if (this.phase !== PHASE.BREAKING) return;
    if (this.hitCount >= this.requiredHits) return;

    const tileIndex = this.remainingTileIndexes.shift();
    const tile = this.coverTiles[tileIndex];
    if (!tile) return;

    this.hitCount += 1;
    this.revealedTileIndexes.push(tileIndex);
    this.rockShakeTime = 0.22;
    this.detachTile(tile, 1);
    this.spawnRockParticles(point, 10);
    this.context.audio.playCrack?.();
    this.refreshProgress();

    if (this.hitCount >= this.requiredHits) this.revealQuestion();
  }

  detachTile(tile, power = 1) {
    if (!tile || tile.userData.detaching || !tile.visible) return;

    tile.userData.detaching = true;
    tile.userData.detachLife = 1.05 + Math.random() * 0.25;
    const home = tile.userData.homePosition;
    const xDirection = Math.sign(home.x || THREE.MathUtils.randFloatSpread(1)) || 1;
    const yDirection = Math.sign(home.y || 1);

    tile.userData.velocity.set(
      (xDirection * THREE.MathUtils.randFloat(1.2, 2.5) + THREE.MathUtils.randFloatSpread(0.6)) * power,
      (THREE.MathUtils.randFloat(1.3, 2.9) + yDirection * 0.25) * power,
      THREE.MathUtils.randFloat(1.0, 2.4) * power,
    );
    tile.userData.spin.set(
      THREE.MathUtils.randFloatSpread(4.5),
      THREE.MathUtils.randFloatSpread(4.5),
      THREE.MathUtils.randFloatSpread(5.5),
    );
  }

  revealQuestion() {
    this.phase = PHASE.CHOOSING;
    this.splitProgress = 0;
    this.rockHitTarget.visible = false;

    // Quan trọng: KHÔNG phá thêm đá ở đây. Ba ô chưa vỡ vẫn che model.
    this.answerSlots.forEach((slot) => { slot.visible = true; });
    this.answerLabels.forEach((label) => { label.hidden = false; });
    this.question.hidden = false;
    this.feedback.hidden = true;
    this.context.audio.playReveal?.();
    this.refreshProgress();

    this.context.speech.speak(
      this.context.i18n.t('archQuestion'),
      this.context.i18n.language,
    );
  }

  solveRound(index) {
    this.phase = PHASE.SOLVED;
    this.solvedTime = 0;
    this.question.hidden = true;
    this.feedback.textContent = `${this.context.i18n.t('archCorrect')} ${this.context.i18n.t(this.currentItem.nameKey)} 🎉`;
    this.feedback.classList.remove('arch-feedback--wrong');
    this.feedback.classList.add('arch-feedback--success');
    this.feedback.hidden = false;

    this.answerSlots.forEach((slot, slotIndex) => {
      const card = slot.userData.card;
      if (card) card.material.color.set(slotIndex === index ? 0xbff2ca : 0xfff7e1);
    });

    this.coverTiles.forEach((tile) => {
      if (tile.visible && !tile.userData.detaching) this.detachTile(tile, 1.7);
    });
    this.spawnRockParticles(new THREE.Vector3(0, 1.05, 0.9), 40);
    this.spawnFireworks(new THREE.Vector3(0, 1.2, 1.0));
    this.context.audio.playSuccess();
    this.refreshProgress();

    this.context.speech.speak([
      this.context.i18n.t('archCorrect'),
      this.context.i18n.t(this.currentItem.nameKey),
    ], this.context.i18n.language);
  }

  startNewRound() {
    this.disposeRoundModels();
    this.clearTransientParticles();

    const previousId = this.currentItem?.id ?? null;
    this.currentItem = getRandomItem(previousId);
    this.answerOptions = makeAnswerOptions(this.currentItem);
    this.requiredHits = QUIZ_AFTER_HITS;
    this.hitCount = 0;
    this.phase = PHASE.BREAKING;
    this.rockShakeTime = 0;
    this.splitProgress = 0;
    this.solvedTime = 0;
    this.wrongTime = 0;
    this.wrongSlotIndex = -1;
    this.remainingTileIndexes = this.shuffleTileIndexes();
    this.revealedTileIndexes = [];

    this.rockRoot.visible = true;
    this.rockRoot.position.set(0, 1.1, 0);
    this.rockRoot.rotation.set(0, 0, 0);
    this.rockRoot.scale.setScalar(1);
    this.rockHitTarget.visible = true;
    this.cavityMaterial.opacity = 0.28;
    this.rockCavity.visible = true;

    this.coverTiles.forEach((tile) => {
      tile.visible = true;
      tile.userData.detaching = false;
      tile.userData.detachLife = 0;
      tile.position.copy(tile.userData.homePosition);
      tile.rotation.copy(tile.userData.homeRotation);
      tile.userData.velocity.set(0, 0, 0);
      tile.userData.spin.set(0, 0, 0);
      tile.material.opacity = 1;
    });

    // Model luôn tồn tại và được render phía sau 9 ô; ban đầu bị che kín hoàn toàn.
    this.secretModel = createToyModel(this.currentItem.id);
    this.secretModel.visible = true;
    this.rockRoot.add(this.secretModel);
    this.dynamicModels.push(this.secretModel);
    this.fitSecretModelToRock(this.secretModel);

    this.answerOptions.forEach((item, answerIndex) => {
      const preview = createToyModel(item.id);
      preview.scale.setScalar(0.47);
      preview.position.set(0, 0.12, 0.32);
      preview.userData.answerIndex = answerIndex;
      preview.traverse((child) => { child.userData.answerIndex = answerIndex; });
      this.answerSlots[answerIndex].add(preview);
      this.answerSlots[answerIndex].userData.preview = preview;
      this.dynamicModels.push(preview);
      this.answerSlots[answerIndex].visible = false;
      this.answerSlots[answerIndex].rotation.set(0, 0, 0);
      this.answerSlots[answerIndex].userData.card.material.color.set(0xfff7e1);
      this.answerLabels[answerIndex].textContent = this.context.i18n.t(item.nameKey);
      this.answerLabels[answerIndex].hidden = true;
    });

    this.feedback.hidden = true;
    this.question.hidden = true;
    this.refreshLanguage();
    this.layoutAnswerSlots(this.context.viewport.width, this.context.viewport.height);
  }

  update(delta, elapsed) {
    super.update(delta, elapsed);
    this.updateCoverTiles(delta);
  }

  updateRock(delta, elapsed) {
    if (!this.rockRoot.visible) return;

    if (this.rockShakeTime > 0) {
      this.rockShakeTime = Math.max(0, this.rockShakeTime - delta);
      const strength = this.rockShakeTime / 0.22;
      this.rockRoot.position.x = Math.sin(elapsed * 76) * 0.08 * strength;
      this.rockRoot.rotation.z = Math.sin(elapsed * 88) * 0.026 * strength;
    } else {
      this.rockRoot.position.x = THREE.MathUtils.lerp(this.rockRoot.position.x, 0, 0.16);
      this.rockRoot.rotation.z = THREE.MathUtils.lerp(this.rockRoot.rotation.z, 0, 0.16);
    }
  }

  updateCoverTiles(delta) {
    this.coverTiles.forEach((tile) => {
      if (!tile.userData.detaching || !tile.visible) return;

      tile.userData.detachLife -= delta;
      tile.userData.velocity.y -= delta * 3.9;
      tile.position.addScaledVector(tile.userData.velocity, delta);
      tile.rotation.x += tile.userData.spin.x * delta;
      tile.rotation.y += tile.userData.spin.y * delta;
      tile.rotation.z += tile.userData.spin.z * delta;

      if (tile.userData.detachLife < 0.48) {
        tile.material.opacity = THREE.MathUtils.clamp(tile.userData.detachLife / 0.48, 0, 1);
      }
      if (tile.userData.detachLife <= 0) tile.visible = false;
    });
  }

  updateReveal(delta) {
    if (this.phase !== PHASE.CHOOSING) return;
    this.splitProgress = Math.min(1, this.splitProgress + delta * 1.5);
    this.secretModel.rotation.y += delta * 0.42;
  }

  updateSolved(delta) {
    if (this.phase !== PHASE.SOLVED) return;
    this.solvedTime += delta;

    const fade = Math.min(1, this.solvedTime / 0.9);
    this.cavityMaterial.opacity = THREE.MathUtils.lerp(0.28, 0, fade);
    this.secretModel.position.z = THREE.MathUtils.lerp(
      this.secretModel.position.z,
      0.12,
      1 - Math.pow(0.006, delta),
    );
    const targetScale = this.secretBaseScale * (1.14 + Math.sin(this.solvedTime * 5) * 0.025);
    const nextScale = THREE.MathUtils.lerp(
      this.secretModel.scale.x,
      targetScale,
      1 - Math.pow(0.002, delta),
    );
    this.secretModel.scale.setScalar(nextScale);
    this.secretModel.rotation.y += delta * 1.8;
  }
}
