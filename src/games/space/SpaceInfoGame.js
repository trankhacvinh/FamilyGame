import { SpaceSpeechGame } from './SpaceSpeechGame.js';
import {
  getSpaceInfo,
  readSpaceInfoEnabled,
  SPACE_INFO_STORAGE_KEY,
} from './spaceInfo.js';
import './spaceInfo.css';

/**
 * Bổ sung chế độ Info cho Space mà không làm phình SpaceGame gốc.
 * Khi Info bật, tap vật thể sẽ mở panel bottom và Read (nếu bật) sẽ đọc cả nội dung.
 */
export class SpaceInfoGame extends SpaceSpeechGame {
  constructor(context) {
    super(context);
    this.infoEnabled = readSpaceInfoEnabled();
    this.infoSelectionKey = null;
    this.unsubscribeInfoLanguage = null;
  }

  createUi() {
    super.createUi();

    this.infoButton = document.createElement('button');
    this.infoButton.type = 'button';
    this.infoButton.className = 'language-mini-button info-mini-button';

    this.infoIcon = document.createElement('span');
    this.infoIcon.setAttribute('aria-hidden', 'true');

    this.infoLabel = document.createElement('span');
    this.infoLabel.className = 'info-mini-button__label';
    this.infoButton.append(this.infoIcon, this.infoLabel);

    this.infoButton.addEventListener('click', () => {
      this.context.audio.playTap();
      this.setInfoEnabled(!this.infoEnabled);
    }, { signal: this.signal });

    // Đặt Info trước nút Language để nhóm điều khiển có thứ tự Sound / Read / Info / Language.
    this.hud.controls.insertBefore(this.infoButton, this.hud.languageButton);

    this.infoPanel = document.createElement('article');
    this.infoPanel.className = 'space-info-panel';
    this.infoPanel.hidden = true;
    this.infoPanel.setAttribute('aria-live', 'polite');

    const header = document.createElement('div');
    header.className = 'space-info-panel__header';

    this.infoTitle = document.createElement('h2');
    this.infoTitle.className = 'space-info-panel__title';

    this.infoCloseButton = document.createElement('button');
    this.infoCloseButton.type = 'button';
    this.infoCloseButton.className = 'space-info-panel__close';
    this.infoCloseButton.textContent = '✕';
    this.infoCloseButton.addEventListener('click', () => {
      this.closeInfoPanel();
    }, { signal: this.signal });

    header.append(this.infoTitle, this.infoCloseButton);

    this.infoSummary = document.createElement('p');
    this.infoSummary.className = 'space-info-panel__summary';

    this.infoFactsTitle = document.createElement('div');
    this.infoFactsTitle.className = 'space-info-panel__facts-title';

    this.infoFacts = document.createElement('ul');
    this.infoFacts.className = 'space-info-panel__facts';

    this.infoPanel.append(
      header,
      this.infoSummary,
      this.infoFactsTitle,
      this.infoFacts,
    );
    this.context.uiRoot.append(this.infoPanel);

    this.unsubscribeInfoLanguage = this.context.i18n.subscribe(() => {
      this.refreshInfoControl();

      if (this.infoSelectionKey && !this.infoPanel.hidden) {
        this.renderInfoPanel(this.infoSelectionKey, { resetScroll: false });

        // Đổi VI/EN khi panel đang mở sẽ đọc lại bằng ngôn ngữ mới nếu Read đang bật.
        if (this.context.speech.enabled) {
          this.context.speech.speak(
            this.buildNarration(this.infoSelectionKey),
            this.context.i18n.language,
          );
        }
      }
    });

    this.refreshInfoControl();
  }

  setInfoEnabled(enabled) {
    this.infoEnabled = Boolean(enabled);
    localStorage.setItem(SPACE_INFO_STORAGE_KEY, this.infoEnabled ? 'on' : 'off');

    if (!this.infoEnabled) {
      this.closeInfoPanel();
    }

    this.refreshInfoControl();
  }

  refreshInfoControl() {
    if (!this.infoButton) return;

    this.infoIcon.textContent = this.infoEnabled ? 'ℹ️✓' : 'ℹ️';
    this.infoLabel.textContent = this.context.i18n.t('info');
    this.infoButton.classList.toggle('info-mini-button--active', this.infoEnabled);
    this.infoButton.setAttribute('aria-pressed', this.infoEnabled ? 'true' : 'false');
    this.infoButton.setAttribute(
      'aria-label',
      this.context.i18n.t(this.infoEnabled ? 'infoOn' : 'infoOff'),
    );
    this.infoButton.title = this.infoButton.getAttribute('aria-label');

    if (this.infoCloseButton) {
      this.infoCloseButton.setAttribute('aria-label', this.context.i18n.t('closeInfo'));
      this.infoCloseButton.title = this.context.i18n.t('closeInfo');
    }
  }

  greetObject(object) {
    const nameKey = object.userData.nameKey;
    const info = getSpaceInfo(nameKey, this.context.i18n.language);

    if (this.infoEnabled && info) {
      this.infoSelectionKey = nameKey;
      this.renderInfoPanel(nameKey);
    }

    // SpaceSpeechGame gọi getSpeechText() động, vì vậy khi Info bật
    // nội dung đọc sẽ tự chuyển từ "tên" sang "tên + thông tin".
    super.greetObject(object);
  }

  getSpeechText(object) {
    const nameKey = object.userData.nameKey;
    if (!this.infoEnabled) return super.getSpeechText(object);

    const info = getSpaceInfo(nameKey, this.context.i18n.language);
    if (!info) return super.getSpeechText(object);

    return this.buildNarration(nameKey);
  }

  buildNarration(nameKey) {
    const info = getSpaceInfo(nameKey, this.context.i18n.language);
    if (!info) return this.context.i18n.t(nameKey);

    return [
      this.context.i18n.t(nameKey),
      info.summary,
      ...info.facts,
    ].join('. ');
  }

  renderInfoPanel(nameKey, { resetScroll = true } = {}) {
    const info = getSpaceInfo(nameKey, this.context.i18n.language);
    if (!info || !this.infoPanel) return;

    this.infoTitle.textContent = this.context.i18n.t(nameKey);
    this.infoSummary.textContent = info.summary;
    this.infoFactsTitle.textContent = this.context.i18n.t('funFacts');
    this.infoFacts.replaceChildren();

    info.facts.forEach((fact) => {
      const item = document.createElement('li');
      item.textContent = fact;
      this.infoFacts.append(item);
    });

    this.infoPanel.hidden = false;
    if (resetScroll) this.infoPanel.scrollTop = 0;
    this.refreshInfoControl();
  }

  closeInfoPanel() {
    if (this.infoPanel) this.infoPanel.hidden = true;
    this.infoSelectionKey = null;
    this.context.speech.cancel();
  }

  dispose() {
    this.unsubscribeInfoLanguage?.();
    this.infoButton?.remove();
    this.infoPanel?.remove();
    this.infoSelectionKey = null;
    super.dispose();
  }
}
