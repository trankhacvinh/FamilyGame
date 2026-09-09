import { GameHud } from '../../ui/GameHud.js';
import { CLAW_TOYS } from './clawCatalog.js';
import { CLAW_STATE } from './clawConfig.js';
import { ClawMachineGame } from './ClawMachineGame.js';
import './clawClean.css';

/**
 * Presentation-only layer for the claw machine.
 * Keeps the gameplay/state machine from ClawMachineGame while reducing permanent HUD clutter.
 */
export class ClawMachineCleanUiGame extends ClawMachineGame {
  constructor(context) {
    super(context);
    this.hintDismissed = false;
    this.hintTimer = null;
    this.noticeTimer = null;
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    const root = document.createElement('div');
    root.className = 'claw-ui claw-clean-ui';

    this.ui.score = document.createElement('div');
    this.ui.score.className = 'claw-clean-score';
    this.ui.score.setAttribute('aria-live', 'polite');

    this.ui.onboarding = document.createElement('div');
    this.ui.onboarding.className = 'claw-onboarding';
    this.ui.onboarding.innerHTML = `
      <span class="claw-onboarding__hand" aria-hidden="true">👆</span>
      <span class="claw-onboarding__arrows" aria-hidden="true">←────→</span>
      <span class="claw-onboarding__text"></span>
    `;
    this.ui.onboardingText = this.ui.onboarding.querySelector('.claw-onboarding__text');

    const controls = document.createElement('div');
    controls.className = 'claw-clean-controls';

    this.ui.grabButton = document.createElement('button');
    this.ui.grabButton.type = 'button';
    this.ui.grabButton.className = 'claw-clean-grab';
    this.ui.grabButton.addEventListener('click', () => this.startGrab(), { signal: this.signal });

    this.ui.newButton = document.createElement('button');
    this.ui.newButton.type = 'button';
    this.ui.newButton.className = 'claw-clean-new';
    this.ui.newButton.setAttribute('aria-label', this.context.i18n.t('clawNewGame'));
    this.ui.newButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    controls.append(this.ui.grabButton, this.ui.newButton);

    this.ui.notice = document.createElement('div');
    this.ui.notice.className = 'claw-reward-toast';
    this.ui.notice.setAttribute('aria-live', 'polite');

    this.ui.complete = document.createElement('section');
    this.ui.complete.className = 'claw-clean-complete';
    this.ui.complete.setAttribute('aria-live', 'polite');

    this.ui.completeTitle = document.createElement('h2');
    this.ui.completeText = document.createElement('p');
    this.ui.completeCollectionTitle = document.createElement('strong');
    this.ui.completeGrid = document.createElement('div');
    this.ui.completeGrid.className = 'claw-clean-complete__grid';
    this.ui.completeToyNodes = new Map();

    CLAW_TOYS.forEach((toy) => {
      const chip = document.createElement('span');
      chip.className = 'claw-clean-complete__toy';
      chip.textContent = toy.icon;
      this.ui.completeGrid.append(chip);
      this.ui.completeToyNodes.set(toy.id, chip);
    });

    this.ui.completeNewButton = document.createElement('button');
    this.ui.completeNewButton.type = 'button';
    this.ui.completeNewButton.className = 'claw-clean-complete__new';
    this.ui.completeNewButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.startNewGame();
    }, { signal: this.signal });

    this.ui.complete.append(
      this.ui.completeTitle,
      this.ui.completeText,
      this.ui.completeCollectionTitle,
      this.ui.completeGrid,
      this.ui.completeNewButton,
    );

    root.append(
      this.ui.score,
      this.ui.onboarding,
      controls,
      this.ui.notice,
      this.ui.complete,
    );
    this.context.uiRoot.append(root);
    this.ui.root = root;

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refreshUi());
    this.refreshUi();

    this.hintTimer = window.setTimeout(() => this.dismissHint(), 3800);
  }

  moveClawFromPointer(clientX) {
    super.moveClawFromPointer(clientX);
    if (!this.hintDismissed) this.dismissHint();
  }

  dismissHint() {
    if (this.hintDismissed) return;
    this.hintDismissed = true;
    window.clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.ui.onboarding?.classList.add('claw-onboarding--hide');
  }

  setState(state) {
    const missed = state === CLAW_STATE.RETURNING
      && this.state === CLAW_STATE.LIFTING
      && !this.grabbedToy;

    super.setState(state);

    if (missed) {
      this.showNotice({
        text: this.context.i18n.t('clawMiss'),
        icon: '🙂',
        kind: 'miss',
      });
    }
  }

  finishToyDrop() {
    const toy = this.grabbedToy;
    const isLastToy = this.remainingCount() === 1;

    super.finishToyDrop();

    if (toy && !isLastToy) {
      this.showNotice({
        text: this.context.i18n.t(toy.labelKey),
        icon: toy.icon,
        kind: 'success',
        bonus: '+1 ⭐',
      });
    }
  }

  showNotice({ text, icon, kind = 'success', bonus = '' }) {
    if (!this.ui.notice) return;

    window.clearTimeout(this.noticeTimer);
    this.ui.notice.className = `claw-reward-toast claw-reward-toast--${kind}`;
    this.ui.notice.replaceChildren();

    const iconNode = document.createElement('span');
    iconNode.className = 'claw-reward-toast__icon';
    iconNode.textContent = icon;

    const textNode = document.createElement('strong');
    textNode.textContent = text;

    this.ui.notice.append(iconNode, textNode);

    if (bonus) {
      const bonusNode = document.createElement('span');
      bonusNode.className = 'claw-reward-toast__bonus';
      bonusNode.textContent = bonus;
      this.ui.notice.append(bonusNode);
    }

    requestAnimationFrame(() => this.ui.notice?.classList.add('claw-reward-toast--show'));
    this.noticeTimer = window.setTimeout(() => {
      this.ui.notice?.classList.remove('claw-reward-toast--show');
    }, kind === 'success' ? 1500 : 1150);
  }

  startNewGame() {
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    this.ui.notice?.classList.remove('claw-reward-toast--show');
    super.startNewGame();
  }

  refreshUi() {
    if (!this.ui.root) return;

    this.ui.score.textContent = `⭐ ${this.score} / ${this.toys.length}`;
    if (this.ui.onboardingText) {
      this.ui.onboardingText.textContent = this.context.i18n.t('clawDragHint');
    }

    const idle = this.state === CLAW_STATE.IDLE;
    const completed = this.state === CLAW_STATE.COMPLETED;

    this.ui.grabButton.textContent = idle ? this.context.i18n.t('clawGrab') : '•••';
    this.ui.grabButton.disabled = !idle;
    this.ui.newButton.textContent = '🔄';
    this.ui.newButton.setAttribute('aria-label', this.context.i18n.t('clawNewGame'));
    this.ui.newButton.title = this.context.i18n.t('clawNewGame');

    this.ui.completeTitle.textContent = this.context.i18n.t('greatJob');
    this.ui.completeText.textContent = this.context.i18n.t('clawComplete');
    this.ui.completeCollectionTitle.textContent = this.context.i18n.t('clawCollection');
    this.ui.completeNewButton.textContent = this.context.i18n.t('clawNewGame');

    CLAW_TOYS.forEach((toy) => {
      const node = this.ui.completeToyNodes.get(toy.id);
      if (node) node.title = this.context.i18n.t(toy.labelKey);
    });

    this.ui.complete.classList.toggle('claw-clean-complete--show', completed);
    this.ui.root.classList.toggle('claw-clean-ui--completed', completed);
  }

  dispose() {
    window.clearTimeout(this.hintTimer);
    window.clearTimeout(this.noticeTimer);
    this.hintTimer = null;
    this.noticeTimer = null;
    super.dispose();
  }
}
