import { HiddenObjectsGame } from './HiddenObjectsGame.js';
import './hiddenObjectsSafeReset.css';

/**
 * Mobile Safari can occasionally synthesize a click for an overlay button after
 * a pointer interaction on the WebGL canvas. Hidden Objects must never restart
 * because of such a ghost click, so New Game is only authorized by a pointer
 * sequence that begins on the reset button itself (or an explicit keyboard key).
 */
export class HiddenObjectsSafeResetGame extends HiddenObjectsGame {
  constructor(context) {
    super(context);
    this.hasStartedInitialRound = false;
    this.resetAuthorized = false;
  }

  createUi() {
    super.createUi();

    const prompt = this.ui.root?.querySelector('.hidden-prompt');

    this.ui.newButton = this.replaceWithSafeResetButton(this.ui.newButton, 'hidden-reset--safe');
    prompt?.append(this.ui.newButton);

    this.ui.completeButton = this.replaceWithSafeResetButton(
      this.ui.completeButton,
      'hidden-complete__button--safe',
    );
  }

  replaceWithSafeResetButton(button, extraClass) {
    if (!button) return button;

    // cloneNode deliberately drops the anonymous click listener from the base game.
    const safeButton = button.cloneNode(true);
    safeButton.classList.add(extraClass);
    button.replaceWith(safeButton);

    let pointerId = null;

    safeButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointerId = event.pointerId;
      safeButton.setPointerCapture?.(event.pointerId);
    }, { signal: this.signal });

    safeButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pointerId !== event.pointerId) return;

      pointerId = null;
      safeButton.releasePointerCapture?.(event.pointerId);
      this.requestExplicitReset();
    }, { signal: this.signal });

    safeButton.addEventListener('pointercancel', (event) => {
      if (pointerId === event.pointerId) pointerId = null;
    }, { signal: this.signal });

    // Suppress Safari's synthesized click. Keyboard activation is handled below.
    safeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, { signal: this.signal });

    safeButton.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      this.requestExplicitReset();
    }, { signal: this.signal });

    return safeButton;
  }

  requestExplicitReset() {
    this.context.audio.playTap();
    this.resetAuthorized = true;
    try {
      this.startNewGame();
    } finally {
      this.resetAuthorized = false;
    }
  }

  startNewGame() {
    // Base init calls startNewGame once. Every later restart must be explicit.
    if (!this.hasStartedInitialRound) {
      this.hasStartedInitialRound = true;
      return super.startNewGame();
    }

    if (!this.resetAuthorized) return undefined;
    return super.startNewGame();
  }
}
