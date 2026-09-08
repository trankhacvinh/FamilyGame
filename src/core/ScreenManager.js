import { SCREEN } from './constants.js';
import { getGameDefinition } from './GameRegistry.js';
import { MenuScreen } from '../screens/MenuScreen.js';

export class ScreenManager {
  constructor(context) {
    this.context = context;
    this.currentScreen = SCREEN.MENU;
    this.instance = null;
    this.transitionId = 0;
  }

  /**
   * Cổng duy nhất để chuyển màn hình.
   * Luôn dispose màn hình cũ hoàn toàn trước khi khởi tạo màn hình mới.
   */
  async switchTo(screenId) {
    const transitionId = ++this.transitionId;

    if (this.instance) {
      this.instance.dispose();
      this.instance = null;
    }

    this.context.uiRoot.replaceChildren();
    this.context.renderer.clear();

    let next;

    if (screenId === SCREEN.MENU) {
      next = new MenuScreen(this.context);
    } else {
      const definition = getGameDefinition(screenId);
      if (!definition) {
        console.warn(`Unknown screen: ${screenId}`);
        return this.switchTo(SCREEN.MENU);
      }

      this.showLoading();
      const module = await definition.loader();

      // Nếu người dùng chuyển màn hình khi module đang tải thì bỏ kết quả cũ.
      if (transitionId !== this.transitionId) return;

      const GameClass = module[definition.exportName];
      next = new GameClass(this.context);
    }

    this.currentScreen = screenId;
    this.instance = next;
    this.context.uiRoot.replaceChildren();
    await next.init();

    if (transitionId !== this.transitionId) {
      next.dispose();
      return;
    }

    next.resize(this.context.viewport.width, this.context.viewport.height);
  }

  showLoading() {
    const loading = document.createElement('div');
    loading.className = 'loading-screen';
    loading.textContent = this.context.i18n.t('loading');
    this.context.uiRoot.replaceChildren(loading);
  }

  update(delta, elapsed) {
    this.instance?.update(delta, elapsed);
  }

  resize(width, height) {
    this.instance?.resize(width, height);
  }

  dispose() {
    this.transitionId += 1;
    this.instance?.dispose();
    this.instance = null;
  }
}
