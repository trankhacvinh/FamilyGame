import * as THREE from 'three';
import { FruitCatchVisualGame } from './FruitCatchVisualGame.js';
import { FALLING_TYPES } from './fruitCatchConfig.js';
import {
  WEATHER_CONFIG,
  WEATHER_ORDER,
  WEATHER_TYPES,
  weatherLabel,
} from './fruitWeatherConfig.js';
import './fruitWeather.css';

/**
 * Lớp thời tiết cho Fruit Catcher.
 * Visual nằm ở DOM overlay để nhẹ; gameplay vẫn dùng FallingItem của Three.js.
 */
export class FruitCatchWeatherGame extends FruitCatchVisualGame {
  constructor(context) {
    super(context);
    this.weatherType = WEATHER_TYPES.DAY;
    this.weatherTimer = WEATHER_CONFIG.firstChangeDelay;
    this.weatherDirection = 1;
    this.weatherReady = false;
    this.weatherUi = {};
    this.baseSkyMeshes = [];
  }

  async init() {
    await super.init();
    this.captureBaseSkyMeshes();
    this.createWeatherUi();
    this.weatherReady = true;
    this.setWeather(WEATHER_TYPES.DAY, false);
    this.weatherTimer = WEATHER_CONFIG.firstChangeDelay;
    this.refreshUi();
  }

