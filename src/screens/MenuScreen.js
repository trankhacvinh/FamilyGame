import { GAME_REGISTRY } from '../core/GameRegistry.js';

export class MenuScreen {
  constructor(context) {
    this.context = context;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.context.renderer.setClearColor(0xfff2b8, 1);
    this.render();
    this.unsubscribeLanguage = this.context.i18n.subscribe(() => this.render());
  }

  render() {
    const { uiRoot, i18n, audio } = this.context;

    const screen = document.createElement('main');
    screen.className = 'menu-screen';

    const floating = document.createElement('div');
    floating.className = 'floating-decorations';
    floating.setAttribute('aria-hidden', 'true');
    floating.innerHTML = '<span>⭐</span><span>🌈</span><span>☁️</span><span>✨</span>';

    const toolbar = document.createElement('div');
    toolbar.className = 'menu-toolbar';

    const languageButton = this.createButton(
      `🌐 ${i18n.language === 'vi' ? 'VI / EN' : 'EN / VI'}`,
      'toolbar-button',
      () => i18n.toggle(),
    );

    const soundButton = this.createButton(
      audio.enabled ? i18n.t('soundOn') : i18n.t('soundOff'),
      'toolbar-button',
      () => {
        audio.toggle();
        this.render();
      },
    );

    toolbar.append(languageButton, soundButton);

    const hero = document.createElement('section');
    hero.className = 'menu-hero';
    hero.innerHTML = `
      <h1>${i18n.t('appTitle')}</h1>
      <p>${i18n.t('appSubtitle')}</p>
    `;

    const grid = document.createElement('section');
    grid.className = 'game-grid';

    Object.values(GAME_REGISTRY).forEach((game) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      card.style.setProperty('--card-accent', game.accent);
      const title = game.title?.[i18n.language] ?? i18n.t(game.titleKey);
      const description = game.description?.[i18n.language] ?? i18n.t(game.descriptionKey);
      card.innerHTML = `
        <span class="game-card__icon" aria-hidden="true">${game.icon}</span>
        <span class="game-card__title">${title}</span>
        <span class="game-card__description">${description}</span>
        <span class="game-card__badge">${game.type}</span>
      `;

      card.addEventListener(
        'click',
        () => {
          audio.playTap();
          this.context.goTo(game.id);
        },
        { signal: this.signal },
      );

      grid.append(card);
    });

    screen.append(floating, toolbar, hero, grid);
    uiRoot.replaceChildren(screen);
  }

  createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick, { signal: this.signal });
    return button;
  }

  update() {}

  resize() {}

  dispose() {
    this.abortController.abort();
    this.unsubscribeLanguage?.();
  }
}
