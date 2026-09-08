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
 * Phiên bản đá vỡ theo từng lớp che phủ:
 * - secret model nằm sâu trong hốc, không nằm sát bề mặt;
 * - CENTER/MID chunks che trực tiếp từng phần của nhân vật và bung theo từng hit;
 * - QUIZ COVER vẫn che một phần nhân vật khi đã đến câu hỏi;
 * - OUTER FRAME chỉ nổ hết sau khi chọn đúng.
 *
 * Nhờ vậy mỗi cú đập đều mở thêm "thông tin thị giác" thay vì lộ gần hết
 * nhân vật sau 1-2 lần chạm.
 */
export class ProgressiveArchaeologyGame extends ArchaeologyGame {
  constructor(context) {
    super(context);
    this.rockChunks = [];
    this.breakableChunks = [];
    this.quizCoverChunks = [];
    this.outerChunks = [];
  }

  /**
   * Tạo một phiến đá dạng đa giác không đều rồi extrude theo trục Z.
   * So với BoxGeometry, mép phiến không còn thẳng như các tấm ván.
   */
  createShardGeometry(width, height, depth, seed = 0) {
    const jitter = (value, amount, salt) => (
      value + Math.sin(seed * 1.71 + salt * 2.37) * amount
    );

    const hw = width / 2;
    const hh = height / 2;
    const shape = new THREE.Shape();

    const points = [
      [-hw * jitter(0.92, 0.08, 1), -hh * jitter(0.72, 0.12, 2)],
      [-hw * jitter(0.98, 0.06, 3), -hh * jitter(0.08, 0.15, 4)],
      [-hw * jitter(0.84, 0.10, 5),  hh * jitter(0.76, 0.12, 6)],
      [-hw * jitter(0.18, 0.16, 7),  hh * jitter(1.00, 0.05, 8)],
      [ hw * jitter(0.84, 0.10, 9),  hh * jitter(0.82, 0.12, 10)],
      [ hw * jitter(1.00, 0.05, 11), hh * jitter(0.10, 0.15, 12)],
      [ hw * jitter(0.86, 0.10, 13), -hh * jitter(0.80, 0.12, 14)],
      [ hw * jitter(0.08, 0.16, 15), -hh * jitter(1.00, 0.05, 16)],
    ];

    shape.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: Math.min(width, height) * 0.045,
      bevelThickness: Math.min(depth * 0.18, 0.06),
      curveSegments: 1,
    });
    geometry.center();

    // Làm mặt đá hơi méo để bắt sáng không đều.
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      position.setZ(
        i,
        z + Math.sin(x * 4.1 + y * 3.4 + seed * 0.91) * depth * 0.045,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  createCracks() {
    this.cracks = [];
    const crackPaths = [
      [[0.02, 0.78], [-0.12, 0.48], [0.08, 0.23], [-0.18, 0.02]],
      [[0.08, 0.24], [0.45, 0.04], [0.72, -0.32]],
      [[-0.12, 0.47], [-0.48, 0.31], [-0.76, 0.03]],
      [[-0.18, 0.02], [-0.05, -0.34], [-0.34, -0.72]],
      [[-0.03, -0.32], [0.34, -0.48], [0.58, -0.82]],
      [[0.43, 0.04], [0.52, 0.42], [0.72, 0.72]],
      [[-0.48, 0.30], [-0.61, 0.62], [-0.88, 0.80]],
    ];

    crackPaths.forEach((path) => {
      const points = path.map(([x, y]) => new THREE.Vector3(x, y, 1.02));
      const crack = this.trackObject(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0x463a33,
          transparent: true,
          opacity: 0.9,
        }),
      ));
      crack.visible = false;
      this.rockRoot.add(crack);
      this.cracks.push(crack);
    });
  }

  createRock() {
    this.rockRoot = this.trackObject(new THREE.Group());
    this.rockRoot.position.set(0, 1.1, 0);
    this.scene.add(this.rockRoot);

    // Hốc sâu phía sau: model đặt ở z âm nên các phiến đá thật sự che khuất model bằng depth test.
    this.cavityMaterial = this.track(new THREE.MeshStandardMaterial({
      color: 0x43372f,
      roughness: 1,
      transparent: true,
      opacity: 0.14,
    }));
    this.rockCavity = this.trackObject(new THREE.Mesh(
      new THREE.SphereGeometry(1.64, 28, 20),
      this.cavityMaterial,
    ));
    this.rockCavity.position.set(0, -0.04, -0.78);
    this.rockCavity.scale.set(1.12, 1.02, 0.22);
    this.rockCavity.receiveShadow = true;
    this.rockRoot.add(this.rockCavity);

    // Vùng chạm trong suốt lớn để dù đã thủng một phần, bé vẫn tiếp tục đập được.
    this.rockHitTarget = this.trackObject(new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.45, 1.6),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ));
    this.rockHitTarget.position.z = 0.72;
    this.rockHitTarget.userData.rockHit = true;
    this.rockRoot.add(this.rockHitTarget);
    this.rockHitMeshes = [this.rockHitTarget];

    // breakAt bắt đầu từ ~1/3: hit đầu chỉ tạo crack/bụi, chưa mở cửa sổ lớn.
    const chunks = [
      // CENTER: che trực tiếp nhân vật. Các phiến nhỏ giúp mỗi hit chỉ lộ một ít.
      { role: 'breakable', x:  0.00, y:  0.46, w: 0.78, h: 0.72, d: 0.48, breakAt: 0.34, seed: 1 },
      { role: 'breakable', x: -0.46, y: -0.22, w: 0.78, h: 0.76, d: 0.50, breakAt: 0.47, seed: 2 },
      { role: 'breakable', x:  0.48, y: -0.27, w: 0.80, h: 0.78, d: 0.48, breakAt: 0.58, seed: 3 },
      { role: 'breakable', x: -0.62, y:  0.53, w: 0.82, h: 0.74, d: 0.50, breakAt: 0.68, seed: 4 },
      { role: 'breakable', x:  0.65, y:  0.57, w: 0.84, h: 0.76, d: 0.49, breakAt: 0.79, seed: 5 },
      { role: 'breakable', x:  0.02, y: -0.86, w: 1.08, h: 0.58, d: 0.51, breakAt: 0.93, seed: 6 },

      // MID: mở rộng hốc về các phía ở nửa sau của quá trình đập.
      { role: 'breakable', x: -1.08, y:  0.02, w: 0.72, h: 1.32, d: 0.56, breakAt: 0.61, seed: 7 },
      { role: 'breakable', x:  1.10, y:  0.02, w: 0.72, h: 1.34, d: 0.55, breakAt: 0.73, seed: 8 },
      { role: 'breakable', x: -0.63, y:  1.11, w: 1.04, h: 0.58, d: 0.54, breakAt: 0.84, seed: 9 },
      { role: 'breakable', x:  0.66, y:  1.12, w: 1.04, h: 0.58, d: 0.55, breakAt: 0.94, seed: 10 },

      // QUIZ COVER: vẫn che khoảng 30-40% model khi trắc nghiệm xuất hiện.
      // Trong quá trình đập chúng chỉ "nới" ra một chút, không biến mất.
      { role: 'quizCover', x:  0.00, y:  0.72, w: 0.90, h: 0.34, d: 0.46, shiftX:  0.02, shiftY:  0.25, seed: 11 },
      { role: 'quizCover', x: -0.58, y:  0.02, w: 0.38, h: 0.96, d: 0.47, shiftX: -0.23, shiftY:  0.02, seed: 12 },
      { role: 'quizCover', x:  0.60, y: -0.18, w: 0.40, h: 0.94, d: 0.46, shiftX:  0.24, shiftY: -0.02, seed: 13 },
      { role: 'quizCover', x:  0.02, y: -0.72, w: 0.92, h: 0.34, d: 0.48, shiftX:  0.00, shiftY: -0.24, seed: 14 },

      // OUTER: giữ silhouette của tảng đá; chỉ bung khi trả lời đúng.
      { role: 'outer', x: -1.62, y:  0.02, w: 0.64, h: 2.78, d: 0.62, seed: 15 },
      { role: 'outer', x:  1.62, y:  0.03, w: 0.64, h: 2.78, d: 0.62, seed: 16 },
      { role: 'outer', x:  0.00, y:  1.50, w: 2.74, h: 0.52, d: 0.60, seed: 17 },
      { role: 'outer', x:  0.00, y: -1.49, w: 2.76, h: 0.52, d: 0.61, seed: 18 },
    ];

    const palette = [0x8f8072, 0x998676, 0x84766b, 0x9d8977, 0x8a796c];

    this.rockChunks = chunks.map((data, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        roughness: 0.98,
        metalness: 0,
        transparent: true,
        opacity: 1,
        flatShading: true,
      });
      const chunk = this.trackObject(new THREE.Mesh(
        this.createShardGeometry(data.w, data.h, data.d, data.seed),
        material,
      ));

      // Mặt trước gần camera; quiz cover được nhích thêm chút để luôn che model.
      const z = data.role === 'quizCover' ? 0.72 : 0.60 + (index % 3) * 0.025;
      chunk.position.set(data.x, data.y, z);
      chunk.rotation.set(
        THREE.MathUtils.degToRad((index % 2 ? -1 : 1) * 2.0),
        THREE.MathUtils.degToRad((index % 3 - 1) * 2.6),
        THREE.MathUtils.degToRad((index % 5 - 2) * 1.5),
      );
      chunk.castShadow = true;
      chunk.receiveShadow = true;

      chunk.userData.role = data.role;
      chunk.userData.breakAt = data.breakAt ?? 2;
      chunk.userData.shift = new THREE.Vector3(data.shiftX ?? 0, data.shiftY ?? 0, 0);
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

    this.breakableChunks = this.rockChunks.filter((chunk) => chunk.userData.role === 'breakable');
    this.quizCoverChunks = this.rockChunks.filter((chunk) => chunk.userData.role === 'quizCover');
    this.outerChunks = this.rockChunks.filter((chunk) => chunk.userData.role === 'outer');

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
    this.cracks.forEach((crack, index) => {
      crack.visible = index < visibleCracks;
    });

    this.applyProgressiveBreak(progress, point);
    this.spawnRockParticles(point, progress > 0.7 ? 15 : 9);
    this.context.audio.playCrack?.();
    this.refreshProgress();

    if (this.hitCount >= this.requiredHits) this.revealQuestion();
  }

  applyProgressiveBreak(progress, impactPoint) {
    this.breakableChunks.forEach((chunk) => {
      if (chunk.userData.detaching || !chunk.visible) return;
      if (progress >= chunk.userData.breakAt) {
        this.detachRockChunk(chunk, impactPoint, 0.9);
      }
    });

    // Các phiến quiz-cover chỉ nới ra dần, nên mỗi hit mở thêm một chút
    // nhưng đến câu hỏi vẫn còn che rõ một phần nhân vật.
    const loosen = THREE.MathUtils.smoothstep(progress, 0.24, 1);
    this.quizCoverChunks.forEach((chunk) => {
      if (chunk.userData.detaching || !chunk.visible) return;
      const home = chunk.userData.homePosition;
      const shift = chunk.userData.shift;
      chunk.position.set(
        home.x + shift.x * loosen,
        home.y + shift.y * loosen,
        home.z,
      );
    });

    // Model bắt đầu xuất hiện sau ~1/3 tiến trình, nhưng nằm sâu phía sau đá.
    // Reveal đến từ occlusion thực tế của chunks, không phải "show full model".
    if (this.secretModel && progress >= 0.30) {
      this.secretModel.visible = true;
      const reveal = THREE.MathUtils.clamp((progress - 0.30) / 0.70, 0, 1);
      this.secretModel.scale.setScalar(THREE.MathUtils.lerp(0.60, 0.74, reveal));
    }

    const cavityReveal = THREE.MathUtils.clamp((progress - 0.24) / 0.76, 0, 1);
    this.cavityMaterial.opacity = THREE.MathUtils.lerp(0.14, 0.78, cavityReveal);
  }

  detachRockChunk(chunk, impactPoint = null, power = 1) {
    if (!chunk || chunk.userData.detaching || !chunk.visible) return;

    chunk.userData.detaching = true;
    chunk.userData.detachLife = 1.1 + Math.random() * 0.35;

    const home = chunk.userData.homePosition;
    const xDirection = Math.sign(home.x || THREE.MathUtils.randFloatSpread(1)) || 1;
    const yBias = Math.sign(home.y) * THREE.MathUtils.randFloat(0.15, 0.7);

    chunk.userData.velocity.set(
      (xDirection * THREE.MathUtils.randFloat(1.15, 2.25) + THREE.MathUtils.randFloatSpread(0.5)) * power,
      (THREE.MathUtils.randFloat(1.15, 2.6) + yBias) * power,
      THREE.MathUtils.randFloat(1.0, 2.3) * power,
    );
    chunk.userData.spin.set(
      THREE.MathUtils.randFloatSpread(4.0),
      THREE.MathUtils.randFloatSpread(4.0),
      THREE.MathUtils.randFloatSpread(5.0),
    );

    if (impactPoint) this.spawnRockParticles(impactPoint, power > 1 ? 7 : 3);
  }

  revealQuestion() {
    this.phase = PHASE.CHOOSING;
    this.splitProgress = 0;
    this.rockHitTarget.visible = false;
    this.cracks.forEach((crack) => { crack.visible = false; });

    // Không mở thêm tất cả đá ở đây.
    // Trạng thái cuối của BREAKING chính là lượng nhân vật bé được phép nhìn để đoán.
    this.secretModel.visible = true;
    this.secretModel.scale.setScalar(Math.max(0.74, this.secretModel.scale.x));
    this.cavityMaterial.opacity = 0.80;

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
      if (card) {
        card.material.color.set(slotIndex === index ? 0xbff2ca : 0xfff7e1);
      }
    });

    // Chỉ lúc đúng mới phá toàn bộ QUIZ COVER + OUTER FRAME còn lại.
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
        this.detachRockChunk(chunk, null, 1.65);
      } else if (chunk.userData.detaching) {
        chunk.userData.velocity.multiplyScalar(1.2);
      }
    });
    this.spawnRockParticles(new THREE.Vector3(0, 1.05, 0.9), 40);
  }

  startNewRound() {
    this.disposeRoundModels();
    this.clearTransientParticles();

    const previousId = this.currentItem?.id ?? null;
    this.currentItem = getRandomItem(previousId);
    this.answerOptions = makeAnswerOptions(this.currentItem);
    this.requiredHits = THREE.MathUtils.randInt(
      ARCHAEOLOGY_CONFIG.minHits,
      ARCHAEOLOGY_CONFIG.maxHits,
    );

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
    this.cavityMaterial.opacity = 0.14;
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
    this.secretModel.scale.setScalar(0.60);

    // Đẩy model lùi sâu vào hốc. Đây là thay đổi quan trọng để một khe nhỏ
    // chỉ cho thấy một phần nhân vật chứ không phải toàn bộ silhouette.
    this.secretModel.position.set(0, -0.04, -0.42);
    this.rockRoot.add(this.secretModel);
    this.dynamicModels.push(this.secretModel);

    this.answerOptions.forEach((item, answerIndex) => {
      const preview = createToyModel(item.id);
      preview.scale.setScalar(0.47);
      preview.position.set(0, 0.12, 0.32);
      preview.userData.answerIndex = answerIndex;
      preview.traverse((child) => {
        child.userData.answerIndex = answerIndex;
      });
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
      this.rockRoot.rotation.y = Math.sin(elapsed * 0.7) * 0.018;
      if (this.secretModel?.visible) {
        this.secretModel.rotation.y += delta * 0.22;
      }
    }

    if (this.rockShakeTime > 0) {
      this.rockShakeTime = Math.max(0, this.rockShakeTime - delta);
      const strength = this.rockShakeTime / 0.24;
      this.rockRoot.position.x = Math.sin(elapsed * 72) * 0.085 * strength;
      this.rockRoot.rotation.z = Math.sin(elapsed * 86) * 0.032 * strength;
    } else {
      this.rockRoot.position.x = THREE.MathUtils.lerp(
        this.rockRoot.position.x,
        0,
        0.16,
      );
      this.rockRoot.rotation.z = THREE.MathUtils.lerp(
        this.rockRoot.rotation.z,
        0,
        0.16,
      );
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

      if (chunk.userData.detachLife < 0.50) {
        chunk.material.opacity = THREE.MathUtils.clamp(
          chunk.userData.detachLife / 0.50,
          0,
          1,
        );
      }
      if (chunk.userData.detachLife <= 0) {
        chunk.visible = false;
      }
    });
  }

  updateReveal(delta) {
    if (this.phase !== PHASE.CHOOSING) return;

    // Khi đang chọn đáp án không mở thêm đá nữa.
    // Chỉ cho model xoay nhẹ sau các phần đá đang che để bé quan sát.
    this.splitProgress = Math.min(1, this.splitProgress + delta * 1.5);
    const nextScale = THREE.MathUtils.lerp(
      this.secretModel.scale.x,
      0.78,
      1 - Math.pow(0.02, delta),
    );
    this.secretModel.scale.setScalar(nextScale);
    this.secretModel.rotation.y += delta * 0.48;
  }

  updateSolved(delta) {
    if (this.phase !== PHASE.SOLVED) return;
    this.solvedTime += delta;

    const fade = Math.min(1, this.solvedTime / 0.85);
    this.cavityMaterial.opacity = THREE.MathUtils.lerp(0.80, 0, fade);

    // Sau khi đá nổ hết, đưa nhân vật tiến ra phía trước và phóng to.
    this.secretModel.position.z = THREE.MathUtils.lerp(
      this.secretModel.position.z,
      0.16,
      1 - Math.pow(0.006, delta),
    );
    const targetScale = 1.18 + Math.sin(this.solvedTime * 5) * 0.035;
    const nextScale = THREE.MathUtils.lerp(
      this.secretModel.scale.x,
      targetScale,
      1 - Math.pow(0.002, delta),
    );
    this.secretModel.scale.setScalar(nextScale);
    this.secretModel.rotation.y += delta * 1.8;
  }
}
