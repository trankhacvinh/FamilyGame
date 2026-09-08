import { SpaceGame } from './SpaceGame.js';

/**
 * Mở rộng SpaceGame bằng giọng đọc tên đối tượng theo ngôn ngữ hiện tại.
 * SpaceGame đã phân biệt tap với drag/pinch nên chỉ cần móc vào greetObject().
 */
export class SpaceSpeechGame extends SpaceGame {
  greetObject(object) {
    super.greetObject(object);

    this.context.speech.speak(
      this.context.i18n.t(object.userData.nameKey),
      this.context.i18n.language,
    );
  }
}
