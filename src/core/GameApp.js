import * as THREE from 'three';
import { AudioManager } from './AudioManager.js';
import {
  DeviceDiagnostics,
  getSafePixelRatio,
  getViewportSize,
  isIOSFamily,
} from './DeviceDiagnostics.js';
import { I18n } from './I18n.js';
import { ScreenManager } from './ScreenManager.js';
import { SpeechManager } from './SpeechManager.js';
import { SCREEN } from './constants.js';

export class GameApp {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.isIOS = isIOSFamily();
    this.pixelRatio = getSafePixelRatio();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.audio = new AudioManager();
    this.speech = new SpeechManager();
    this.i18n = new I18n();
    this.clock = new THREE.Clock();
    this.rafId = null;
    this.disposed = false;
    this.resizeTimers = new Set();

    const initialViewport = getViewportSize();
    this.viewport = {
      width: initialViewport.width,
      height: initialViewport.height,
    };

    this.context = {
      canvas: this.canvas,
      uiRoot: this.uiRoot,
      renderer: this.renderer,
      audio: this.audio,
      speech: this.speech,
      i18n: this.i18n,
      viewport: this.viewport,
      device: {
        isIOS: this.isIOS,
        maxTouchPoints: navigator.maxTouchPoints || 0,
      },
      goTo: (screenId) => this.screenManager.switchTo(screenId),
      goMenu: () => this.screenManager.switchTo(SCREEN.MENU),
    };

    this.screenManager = new ScreenManager(this.context);
    this.diagnostics = new DeviceDiagnostics({
      renderer: this.renderer,
      audio: this.audio,
      speech: this.speech,
      viewport: this.viewport,
    });

    this.onResize = this.onResize.bind(this);
    this.onOrientationChange = this.onOrientationChange.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onPageShow = this.onPageShow.bind(this);
    this.onPageHide = this.onPageHide.bind(this);
    this.onUserGesture = this.onUserGesture.bind(this);
    this.animate = this.animate.bind(this);
  }

  async start() {
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('orientationchange', this.onOrientationChange, { passive: true });
    window.addEventListener('pageshow', this.onPageShow, { passive: true });
    window.addEventListener('pagehide', this.onPageHide, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true });
    window.visualViewport?.addEventListener('resize', this.onResize, { passive: true });

    // User gesture chỉ dùng để unlock Web Audio. Không can thiệp speech synthesis ở đây:
    // Safari/iOS xử lý TTS ổn định hơn khi speak() được gọi trực tiếp từ game interaction.
    if ('PointerEvent' in window) {
      window.addEventListener('pointerdown', this.onUserGesture, { capture: true, passive: true });
    } else {
      window.addEventListener('touchend', this.onUserGesture, { capture: true, passive: true });
    }

    this.onResize();
    await this.screenManager.switchTo(SCREEN.MENU);
    this.clock.start();
    this.rafId = requestAnimationFrame(this.animate);
    this.diagnostics.mount();
  }

  animate() {
    if (this.disposed) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.screenManager.update(delta, elapsed);

    const screen = this.screenManager.instance;
    if (screen?.scene && screen?.camera) {
      this.renderer.render(screen.scene, screen.camera);
    } else {
      this.renderer.clear();
    }

    this.rafId = requestAnimationFrame(this.animate);
  }

  onUserGesture() {
    this.audio.unlockFromUserGesture();
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.audio.handleBackground();
      return;
    }

    this.handleForeground();
  }

  onPageHide(event) {
    this.audio.handleBackground();

    // Khi vào BFCache, RAF có thể không tự chạy lại trên một số bản Safari.
    if (event.persisted && this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  onPageShow() {
    this.handleForeground();

    if (!this.disposed && this.rafId == null) {
      this.clock.getDelta();
      this.rafId = requestAnimationFrame(this.animate);
    }
  }

  handleForeground() {
    this.audio.handleForeground();

    // Bỏ phần thời gian app nằm background để không làm animation nhảy một bước lớn.
    this.clock.getDelta();
    this.scheduleResize(0);
    this.scheduleResize(180);
  }

  onOrientationChange() {
    // Safari thường trả viewport cũ ngay trong event orientationchange.
    this.scheduleResize(40);
    this.scheduleResize(180);
    this.scheduleResize(360);
  }

  scheduleResize(delay) {
    const timer = window.setTimeout(() => {
      this.resizeTimers.delete(timer);
      if (!this.disposed) this.onResize();
    }, delay);
    this.resizeTimers.add(timer);
  }

  onResize() {
    const { width, height } = getViewportSize();
    this.viewport.width = width;
    this.viewport.height = height;
    this.pixelRatio = getSafePixelRatio();

    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.screenManager.resize(width, height);
    this.diagnostics.refresh();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.rafId);
    this.rafId = null;

    this.resizeTimers.forEach((timer) => window.clearTimeout(timer));
    this.resizeTimers.clear();

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.removeEventListener('pageshow', this.onPageShow);
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.visualViewport?.removeEventListener('resize', this.onResize);

    if ('PointerEvent' in window) {
      window.removeEventListener('pointerdown', this.onUserGesture, true);
    } else {
      window.removeEventListener('touchend', this.onUserGesture, true);
    }

    this.diagnostics.dispose();
    this.screenManager.dispose();
    this.speech.dispose();
    this.audio.dispose();
    this.renderer.dispose();
  }
}
