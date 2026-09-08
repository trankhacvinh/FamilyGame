import { SpaceGame } from './SpaceGame.js';

/**
 * Mở rộng SpaceGame bằng giọng đọc theo ngôn ngữ hiện tại.
 * getSpeechText() là hook để các lớp mở rộng (ví dụ Info) có thể đọc nhiều hơn tên.
 */
export class SpaceSpeechGame extends SpaceGame {
  getSpeechText(object) {
    return this.context.i18n.t(object.userData.nameKey);
  }

  greetObject(object) {
    super.greetObject(object);

    this.context.speech.speak(
      this.getSpeechText(object),
      this.context.i18n.language,
    );
  }
}