  captureBaseSkyMeshes() {
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      const type = object.geometry?.type;
      const isSun = type === 'CircleGeometry';
      const isBaseCloud = type === 'SphereGeometry' && object.material?.isMeshBasicMaterial;
      if (isSun || isBaseCloud) {
        this.baseSkyMeshes.push(object);
        object.visible = false;
      }
    });
  }

  createWeatherUi() {
    const layer = document.createElement('div');
    layer.className = 'fruit-weather-layer';
    layer.dataset.weather = WEATHER_TYPES.DAY;

    const stars = document.createElement('div');
    stars.className = 'fruit-weather-stars';
    for (let i = 0; i < 38; i += 1) {
      const star = document.createElement('i');
      star.className = 'fruit-weather-star';
      star.style.left = `${3 + ((i * 37) % 94)}%`;
      star.style.top = `${4 + ((i * 23) % 78)}%`;
      star.style.animationDelay = `${(i % 8) * 0.16}s`;
      stars.append(star);
    }

    const sun = document.createElement('div');
    sun.className = 'fruit-weather-sun';
    const moon = document.createElement('div');
    moon.className = 'fruit-weather-moon';

    const clouds = document.createElement('div');
    clouds.className = 'fruit-weather-clouds';
    const cloudLayout = [
      [5, 7, 1.0, 0], [26, 13, 1.28, 0.12], [53, 6, 0.95, 0.2], [76, 15, 1.22, 0.3],
      [12, 28, 1.18, 0.24], [39, 25, 0.92, 0.38], [64, 31, 1.15, 0.48], [83, 34, 0.88, 0.58],
      [23, 43, 0.86, 0.44], [57, 46, 1.05, 0.62],
    ];
    cloudLayout.forEach(([left, top, scale, delay]) => {
      const cloud = document.createElement('span');
      cloud.className = 'fruit-weather-cloud';
      cloud.style.left = `${left}%`;
      cloud.style.top = `${top}%`;
      cloud.style.setProperty('--scale', String(scale));
      cloud.style.setProperty('--delay', `${delay}s`);
      clouds.append(cloud);
    });

    const rain = document.createElement('div');
    rain.className = 'fruit-weather-rain';
    for (let i = 0; i < 48; i += 1) {
      const drop = document.createElement('i');
      drop.className = 'fruit-weather-drop';
      drop.style.left = `${(i * 17) % 100}%`;
      drop.style.animationDelay = `${(i % 12) * -0.09}s`;
      drop.style.animationDuration = `${0.68 + (i % 5) * 0.07}s`;
      rain.append(drop);
    }

    const wind = document.createElement('div');
    wind.className = 'fruit-weather-wind';
    for (let i = 0; i < 8; i += 1) {
      const line = document.createElement('i');
      line.className = 'fruit-weather-wind-line';
      line.style.top = `${16 + i * 9}%`;
      line.style.animationDelay = `${i * -0.23}s`;
      line.style.animationDuration = `${1.45 + (i % 4) * 0.18}s`;
      wind.append(line);
    }

    const tornado = document.createElement('div');
    tornado.className = 'fruit-weather-tornado';
    for (let i = 0; i < 6; i += 1) {
      const ring = document.createElement('i');
      ring.className = 'fruit-weather-tornado-ring';
      const width = 150 - i * 21;
      ring.style.width = `${width}px`;
      ring.style.height = `${Math.max(22, width * 0.32)}px`;
      ring.style.top = `${i * 41}px`;
      ring.style.animationDelay = `${i * -0.08}s`;
      tornado.append(ring);
    }

    const lightning = document.createElement('div');
    lightning.className = 'fruit-weather-lightning';
    const nightTint = document.createElement('div');
    nightTint.className = 'fruit-weather-night-tint';

    layer.append(stars, sun, moon, clouds, rain, wind, tornado, lightning, nightTint);
    this.context.uiRoot.append(layer);

    const badge = document.createElement('div');
    badge.className = 'fruit-weather-badge';
    this.ui.root?.append(badge);

    this.weatherUi = {
      layer,
      badge,
      wind,
    };
  }

  startNewGame() {
    super.startNewGame();
    if (!this.weatherReady) return;
    this.setWeather(WEATHER_TYPES.DAY, false);
    this.weatherTimer = WEATHER_CONFIG.firstChangeDelay;
  }

  chooseNextWeather() {
    const choices = WEATHER_ORDER.filter((type) => type !== this.weatherType);
    return choices[Math.floor(Math.random() * choices.length)] ?? WEATHER_TYPES.DAY;
  }

  setWeather(type, announce = true) {
    const nextType = WEATHER_CONFIG[type] ? type : WEATHER_TYPES.DAY;
    const config = WEATHER_CONFIG[nextType];
    this.weatherType = nextType;
    this.weatherDirection = Math.random() < 0.5 ? -1 : 1;

    if (this.weatherUi.layer) {
      this.weatherUi.layer.dataset.weather = nextType;
    }
    if (this.weatherUi.wind) {
      this.weatherUi.wind.style.transform = this.weatherDirection < 0 ? 'scaleX(-1)' : '';
    }
    if (this.scene?.background?.isColor) {
      this.scene.background.setHex(config.background);
    }

    this.refreshWeatherBadge();

    if (announce) {
      const label = weatherLabel(nextType, this.context.i18n.language);
      this.showNotice(`${config.icon} ${label}`);
      this.context.speech.speak(label, this.context.i18n.language);
    }
  }

  refreshWeatherBadge() {
    if (!this.weatherUi.badge) return;
    const config = WEATHER_CONFIG[this.weatherType] ?? WEATHER_CONFIG[WEATHER_TYPES.DAY];
    const label = weatherLabel(this.weatherType, this.context.i18n.language);
    this.weatherUi.badge.textContent = `${config.icon} ${label}`;
  }

  refreshUi() {
    super.refreshUi();
    this.refreshWeatherBadge();
  }

  /**
   * Áp hiệu ứng gameplay trước update gốc để collision với giỏ sử dụng đúng vị trí đã bị gió cuốn.
   * Speed chỉ được nhân tạm trong frame rồi trả về để không tích lũy qua thời gian.
   */
  applyWeatherToFallingItems(delta, elapsed) {
    const config = WEATHER_CONFIG[this.weatherType] ?? WEATHER_CONFIG[WEATHER_TYPES.DAY];
    const speedBackups = new Map();
    const maxX = Math.max(0.8, this.viewWidth / 2 - 0.55);

    this.fallingItems.forEach((item) => {
      speedBackups.set(item, item.speed);
      item.speed *= config.fallMultiplier;

      if (item.weatherPhase == null) {
        item.weatherPhase = Math.random() * Math.PI * 2;
      }

      const fruitFactor = item.type === FALLING_TYPES.WORM ? 0.68 : 1;

      if (config.windStrength > 0) {
        const gust = 0.74 + Math.sin(elapsed * 2.4 + item.weatherPhase) * 0.26;
        item.root.position.x += (
          config.windStrength
          * this.weatherDirection
          * gust
          * fruitFactor
          * delta
        );
        item.root.rotation.z += this.weatherDirection * config.windStrength * delta * 0.42;
      }

      if (this.weatherType === WEATHER_TYPES.TORNADO) {
        const chaoticX = (
          Math.sin(elapsed * 6.8 + item.weatherPhase) * 2.3
          + Math.cos(elapsed * 3.1 + item.weatherPhase * 0.7) * 1.05
        );
        item.root.position.x += chaoticX * fruitFactor * delta;
        item.root.position.y += Math.sin(elapsed * 7.7 + item.weatherPhase) * 0.24 * delta;
        item.root.rotation.x += delta * 2.4;
        item.root.rotation.z += delta * 3.1;
      }

      item.root.position.x = THREE.MathUtils.clamp(item.root.position.x, -maxX, maxX);
    });

    return speedBackups;
  }

  update(delta, elapsed) {
    let speedBackups = null;

    if (this.weatherReady && this.gameState === 'PLAYING') {
      this.weatherTimer -= delta;
      if (this.weatherTimer <= 0) {
        this.setWeather(this.chooseNextWeather(), true);
        this.weatherTimer = THREE.MathUtils.randFloat(
          WEATHER_CONFIG.durationMin,
          WEATHER_CONFIG.durationMax,
        );
      }

      speedBackups = this.applyWeatherToFallingItems(delta, elapsed);
    }

    super.update(delta, elapsed);

    speedBackups?.forEach((speed, item) => {
      item.speed = speed;
    });
  }

  dispose() {
    this.weatherUi.layer?.remove();
    this.weatherUi.badge?.remove();
    this.weatherUi = {};
    this.baseSkyMeshes.length = 0;
    super.dispose();
  }
}
