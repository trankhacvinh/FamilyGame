import { ProgressiveArchaeologyGame } from './ProgressiveArchaeologyGame.js';

const PHASE = Object.freeze({
  BREAKING: 'BREAKING',
  CHOOSING: 'CHOOSING',
  SOLVED: 'SOLVED',
});

/**
 * Cho phép bé tiếp tục đập 3 ô đá còn lại sau khi câu hỏi đã xuất hiện.
 * - Hit 1..6: mở dần đá; hit 6 bật trắc nghiệm.
 * - Hit 7..9: trắc nghiệm vẫn giữ nguyên, nhưng click vào đá vẫn làm rơi tiếp 1 ô.
 * - Khi hết 9 ô, vùng hit đá tự tắt; bé vẫn có thể chọn đáp án bình thường.
 */
export class ContinuousBreakArchaeologyGame extends ProgressiveArchaeologyGame {
  /**
   * Input ở trạng thái CHOOSING nhận cả 2 loại tương tác:
   * 1) ưu tiên click vào thẻ đáp án;
   * 2) nếu không trúng đáp án thì cho phép click vào đá để phá tiếp.
   */
  bindInput() {
    this.context.canvas.addEventListener('pointerdown', (event) => {
      this.updatePointer(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      if (this.phase === PHASE.BREAKING) {
        const hit = this.raycaster.intersectObjects(
          this.rockHitMeshes.filter((mesh) => mesh.visible),
          false,
        )[0];
        if (hit) this.hitRock(hit.point);
        return;
      }

      if (this.phase === PHASE.CHOOSING) {
        // Ưu tiên đáp án để vùng hit đá trong suốt không cản thao tác trắc nghiệm.
        const clickable = [];
        this.answerSlots.forEach((slot) => {
          if (!slot.visible) return;
          slot.traverse((child) => child.isMesh && clickable.push(child));
        });

        const answerHit = this.raycaster.intersectObjects(clickable, false)[0];
        const answerIndex = answerHit?.object?.userData?.answerIndex;
        if (Number.isInteger(answerIndex)) {
          this.chooseAnswer(answerIndex);
          return;
        }

        // Trắc nghiệm đã hiện nhưng vẫn còn đá: tiếp tục đập đến hết 9 ô.
        if (this.remainingTileIndexes.length > 0 && this.rockHitTarget.visible) {
          const rockHit = this.raycaster.intersectObjects(
            this.rockHitMeshes.filter((mesh) => mesh.visible),
            false,
          )[0];
          if (rockHit) this.hitRock(rockHit.point);
        }
        return;
      }

      if (this.phase === PHASE.SOLVED && this.secretModel) {
        const meshes = [];
        this.secretModel.traverse((child) => child.isMesh && meshes.push(child));
        if (this.raycaster.intersectObjects(meshes, false)[0]) {
          this.context.speech.speak(
            this.context.i18n.t(this.currentItem.nameKey),
            this.context.i18n.language,
          );
        }
      }
    }, { signal: this.signal });
  }

  /**
   * Khác bản trước ở chỗ CHOOSING vẫn được phép phá đá.
   * Mỗi click luôn lấy đúng 1 index chưa dùng trong thứ tự random của round.
   */
  hitRock(point) {
    if (this.phase !== PHASE.BREAKING && this.phase !== PHASE.CHOOSING) return;

    if (this.remainingTileIndexes.length === 0) {
      this.rockHitTarget.visible = false;
      return;
    }

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

    // Chỉ lần đầu đạt mốc 6 mới bật câu hỏi.
    if (this.phase === PHASE.BREAKING && this.hitCount >= this.requiredHits) {
      this.revealQuestion();
      return;
    }

    // Sau hit 9 không còn gì để phá, tắt vùng hit đá nhưng giữ trắc nghiệm.
    if (this.remainingTileIndexes.length === 0) {
      this.rockHitTarget.visible = false;
    }
  }

  revealQuestion() {
    super.revealQuestion();

    // Bản cha tắt hit target khi mở quiz; bật lại nếu vẫn còn 3 ô đá.
    this.rockHitTarget.visible = this.remainingTileIndexes.length > 0;
  }
}
