import { HiddenObjectsGame } from './HiddenObjectsGame.js';

const SESSION_KEY = 'familygame-hidden-objects-round-v1';

/**
 * Stability layer for Hidden Objects.
 *
 * During an active round there is deliberately no New Game control and every
 * non-completion call to startNewGame() is ignored. The current order + found
 * object ids are mirrored into sessionStorage so that an unexpected game
 * instance recreation cannot silently reset the child back to 0 / 10.
 */
export class HiddenObjectsStableGame extends HiddenObjectsGame {
  constructor(context) {
    super(context);
    this.roundInitialized = false;
  }

  createUi() {
    super.createUi();

    // There must be no active-round restart surface over the play field.
    // Keep the detached reference so the base refreshUi() can still update its
    // aria/title fields without needing to fork the whole UI implementation.
    this.ui.newButton?.remove();
  }

  startNewGame() {
    // init() reaches here once after all scene objects and UI are ready.
    if (!this.roundInitialized) {
      this.roundInitialized = true;

      if (this.restoreRound()) {
        return undefined;
      }

      const result = super.startNewGame();
      this.saveRound();
      return result;
    }

    // The only legal restart after initialization is the Play Again button on
    // the completed screen. Any call while a round is active is ignored.
    if (!this.completed) return undefined;

    this.clearRound();
    const result = super.startNewGame();
    this.saveRound();
    return result;
  }

  handleCorrect(object) {
    const wasFound = object?.found;
    super.handleCorrect(object);

    if (!wasFound && object?.found) {
      // Save immediately after the score changes. restoreRound() derives the
      // next target from the first not-yet-found id, so it does not depend on
      // the delayed target transition timer having fired yet.
      this.saveRound();
    }
  }

  finishGame() {
    super.finishGame();
    this.clearRound();
  }

  saveRound() {
    if (!this.targetOrder?.length || !this.objects?.length) return;

    const snapshot = {
      version: 1,
      orderIds: this.targetOrder.map((item) => item.id),
      foundIds: this.objects.filter((item) => item.found).map((item) => item.id),
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage can be unavailable in strict/private browser modes. Gameplay
      // must still continue normally; the active-round restart guard remains.
    }
  }

  restoreRound() {
    let snapshot;

    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      snapshot = JSON.parse(raw);
    } catch {
      return false;
    }

    if (!snapshot || snapshot.version !== 1) return false;

    const objectById = new Map(this.objects.map((item) => [item.id, item]));
    const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds : [];
    const foundIds = Array.isArray(snapshot.foundIds) ? snapshot.foundIds : [];

    const validOrder = orderIds.length === this.objects.length
      && new Set(orderIds).size === this.objects.length
      && orderIds.every((id) => objectById.has(id));

    if (!validOrder) {
      this.clearRound();
      return false;
    }

    const foundSet = new Set(foundIds.filter((id) => objectById.has(id)));
    if (foundSet.size >= this.objects.length) {
      this.clearRound();
      return false;
    }

    this.targetOrder = orderIds.map((id) => objectById.get(id));
    this.foundCount = foundSet.size;
    this.completed = false;
    this.inputLocked = false;
    this.pointerDown = null;

    this.objects.forEach((object) => {
      object.found = foundSet.has(object.id);
      object.feedbackKind = null;
      object.feedbackTime = 0;
      object.root.position.copy(object.homePosition);
      object.root.rotation.copy(object.homeRotation);
      object.root.scale.setScalar(object.baseScale);
      object.halo.visible = object.found;
      object.hit.visible = true;
    });

    this.currentTarget = this.targetOrder.find((item) => !item.found) ?? null;
    this.targetIndex = Math.max(0, this.targetOrder.indexOf(this.currentTarget));

    if (!this.currentTarget) {
      this.clearRound();
      return false;
    }

    this.ui.toast?.classList.remove('hidden-toast--show');
    this.ui.complete?.classList.remove('hidden-complete--show');
    this.refreshUi();
    this.schedulePromptSpeech();
    return true;
  }

  clearRound() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
}
