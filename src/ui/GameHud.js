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

    this.languageButton = document.createElement('button');
    this.languageButton.type = 'button';
    this.languageButton.className = 'language-mini-button';
    this.languageButton.addEventListener(
      'click',
      () => this.context.i18n.toggle(),
      { signal: this.signal },
    );

    this.controls.append(this.soundButton, this.languageButton);
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
    this.languageButton.textContent = `🌐 ${this.context.i18n.language.toUpperCase()}`;
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.root = null;
  }
}
