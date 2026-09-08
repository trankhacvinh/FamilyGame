import * as THREE from 'three';
import { AudioManager } from './AudioManager.js';
import { I18n } from './I18n.js';
import { ScreenManager } from './ScreenManager.js';
import { SCREEN } from './constants.js';

export class GameApp {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.audio = new AudioManager();
    this.i18n = new I18n();
    this.clock = new THREE.Clock();
    this.rafId = null;
    this.disposed = false;

    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.context = {
      canvas: this.canvas,
      uiRoot: this.uiRoot,
      renderer: this.renderer,
      audio: this.audio,
      i18n: this.i18n,
      viewport: this.viewport,
      goTo: (screenId) => this.screenManager.switchTo(screenId),
      goMenu: () => this.screenManager.switchTo(SCREEN.MENU),
    };

    this.screenManager = new ScreenManager(this.context);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  async start() {
    window.addEventListener('resize', this.onResize);
    this.onResize();
    await this.screenManager.switchTo(SCREEN.MENU);
    this.clock.start();
    this.rafId = requestAnimationFrame(this.animate);
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

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.viewport.width = width;
    this.viewport.height = height;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.screenManager.resize(width, height);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.screenManager.dispose();
    this.audio.dispose();
    this.renderer.dispose();
  }
}
