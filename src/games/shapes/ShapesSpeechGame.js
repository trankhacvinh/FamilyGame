import { ShapesGame } from './ShapesGame.js';

/**
 * Mở rộng ShapesGame bằng tương tác đọc tên nhưng không thay đổi logic kéo thả.
 * Một tap ngắn sẽ đọc tên shape; thao tác kéo vượt ngưỡng sẽ không kích hoạt giọng đọc.
 */
export class ShapesSpeechGame extends ShapesGame {
  constructor(context) {
    super(context);
    this.readTapState = null;
  }

  bindInput() {
    super.bindInput();

    const canvas = this.context.canvas;
    const tapMoveThreshold = 10;
    const maxTapDuration = 600;

    canvas.addEventListener('pointerdown', (event) => {
      if (event.isPrimary === false) return;

      this.updatePointer(event);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(
        this.activeBlocks.filter((block) => block.visible),
        false,
      )[0];

      if (!hit) {
        this.readTapState = null;
        return;
      }

      this.readTapState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
        moved: false,
        block: hit.object,
      };
    }, { signal: this.signal });

    canvas.addEventListener('pointermove', (event) => {
      const state = this.readTapState;
      if (!state || event.pointerId !== state.pointerId) return;

      const distance = Math.hypot(
        event.clientX - state.x,
        event.clientY - state.y,
      );
      if (distance > tapMoveThreshold) state.moved = true;
    }, { signal: this.signal });

    canvas.addEventListener('pointerup', (event) => {
      const state = this.readTapState;
      if (!state || event.pointerId !== state.pointerId) return;

      const isTap = !state.moved
        && performance.now() - state.startedAt <= maxTapDuration;

      if (isTap && state.block?.visible) {
        this.context.speech.speak(
          this.context.i18n.t(state.block.userData.nameKey),
          this.context.i18n.language,
        );
      }

      this.readTapState = null;
    }, { signal: this.signal });

    canvas.addEventListener('pointercancel', (event) => {
      if (this.readTapState?.pointerId === event.pointerId) {
        this.readTapState = null;
      }
    }, { signal: this.signal });
  }

  dispose() {
    this.readTapState = null;
    super.dispose();
  }
}
