export class GameHud {
  constructor(context, signal) {
    this.context = context;
    this.signal = signal;
    this.unsubscribeLanguage = null;
    this.root = null;
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = 'game-hud';

    this.backButton = document.createElement('button');
    this.backButton.type = 'button';
    this.backButton.className = 'back-button';
    this.backButton.addEventListener(
      'click',
      () => {
        this.context.audio.playTap();
        this.context.goMenu();
      },
      { signal: this.signal },
    );

    this.controls = document.createElement('div');
    this.controls.className = 'hud-controls';

    this.soundButton = document.createElement('button');
    this.soundButton.type = 'button';
    this.soundButton.className = 'language-mini-button';
    this.soundButton.addEventListener(
      'click',
      () => {
        this.context.audio.toggle();
        this.refresh();
      },
      { signal: this.signal },
    );

    this.readButton = document.createElement('button');
    this.readButton.type = 'button';
    this.readButton.className = 'language-mini-button read-mini-button';

    this.readIcon = document.createElement('span');
    this.readIcon.textContent = '🗣️';
    this.readIcon.setAttribute('aria-hidden', 'true');

    this.readLabel = document.createElement('span');
    this.readLabel.className = 'read-mini-button__label';
    this.readButton.append(this.readIcon, this.readLabel);

    this.readButton.addEventListener(
      'click',
      () => {
        this.context.speech.toggle();
        this.refresh();
      },
      { signal: this.signal },
    );

    this.languageButton = document.createElement('button');
    this.languageButton.type = 'button';
    this.languageButton.className = 'language-mini-button';
    this.languageButton.addEventListener(
      'click',
      () => this.context.i18n.toggle(),
      { signal: this.signal },
    );

    this.controls.append(this.soundButton, this.readButton, this.languageButton);
    this.root.append(this.backButton, this.controls);
    this.context.uiRoot.append(this.root);

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.refresh());
    this.refresh();
  }

  refresh() {
    if (!this.root) return;
    this.backButton.textContent = this.context.i18n.t('backToMenu');
    this.soundButton.textContent = this.context.audio.enabled ? '🔊' : '🔇';
    this.soundButton.setAttribute(
      'aria-label',
      this.context.audio.enabled
        ? this.context.i18n.t('soundOn')
        : this.context.i18n.t('soundOff'),
    );

    this.readLabel.textContent = this.context.i18n.t('read');
    this.readButton.disabled = !this.context.speech.available;
    this.readButton.classList.toggle('read-mini-button--active', this.context.speech.enabled);
    this.readButton.setAttribute('aria-pressed', this.context.speech.enabled ? 'true' : 'false');
    this.readButton.setAttribute(
      'aria-label',
      !this.context.speech.available
        ? this.context.i18n.t('readUnavailable')
        : this.context.speech.enabled
          ? this.context.i18n.t('readOn')
          : this.context.i18n.t('readOff'),
    );
    this.readButton.title = this.readButton.getAttribute('aria-label');

    this.languageButton.textContent = `🌐 ${this.context.i18n.language.toUpperCase()}`;
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.root = null;
  }
}
