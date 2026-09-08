import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BaseGame } from '../../core/BaseGame.js';
import { GameHud } from '../../ui/GameHud.js';
import {
  PLANET_CATALOG,
  SPACE_CAMERA_CONFIG,
  SPACE_VISITOR_CONFIG,
} from './spaceConfig.js';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class SpaceGame extends BaseGame {
  constructor(context) {
    super(context);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.planets = [];
    this.visitors = [];
    this.popup = null;
    this.popupTarget = null;
    this.popupTime = 0;
    this.unsubscribeLanguage = null;
    this.visitorSpawnTimer = 0;
    this.projectPoint = new THREE.Vector3();

    this.controls = null;
    this.controlsStartedHandler = null;
    this.cameraUserInteracted = false;

    this.activePointers = new Set();
    this.tapState = null;
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071a3b);

    const aspect = this.context.viewport.width / this.context.viewport.height;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 200);
    this.setInitialCamera(this.context.viewport.width, this.context.viewport.height);

    this.createLights();
    this.createStars();
    this.createSun();
    this.createPlanets();
    this.createControls();
    this.createUi();
    this.bindInput();

    this.visitorSpawnTimer = THREE.MathUtils.randFloat(
      SPACE_VISITOR_CONFIG.firstDelay[0],
      SPACE_VISITOR_CONFIG.firstDelay[1],
    );
  }

  createLights() {
    const ambient = this.track(new THREE.AmbientLight(0x91aaff, 0.82));
    this.scene.add(ambient);

    this.sunLight = this.track(new THREE.PointLight(0xffd36b, 160, 58, 1.5));
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);
  }

  createStars() {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = THREE.MathUtils.randFloat(24, 82);
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
      size: 0.1,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.stars = this.trackObject(new THREE.Points(geometry, material));
    this.scene.add(this.stars);
  }

  createSun() {
    this.sun = this.trackObject(new THREE.Mesh(
      new THREE.SphereGeometry(1.38, 48, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffb22e,
        emissive: 0xff6b18,
        emissiveIntensity: 2.4,
        roughness: 0.55,
      }),
    ));
    this.sun.userData.nameKey = 'sun';
    this.sun.userData.interactionTime = 0;
    this.sun.userData.interactiveRoot = this.sun;
    this.scene.add(this.sun);
  }

  createPlanets() {
    PLANET_CATALOG.forEach((definition) => {
      this.createOrbit(definition);

      const group = new THREE.Group();
      group.userData = {
        ...definition,
        interactionTime: 0,
        inclinationRad: THREE.MathUtils.degToRad(definition.inclination ?? 0),
        ascendingNodeRad: THREE.MathUtils.degToRad(definition.ascendingNode ?? 0),
      };

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(definition.radius, 36, 24),
        new THREE.MeshStandardMaterial({
          color: definition.color,
          roughness: 0.55,
          metalness: 0,
        }),
      );
      this.markInteractive(sphere, group);
      group.add(sphere);

      if (definition.atmosphere) {
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(definition.radius * 1.035, 24, 18),
          new THREE.MeshBasicMaterial({
            color: 0xbfefff,
            transparent: true,
            opacity: 0.18,
          }),
        );
        this.markInteractive(atmosphere, group);
        group.add(atmosphere);
      }

      if (definition.bands) {
        [-0.23, 0.05, 0.28].forEach((offset, index) => {
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(definition.radius * (0.76 + index * 0.03), 0.035, 8, 40),
            new THREE.MeshBasicMaterial({
              color: index % 2 === 0 ? 0xf0d2aa : 0xb9785e,
              transparent: true,
              opacity: 0.74,
            }),
          );
          band.rotation.x = Math.PI / 2;
          band.position.y = offset;
          this.markInteractive(band, group);
          group.add(band);
        });
      }

      if (definition.ring) {
        const inner = 1.38;
        const outer = definition.ring === 'saturn' ? 2.18 : 1.72;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(definition.radius * inner, definition.radius * outer, 72),
          new THREE.MeshStandardMaterial({
            color: definition.ring === 'saturn' ? 0xffd8a0 : 0xbdeee9,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: definition.ring === 'saturn' ? 0.86 : 0.52,
            roughness: 0.65,
          }),
        );
        ring.rotation.x = definition.ring === 'saturn' ? Math.PI / 2.25 : Math.PI / 2.08;
        this.markInteractive(ring, group);
        group.add(ring);
      }

      // Hit target trong suốt giúp bé chạm hành tinh nhỏ dễ hơn trên điện thoại.
      const hitTarget = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(definition.radius * 1.65, 0.55), 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      this.markInteractive(hitTarget, group);
      group.add(hitTarget);

      this.updatePlanetOrbitPosition(group);
      this.trackObject(group);
      this.planets.push(group);
      this.scene.add(group);
    });
  }

  markInteractive(object, root) {
    object.userData.interactiveRoot = root;
  }

  createOrbit(definition) {
    const inclination = THREE.MathUtils.degToRad(definition.inclination ?? 0);
    const ascendingNode = THREE.MathUtils.degToRad(definition.ascendingNode ?? 0);
    const points = [];

    for (let i = 0; i <= 144; i += 1) {
      const angle = (i / 144) * Math.PI * 2;
      const point = new THREE.Vector3(
        Math.cos(angle) * definition.orbitRadius,
        0,
        Math.sin(angle) * definition.orbitRadius,
      );

      point.applyAxisAngle(X_AXIS, inclination);
      point.applyAxisAngle(Y_AXIS, ascendingNode);
      points.push(point);
    }

    const orbit = this.trackObject(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: 0x5171a8,
        transparent: true,
        opacity: 0.3,
      }),
    ));

    this.scene.add(orbit);
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.context.canvas);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = SPACE_CAMERA_CONFIG.minDistance;
    this.controls.maxDistance = SPACE_CAMERA_CONFIG.maxDistance;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI - 0.12;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

    this.controlsStartedHandler = () => {
      this.cameraUserInteracted = true;
    };
    this.controls.addEventListener('start', this.controlsStartedHandler);
    this.controls.update();
  }

  createUi() {
    this.hud = new GameHud(this.context, this.signal);
    this.hud.mount();

    this.popup = document.createElement('div');
    this.popup.className = 'planet-popup';
    this.popup.hidden = true;
    this.context.uiRoot.append(this.popup);

    this.unsubscribeLanguage = this.context.i18n.subscribe(() => {
      if (this.popupTarget && !this.popup.hidden) {
        this.popup.textContent = this.context.i18n.t(this.popupTarget.userData.nameKey);
      }
    });
  }

  /**
   * OrbitControls dùng cùng canvas với Raycaster.
   * Chỉ coi thao tác là "tap" khi pointer gần như không di chuyển.
   * Nhờ vậy kéo để xoay camera sẽ không vô tình kích hoạt hành tinh.
   */
  bindInput() {
    const canvas = this.context.canvas;
    const tapMoveThreshold = 10;
    const maxTapDuration = 600;

    canvas.addEventListener('pointerdown', (event) => {
      this.activePointers.add(event.pointerId);

      if (this.activePointers.size === 1) {
        this.tapState = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          startedAt: performance.now(),
          moved: false,
          multiTouch: false,
        };
      } else if (this.tapState) {
        this.tapState.multiTouch = true;
      }
    }, { signal: this.signal });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.tapState || event.pointerId !== this.tapState.pointerId) return;
      const distance = Math.hypot(
        event.clientX - this.tapState.x,
        event.clientY - this.tapState.y,
      );
      if (distance > tapMoveThreshold) this.tapState.moved = true;
    }, { signal: this.signal });

    const finishPointer = (event, allowTap) => {
      const state = this.tapState;
      const pointerCountBeforeRelease = this.activePointers.size;
      this.activePointers.delete(event.pointerId);

      if (
        allowTap
        && state
        && event.pointerId === state.pointerId
        && !state.moved
        && !state.multiTouch
        && pointerCountBeforeRelease === 1
        && performance.now() - state.startedAt <= maxTapDuration
      ) {
        this.handleTap(event);
      }

      if (state?.pointerId === event.pointerId) this.tapState = null;
    };

    canvas.addEventListener('pointerup', (event) => finishPointer(event, true), {
      signal: this.signal,
    });
    canvas.addEventListener('pointercancel', (event) => finishPointer(event, false), {
      signal: this.signal,
    });
  }

  handleTap(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.getClickableMeshes(), false)[0];
    if (!hit) return;

    const root = hit.object.userData.interactiveRoot;
    if (root) this.greetObject(root);
  }

  getClickableMeshes() {
    const meshes = [this.sun];
    [...this.planets, ...this.visitors].forEach((root) => {
      root.traverse((child) => {
        if (child.isMesh && child.userData.interactiveRoot) meshes.push(child);
      });
    });
    return meshes;
  }

  greetObject(object) {
    object.userData.interactionTime = 1.05;
    this.popupTarget = object;
    this.popupTime = 1.5;
    this.popup.hidden = false;
    this.popup.textContent = this.context.i18n.t(object.userData.nameKey);
    this.context.audio.playPlanet();
  }

  update(delta, elapsed) {
    this.controls?.update();
    this.updateSun(delta);
    this.stars.rotation.y += delta * 0.006;
    this.updatePlanets(delta);
    this.updateVisitors(delta);

    if (this.popupTime > 0 && this.popupTarget) {
      this.popupTime -= delta;
      this.updatePopupPosition(elapsed);

      if (this.popupTime <= 0) {
        this.popup.hidden = true;
        this.popupTarget = null;
      }
    }
  }

  updateSun(delta) {
    const interactionTime = this.sun.userData.interactionTime;
    this.sun.rotation.y += delta * (interactionTime > 0 ? 8 : 0.42);
    this.sun.rotation.x += delta * (interactionTime > 0 ? 2 : 0.08);

    if (interactionTime > 0) {
      this.sun.userData.interactionTime = Math.max(0, interactionTime - delta);
      this.applyGreetingScale(this.sun, interactionTime);
    } else {
      this.lerpScaleToOne(this.sun, delta);
    }
  }

  updatePlanets(delta) {
    this.planets.forEach((planet) => {
      const data = planet.userData;
      data.angle += data.orbitSpeed * delta;
      this.updatePlanetOrbitPosition(planet);

      planet.rotation.y += delta * (data.interactionTime > 0 ? 14 : 0.72);

      if (data.interactionTime > 0) {
        const remaining = data.interactionTime;
        data.interactionTime = Math.max(0, data.interactionTime - delta);
        this.applyGreetingScale(planet, remaining);
      } else {
        this.lerpScaleToOne(planet, delta);
      }
    });
  }

  updatePlanetOrbitPosition(planet) {
    const data = planet.userData;
    planet.position.set(
      Math.cos(data.angle) * data.orbitRadius,
      0,
      Math.sin(data.angle) * data.orbitRadius,
    );
    planet.position.applyAxisAngle(X_AXIS, data.inclinationRad);
    planet.position.applyAxisAngle(Y_AXIS, data.ascendingNodeRad);
  }

  applyGreetingScale(object, remainingTime) {
    const duration = 1.05;
    const progress = 1 - THREE.MathUtils.clamp(remainingTime / duration, 0, 1);
    const scale = progress < 0.22
      ? THREE.MathUtils.lerp(1, 2, progress / 0.22)
      : THREE.MathUtils.lerp(2, 1, (progress - 0.22) / 0.78);
    object.scale.setScalar(Math.max(1, scale));
  }

  lerpScaleToOne(object, delta) {
    const amount = 1 - Math.pow(0.0008, delta);
    object.scale.x = THREE.MathUtils.lerp(object.scale.x, 1, amount);
    object.scale.y = THREE.MathUtils.lerp(object.scale.y, 1, amount);
    object.scale.z = THREE.MathUtils.lerp(object.scale.z, 1, amount);
  }

  updateVisitors(delta) {
    this.visitorSpawnTimer -= delta;

    if (this.visitorSpawnTimer <= 0 && this.visitors.length < SPACE_VISITOR_CONFIG.maxVisitors) {
      this.spawnVisitor();
      this.visitorSpawnTimer = THREE.MathUtils.randFloat(
        SPACE_VISITOR_CONFIG.nextDelay[0],
        SPACE_VISITOR_CONFIG.nextDelay[1],
      );
    }

    for (let index = this.visitors.length - 1; index >= 0; index -= 1) {
      const visitor = this.visitors[index];
      const data = visitor.userData;
      const speedFactor = data.interactionTime > 0 ? 0.45 : 1;
      visitor.position.addScaledVector(data.velocity, delta * speedFactor);
      data.life -= delta;

      visitor.rotation.x += delta * (data.interactionTime > 0 ? 8 : data.spin.x);
      visitor.rotation.y += delta * (data.interactionTime > 0 ? 11 : data.spin.y);
      visitor.rotation.z += delta * (data.interactionTime > 0 ? 6 : data.spin.z);

      if (data.interactionTime > 0) {
        const remaining = data.interactionTime;
        data.interactionTime = Math.max(0, data.interactionTime - delta);
        this.applyGreetingScale(visitor, remaining);
      } else {
        this.lerpScaleToOne(visitor, delta);
      }

      if (data.life <= 0 || visitor.position.length() > 44) {
        if (this.popupTarget === visitor) {
          this.popup.hidden = true;
          this.popupTarget = null;
          this.popupTime = 0;
        }
        this.removeVisitor(index);
      }
    }
  }

  spawnVisitor() {
    const isComet = Math.random() < 0.5;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const start = new THREE.Vector3(
      direction > 0 ? -20 : 20,
      THREE.MathUtils.randFloat(-2.5, 5.5),
      THREE.MathUtils.randFloat(-12, 12),
    );
    const target = new THREE.Vector3(
      -start.x,
      THREE.MathUtils.randFloat(-3.5, 5),
      THREE.MathUtils.randFloat(-12, 12),
    );
    const speed = THREE.MathUtils.randFloat(
      SPACE_VISITOR_CONFIG.minSpeed,
      SPACE_VISITOR_CONFIG.maxSpeed,
    );
    const velocity = target.clone().sub(start).normalize().multiplyScalar(speed);

    const visitor = isComet
      ? this.createComet(direction)
      : this.createAsteroid();

    visitor.position.copy(start);
    visitor.userData.nameKey = isComet ? 'comet' : 'asteroid';
    visitor.userData.velocity = velocity;
    visitor.userData.life = start.distanceTo(target) / speed + 3.5;
    visitor.userData.interactionTime = 0;
    visitor.userData.spin = new THREE.Vector3(
      THREE.MathUtils.randFloat(0.6, 1.5),
      THREE.MathUtils.randFloat(0.8, 1.8),
      THREE.MathUtils.randFloat(0.4, 1.2),
    );

    visitor.traverse((child) => {
      if (child.isMesh) this.markInteractive(child, visitor);
    });

    this.visitors.push(visitor);
    this.scene.add(visitor);
  }

  createComet(direction) {
    const group = new THREE.Group();

    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshStandardMaterial({
        color: 0xc8edff,
        emissive: 0x5c9cc8,
        emissiveIntensity: 0.55,
        roughness: 0.45,
      }),
    );
    group.add(nucleus);

    const tailPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-direction * 2.15, 0.12, 0),
    ];
    const tail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tailPoints),
      new THREE.LineBasicMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.72,
      }),
    );
    group.add(tail);

    return group;
  }

  createAsteroid() {
    const group = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.43, 0),
      new THREE.MeshStandardMaterial({
        color: 0x9a8071,
        roughness: 0.94,
        metalness: 0.02,
      }),
    );
    rock.scale.set(1, 0.78, 0.9);
    group.add(rock);
    return group;
  }

  removeVisitor(index) {
    const visitor = this.visitors[index];
    if (!visitor) return;
    visitor.removeFromParent();
    this.disposeDynamicObject(visitor);
    this.visitors.splice(index, 1);
  }

  /**
   * Visitor được sinh ra liên tục nên không đưa vào ResourceTracker của cả màn hình.
   * Khi visitor bay khỏi màn hình, dispose ngay geometry/material để session dài không tăng memory.
   */
  disposeDynamicObject(object) {
    object.traverse((child) => {
      child.geometry?.dispose?.();
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.filter(Boolean).forEach((material) => {
        Object.values(material).forEach((value) => value?.isTexture && value.dispose());
        material.dispose?.();
      });
    });
  }

  updatePopupPosition(elapsed) {
    this.popupTarget.getWorldPosition(this.projectPoint);
    this.projectPoint.y += 1.0 + Math.sin(elapsed * 4) * 0.12;
    this.projectPoint.project(this.camera);

    const x = (this.projectPoint.x * 0.5 + 0.5) * this.context.viewport.width;
    const y = (-this.projectPoint.y * 0.5 + 0.5) * this.context.viewport.height;
    this.popup.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }

  setInitialCamera(width, height) {
    const aspect = width / height;

    if (aspect < 0.75) {
      this.camera.position.set(0, 32, 52);
      this.camera.fov = 52;
    } else if (aspect < 1.1) {
      this.camera.position.set(0, 25, 42);
      this.camera.fov = 50;
    } else {
      this.camera.position.set(0, 18, 32);
      this.camera.fov = 48;
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  resize(width, height) {
    if (!this.camera) return;

    this.camera.aspect = width / height;

    // Chỉ tự căn camera trước khi người chơi xoay/zoom.
    // Sau tương tác đầu tiên, resize không được giật camera về góc mặc định.
    if (!this.cameraUserInteracted) {
      this.setInitialCamera(width, height);
      if (this.controls) {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }
    } else {
      this.camera.updateProjectionMatrix();
    }
  }

  dispose() {
    this.unsubscribeLanguage?.();
    this.hud?.dispose();
    this.popup?.remove();

    if (this.controls) {
      if (this.controlsStartedHandler) {
        this.controls.removeEventListener('start', this.controlsStartedHandler);
      }
      this.controls.dispose();
      this.controls = null;
    }

    for (let index = this.visitors.length - 1; index >= 0; index -= 1) {
      this.removeVisitor(index);
    }

    this.activePointers.clear();
    this.tapState = null;

    super.dispose();
    this.planets.length = 0;
    this.popupTarget = null;
  }
}
