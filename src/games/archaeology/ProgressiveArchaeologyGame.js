import * as THREE from 'three';
import { ArchaeologyGame } from './ArchaeologyGame.js';
import {
  ARCHAEOLOGY_CONFIG,
  getRandomItem,
  makeAnswerOptions,
} from './archaeologyCatalog.js';
import { createToyModel } from './modelFactory.js';

const PHASE = Object.freeze({
  BREAKING: 'BREAKING',
  CHOOSING: 'CHOOSING',
  SOLVED: 'SOLVED',
});

/**
 * Phiên bản đá vỡ theo từng lớp:
 * - không đổi khối đá nguyên thành hai Dodecahedron ở cuối;
 * - các phiến mặt trước bung lần lượt từ giữa ra ngoài;
 * - đồ vật bí mật nằm sẵn trong hốc và lộ dần sau từng cú đập;
 * - bốn phiến viền chỉ bung hoàn toàn sau khi chọn đúng.
 */
export class ProgressiveArchaeologyGame extends ArchaeologyGame {
  constructor(context) {
    super(context);
    this.rockChunks = [];
  }

  createIrregularChunkGeometry(width, height, depth, seed = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth, 2, 2, 1);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const edgeNoise = Math.sin(i * 2.17 + seed * 1.91) * 0.055;
      position.setXYZ(
        i,
        x + Math.sin(y * 3.2 + seed) * width * 0.035 + edgeNoise,
        y + Math.cos(x * 3.7 + seed * 0.8) * height * 0.035 - edgeNoise,
        z + Math.sin(x * 2.4 + y * 2.8 + seed) * depth * 0.08,
      );
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  createRock() {
    this.rockRoot = this.trackObject(new THREE.Group());
    this.rockRoot.position.set(0, 1.1, 0);
    this.scene.add(this.rockRoot);

    // Hốc tối tạo cảm giác chiều sâu. Secret model nằm giữa hốc và lớp đá mặt trước.
    this.cavityMaterial = this.track(new THREE.MeshStandardMaterial({
      color: 0x4b4038,
      roughness: 1,
      transparent: true,
      opacity: 0.06,
    }));
    this.rockCavity = this.trackObject(new THREE.Mesh(
      new THREE.SphereGeometry(1.52, 24, 18),
      this.cavityMaterial,
    ));
    this.rockCavity.position.set(0, -0.02, -0.55);
    this.rockCavity.scale.set(1.08, 0.98, 0.2);
    this.rockCavity.receiveShadow = true;
    this.rockRoot.add(this.rockCavity);

    // Vùng hit rộng, trong suốt: khi lỗ đã hé ra bé vẫn có thể tiếp tục đập dễ dàng.
    this.rockHitTarget = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 3.4, 1.7),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    ));
    this.rockHitTarget.position.z = 0.12;
    this.rockHitTarget.userData.rockHit = true;
    this.rockRoot.add(this.rockHitTarget);
    this.rockHitMeshes = [this.rockHitTarget];

    const chunks = [
      // Mảnh giữa: rơi dần từ tâm ra mép.
      { x: 0.00, y: 0.72, w: 1.42, h: 1.02, d: 0.64, threshold: 0.28, seed: 1 },
      { x: 0.02, y: -0.42, w: 1.52, h: 1.04, d: 0.66, threshold: 0.42, seed: 2 },
      { x: -1.00, y: 0.10, w: 1.24, h: 1.58, d: 0.68, threshold: 0.54, seed: 3 },
      { x: 1.02, y: 0.12, w: 1.24, h: 1.58, d: 0.65, threshold: 0.64, seed: 4 },
      { x: -0.92, y: 1.18, w: 1.38, h: 0.72, d: 0.60, threshold: 0.75, seed: 5 },
      { x: 0.94, y: 1.20, w: 1.38, h: 0.72, d: 0.62, threshold: 0.84, seed: 6 },
      { x: -0.90, y: -1.17, w: 1.40, h: 0.74, d: 0.64, threshold: 0.91, seed: 7 },
      { x: 0.92, y: -1.16, w: 1.40, h: 0.74, d: 0.62, threshold: 0.96, seed: 8 },

      // Phiến viền giữ hình dáng của cùng một tảng đá, chỉ bung hết khi trả lời đúng.
      { x: -1.62, y: 0.02, w: 0.72, h: 2.78, d: 0.76, finalFrame: true, seed: 9 },
      { x: 1.62, y: 0.03, w: 0.72, h: 2.78, d: 0.74, finalFrame: true, seed: 10 },
      { x: 0.00, y: 1.48, w: 2.76, h: 0.58, d: 0.70, finalFrame: true, seed: 11 },
      { x: 0.00, y: -1.47, w: 2.78, h: 0.58, d: 0.72, finalFrame: true, seed: 12 },
    ];

    this.rockChunks = chunks.map((data, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: [0x8f8072, 0x9a8979, 0x84776c, 0x978575][index % 4],
        roughness: 0.97,
        metalness: 0,
        transparent: true,
        opacity: 1,
      });
      const chunk = this.trackObject(new THREE.Mesh(
        this.createIrregularChunkGeometry(data.w, data.h, data.d, data.seed),
        material,
      ));
      chunk.position.set(data.x, data.y, 0.58 + (index % 3) * 0.025);
      chunk.rotation.set(
        THREE.MathUtils.degToRad((index % 2 ? -1 : 1) * 1.5),
        THREE.MathUtils.degToRad((index % 3 - 1) * 2.4),
        THREE.MathUtils.degToRad((index % 4 - 1.5) * 1.4),
      );
      chunk.castShadow = true;
      chunk.receiveShadow = true;
      chunk.userData.threshold = data.threshold ?? 2;
      chunk.userData.finalFrame = Boolean(data.finalFrame);
      chunk.userData.detaching = false;
      chunk.userData.detachLife = 0;
      chunk.userData.homePosition = chunk.position.clone();
      chunk.userData.homeRotation = chunk.rotation.clone();
      chunk.userData.homeScale = chunk.scale.clone();
      chunk.userData.velocity = new THREE.Vector3();
      chunk.userData.spin = new THREE.Vector3();
      this.rockRoot.add(chunk);
      return chunk;
    });

    // Giữ crack system cũ nhưng không tạo hai rock halves tròn nữa.
    this.createCracks();
  }

  hitRock(point) {
    if (this.phase !== PHASE.BREAKING) return;

    this.hitCount += 1;
    this.rockShakeTime = 0.24;
    const progress = this.hitCount / this.requiredHits;

    const visibleCracks = Math.min(
      this.cracks.length,
      Math.max(1, Math.ceil(progress * this.cracks.length)),
    );
    this.cracks.forEach((crack, index) => { crack.visible = index < visibleCracks; });

    this.applyProgressiveBreak(progress, point);
    this.spawnRockParticles(point, progress > 0.65 ? 16 : 11);
    this.context.audio.playCrack?.();
    this.refreshProgress();

    if (this.hitCount >= this.requiredHits) this.revealQuestion();
  }

  applyProgressiveBreak(progress, impactPoint) {
    this.rockChunks.forEach((chunk) => {
      if (chunk.userData.finalFrame || chunk.userData.detaching || !chunk.visible) return;
      if (progress >= chunk.userData.threshold) this.detachRockChunk(chunk, impactPoint, 1);
    });

    // Từ khoảng 1/3 tiến trình, đồ vật bắt đầu ló ra qua lỗ đang lớn dần.
    if (this.secretModel && progress >= 0.32) {
      this.secretModel.visible = true;
      const reveal = THREE.MathUtils.clamp((progress - 0.32) / 0.68, 0, 1);
      this.secretModel.scale.setScalar(THREE.MathUtils.lerp(0.36, 0.76, reveal));
    }

    const cavityReveal = THREE.MathUtils.clamp((progress - 0.2) / 0.8, 0, 1);
    this.cavityMaterial.opacity = THREE.MathUtils.lerp(0.06, 0.92, cavityReveal);
  }

  detachRockChunk(chunk, impactPoint = null, power = 1) {
    if (!chunk || chunk.userData.detaching || !chunk.visible) return;

    chunk.userData.detaching = true;
    chunk.userData.detachLife = 1.15 + Math.random() * 0.35;

    const home = chunk.userData.homePosition;
    const xDirection = Math.sign(home.x || THREE.MathUtils.randFloatSpread(1)) || 1;
    chunk.userData.velocity.set(
      (xDirection * THREE.MathUtils.randFloat(1.4, 2.7) + THREE.MathUtils.randFloatSpread(0.65)) * power,
      THREE.MathUtils.randFloat(1.4, 3.1) * power + Math.max(0, Math.sign(home.y)) * 0.35,
      THREE.MathUtils.randFloat(1.1, 2.7) * power,
    );
    chunk.userData.spin.set(
      THREE.MathUtils.randFloatSpread(4.2),
      THREE.MathUtils.randFloatSpread(4.2),
      THREE.MathUtils.randFloatSpread(5.2),
    );

    if (impactPoint) this.spawnRockParticles(impactPoint, power > 1 ? 7 : 4);
  }

  revealQuestion() {
    this.phase = PHASE.CHOOSING;
    this.splitProgress = 0;
    this.rockHitTarget.visible = false;
    this.cracks.forEach((crack) => { crack.visible = false; });

    // Mở hết phần giữa, nhưng vẫn để các phiến viền bao quanh vật thể.
    this.rockChunks.forEach((chunk) => {
      if (!chunk.userData.finalFrame && !chunk.userData.detaching && chunk.visible) {
        this.detachRockChunk(chunk, null, 1.1);
      }
    });

    this.secretModel.visible = true;
    this.secretModel.scale.setScalar(Math.max(0.76, this.secretModel.scale.x));
    this.cavityMaterial.opacity = 0.94;

    this.answerSlots.forEach((slot) => { slot.visible = true; });
    this.answerLabels.forEach((label) => { label.hidden = false; });
    this.question.hidden = false;
    this.feedback.hidden = true;
    this.spawnRockParticles(new THREE.Vector3(0, 1.12, 0.9), 20);
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

    // Chỉ khi chọn đúng, toàn bộ viền đá còn lại mới nổ tung ra.
    this.explodeRemainingRock();
    this.spawnFireworks(new THREE.Vector3(0, 1.2, 1.0));
    this.context.audio.playSuccess();
    this.refreshProgress();

    this.context.speech.speak([
      this.context.i18n.t('archCorrect'),
      this.context.i18n.t(this.currentItem.nameKey),
    ], this.context.i18n.language);
  }

  explodeRemainingRock() {
    this.rockChunks.forEach((chunk) => {
      if (!chunk.userData.detaching && chunk.visible) {
        this.detachRockChunk(chunk, null, 1.7);
      } else if (chunk.userData.detaching) {
        chunk.userData.velocity.multiplyScalar(1.28);
      }
    });
    this.spawnRockParticles(new THREE.Vector3(0, 1.05, 0.9), 42);
  }

  startNewRound() {
    this.disposeRoundModels();
    this.clearTransientParticles();

    const previousId = this.currentItem?.id ?? null;
    this.currentItem = getRandomItem(previousId);
    this.answerOptions = makeAnswerOptions(this.currentItem);
    this.requiredHits = THREE.MathUtils.randInt(ARCHAEOLOGY_CONFIG.minHits, ARCHAEOLOGY_CONFIG.maxHits);
    this.hitCount = 0;
    this.phase = PHASE.BREAKING;
    this.rockShakeTime = 0;
    this.splitProgress = 0;
    this.solvedTime = 0;
    this.wrongTime = 0;
    this.wrongSlotIndex = -1;

    this.rockRoot.visible = true;
    this.rockRoot.position.set(0, 1.1, 0);
    this.rockRoot.rotation.set(0, 0, 0);
    this.rockRoot.scale.setScalar(1);
    this.rockHitTarget.visible = true;
    this.cavityMaterial.opacity = 0.06;
    this.rockCavity.visible = true;
    this.cracks.forEach((crack) => { crack.visible = false; });

    this.rockChunks.forEach((chunk) => {
      chunk.visible = true;
      chunk.userData.detaching = false;
      chunk.userData.detachLife = 0;
      chunk.position.copy(chunk.userData.homePosition);
      chunk.rotation.copy(chunk.userData.homeRotation);
      chunk.scale.copy(chunk.userData.homeScale);
      chunk.userData.velocity.set(0, 0, 0);
      chunk.userData.spin.set(0, 0, 0);
      chunk.material.opacity = 1;
    });

    this.secretModel = createToyModel(this.currentItem.id);
    this.secretModel.visible = false;
    this.secretModel.scale.setScalar(0.36);
    this.secretModel.position.set(0, -0.02, 0.16);
    this.rockRoot.add(this.secretModel);
    this.dynamicModels.push(this.secretModel);

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
    this.updateRockChunks(delta);
  }

  updateRock(delta, elapsed) {
    if (!this.rockRoot.visible) return;

    if (this.phase === PHASE.BREAKING) {
      this.rockRoot.rotation.y = Math.sin(elapsed * 0.7) * 0.022;
      if (this.secretModel?.visible) this.secretModel.rotation.y += delta * 0.32;
    }

    if (this.rockShakeTime > 0) {
      this.rockShakeTime = Math.max(0, this.rockShakeTime - delta);
      const strength = this.rockShakeTime / 0.24;
      this.rockRoot.position.x = Math.sin(elapsed * 72) * 0.09 * strength;
      this.rockRoot.rotation.z = Math.sin(elapsed * 86) * 0.035 * strength;
    } else {
      this.rockRoot.position.x = THREE.MathUtils.lerp(this.rockRoot.position.x, 0, 0.16);
      this.rockRoot.rotation.z = THREE.MathUtils.lerp(this.rockRoot.rotation.z, 0, 0.16);
    }
  }

  updateRockChunks(delta) {
    this.rockChunks.forEach((chunk) => {
      if (!chunk.userData.detaching || !chunk.visible) return;

      chunk.userData.detachLife -= delta;
      chunk.userData.velocity.y -= delta * 3.8;
      chunk.position.addScaledVector(chunk.userData.velocity, delta);
      chunk.rotation.x += chunk.userData.spin.x * delta;
      chunk.rotation.y += chunk.userData.spin.y * delta;
      chunk.rotation.z += chunk.userData.spin.z * delta;

      if (chunk.userData.detachLife < 0.55) {
        chunk.material.opacity = THREE.MathUtils.clamp(chunk.userData.detachLife / 0.55, 0, 1);
      }
      if (chunk.userData.detachLife <= 0) chunk.visible = false;
    });
  }

  updateReveal(delta) {
    if (this.phase !== PHASE.CHOOSING) return;

    this.splitProgress = Math.min(1, this.splitProgress + delta * 1.8);
    const eased = 1 - Math.pow(1 - this.splitProgress, 3);

    this.rockChunks.forEach((chunk) => {
      if (!chunk.userData.finalFrame || chunk.userData.detaching || !chunk.visible) return;
      const home = chunk.userData.homePosition;
      const direction = new THREE.Vector2(home.x, home.y).normalize();
      chunk.position.x = home.x + direction.x * 0.16 * eased;
      chunk.position.y = home.y + direction.y * 0.12 * eased;
    });

    const nextScale = THREE.MathUtils.lerp(
      this.secretModel.scale.x,
      0.94,
      1 - Math.pow(0.01, delta),
    );
    this.secretModel.scale.setScalar(nextScale);
    this.secretModel.rotation.y += delta * 0.8;
  }

  updateSolved(delta) {
    if (this.phase !== PHASE.SOLVED) return;
    this.solvedTime += delta;

    const fade = Math.min(1, this.solvedTime / 0.9);
    this.cavityMaterial.opacity = THREE.MathUtils.lerp(0.94, 0, fade);

    const targetScale = 1.18 + Math.sin(this.solvedTime * 5) * 0.035;
    const next = THREE.MathUtils.lerp(
      this.secretModel.scale.x,
      targetScale,
      1 - Math.pow(0.002, delta),
    );
    this.secretModel.scale.setScalar(next);
    this.secretModel.rotation.y += delta * 1.8;
  }
}
