import * as THREE from 'three';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';

export class SpaceGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.planets = [];
    this.popup = null;
    this.popupPlanet = null;
    this.popupTime = 0;
    this.unsubscribeLanguage = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071a3b);

    const aspect = this.context.viewport.width / this.context.viewport.height;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 100);
    this.camera.position.set(0, 7.5, 13);
    this.camera.lookAt(0, 0, 0);

    this.createLights();
    this.createStars();
    this.createSun();
    this.createPlanets();
    this.createUi();
    this.bindInput();
  }

  createLights() {
    const ambient = this.track(new THREE.AmbientLight(0x91aaff, 0.85));
    this.scene.add(ambient);

    this.sunLight = this.track(new THREE.PointLight(0xffd36b, 110, 28, 1.7));
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);
  }

  createStars() {
    const count = 550;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = THREE.MathUtils.randFloat(12, 36);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xd9e7ff,
      size: 0.09,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.stars = this.trackObject(new THREE.Points(geometry, material));
    this.scene.add(this.stars);
  }

  createSun() {
    this.sun = this.trackObject(new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 48, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffb22e,
        emissive: 0xff6b18,
        emissiveIntensity: 2.3,
        roughness: 0.55,
      }),
    ));
    this.scene.add(this.sun);
  }

  createPlanets() {
    const definitions = [
      {
        nameKey: 'earth',
        color: 0x4e9fff,
        radius: 0.58,
        orbitRadius: 4.0,
        orbitSpeed: 0.55,
        angle: 0.2,
      },
      {
        nameKey: 'mars',
        color: 0xf07962,
        radius: 0.47,
        orbitRadius: 5.5,
        orbitSpeed: 0.39,
        angle: 2.4,
      },
      {
        nameKey: 'saturn',
        color: 0xf2b86d,
        radius: 0.68,
        orbitRadius: 7.0,
        orbitSpeed: 0.27,
        angle: 4.3,
        ring: true,
      },
    ];

    definitions.forEach((definition) => {
      this.createOrbit(definition.orbitRadius);

      const group = new THREE.Group();
      group.userData = {
        ...definition,
        interactionTime: 0,
      };

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(definition.radius, 36, 24),
        new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.55,
          metalness: 0,
        }),
      );
      sphere.userData.planetGroup = group;
      group.add(sphere);

      if (definition.nameKey === 'earth') {
        const cloud = new THREE.Mesh(
          new THREE.SphereGeometry(definition.radius * 1.025, 24, 18),
          new THREE.MeshBasicMaterial({
            color: 0xbfefff,
            transparent: true,
            opacity: 0.18,
          }),
        );
        cloud.userData.planetGroup = group;
        group.add(cloud);
      }

      if (definition.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(definition.radius * 1.35, definition.radius * 2.15, 64),
          new THREE.MeshStandardMaterial({
            color: 0xffd8a0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
            roughness: 0.65,
          }),
        );
        ring.rotation.x = Math.PI / 2.25;
        ring.userData.planetGroup = group;
        group.add(ring);
      }

      this.trackObject(group);
      this.planets.push(group);
      this.scene.add(group);
    });
  }

  createOrbit(radius) {
    const points = [];
    for (let i = 0; i <= 96; i += 1) {
      const angle = (i / 96) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ));
    }

    const orbit = this.trackObject(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: 0x5171a8,
        transparent: true,
        opacity: 0.34,
      }),
    ));
    this.scene.add(orbit);
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    this.popup = document.createElement('div');
    this.popup.className = 'planet-popup';
    this.popup.hidden = true;
    this.context.uiRoot.append(this.popup);

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => {
      if (this.popupPlanet && !this.popup.hidden) {
        this.popup.textContent = this.context.i18n.t(this.popupPlanet.userData.nameKey);
      }
    });
  }

  bindInput() {
    this.context.canvas.addEventListener('pointerdown', (event) => {
      const rect = this.context.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      const clickableMeshes = [];
      this.planets.forEach((planet) => {
        planet.traverse((child) => {
          if (child.isMesh) clickableMeshes.push(child);
        });
      });

      const hit = this.raycaster.intersectObjects(clickableMeshes, false)[0];
      if (!hit) return;

      const planet = hit.object.userData.planetGroup;
      if (planet) this.greetPlanet(planet);
    }, { signal: this.signal });
  }

  greetPlanet(planet) {
    planet.userData.interactionTime = 1;
    this.popupPlanet = planet;
    this.popupTime = 1.35;
    this.popup.hidden = false;
    this.popup.textContent = this.context.i18n.t(planet.userData.nameKey);
    this.context.audio.playPlanet();
  }

  update(delta, elapsed) {
    this.sun.rotation.y += delta * 0.42;
    this.sun.rotation.x += delta * 0.08;
    this.stars.rotation.y += delta * 0.006;

    this.planets.forEach((planet) => {
      const data = planet.userData;
      data.angle += data.orbitSpeed * delta;

      // Quỹ đạo tròn tính trực tiếp bằng sin/cos, không dùng physics engine.
      planet.position.x = Math.cos(data.angle) * data.orbitRadius;
      planet.position.z = Math.sin(data.angle) * data.orbitRadius;
      planet.position.y = Math.sin(data.angle * 1.7) * 0.12;

      planet.rotation.y += delta * (data.interactionTime > 0 ? 14 : 0.75);

      if (data.interactionTime > 0) {
        data.interactionTime -= delta;
        const progress = 1 - Math.max(data.interactionTime, 0);
        const scale = progress < 0.2
          ? THREE.MathUtils.lerp(1, 2, progress / 0.2)
          : THREE.MathUtils.lerp(2, 1, (progress - 0.2) / 0.8);
        planet.scale.setScalar(Math.max(1, scale));
      } else {
        planet.scale.x = THREE.MathUtils.lerp(planet.scale.x, 1, 0.12);
        planet.scale.y = THREE.MathUtils.lerp(planet.scale.y, 1, 0.12);
        planet.scale.z = THREE.MathUtils.lerp(planet.scale.z, 1, 0.12);
      }
    });

    if (this.popupTime > 0 && this.popupPlanet) {
      this.popupTime -= delta;
      this.updatePopupPosition(elapsed);

      if (this.popupTime <= 0) {
        this.popup.hidden = true;
        this.popupPlanet = null;
      }
    }
  }

  updatePopupPosition(elapsed) {
    const position = this.popupPlanet.position.clone();
    position.y += 1.1 + Math.sin(elapsed * 4) * 0.12;
    position.project(this.camera);

    const x = (position.x * 0.5 + 0.5) * this.context.viewport.width;
    const y = (-position.y * 0.5 + 0.5) * this.context.viewport.height;
    this.popup.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  resize(width, height) {
    if (!this.camera) return;
    this.camera.aspect = width / height;

    if (width < height) {
      // Portrait lùi camera để quỹ đạo Sao Thổ không bị cắt hai bên.
      this.camera.position.set(0, 14, 27);
      this.camera.fov = 58;
    } else {
      this.camera.position.set(0, 7.5, 13);
      this.camera.fov = 48;
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.hud?.dispose();
    super.dispose();
    this.planets.length = 0;
    this.popupPlanet = null;
  }
}
