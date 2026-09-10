import * as THREE from 'three';

function material(color, roughness = 0.62, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    ...options,
  });
}

function add(group, geometry, meshMaterial, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function polish(group) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

function makeBall() {
  const g = new THREE.Group();
  const body = material(0xff7f86, 0.52);
  const cream = material(0xfffbef, 0.5);
  const blue = material(0x6e9cf4, 0.48);

  add(g, new THREE.SphereGeometry(0.72, 30, 22), body);
  const bandA = add(g, new THREE.TorusGeometry(0.72, 0.052, 10, 40), cream);
  bandA.rotation.x = Math.PI / 2;
  const bandB = add(g, new THREE.TorusGeometry(0.72, 0.052, 10, 40), blue);
  bandB.rotation.y = Math.PI / 2;

  // Tiny highlight keeps the ball toy-like without becoming glossy/plastic-heavy.
  add(g, new THREE.SphereGeometry(0.11, 12, 8), material(0xffffff, 0.35), [-0.25, 0.32, 0.62], [1.2, 0.65, 0.45]);
  return polish(g);
}

function makeCar() {
  const g = new THREE.Group();
  const blue = material(0x6f9ff3, 0.56);
  const blueLight = material(0xa8c9ff, 0.48);
  const cream = material(0xfff8e9, 0.5);
  const dark = material(0x3d465c, 0.72);
  const hub = material(0xbad3f7, 0.48);

  add(g, new THREE.BoxGeometry(1.52, 0.48, 0.68), blue, [0, -0.06, 0]);
  add(g, new THREE.BoxGeometry(0.82, 0.4, 0.62), blueLight, [0.16, 0.36, 0]);
  add(g, new THREE.BoxGeometry(0.28, 0.22, 0.71), cream, [0.7, 0.02, 0]);

  [-0.5, 0.5].forEach((x) => {
    [0.42, -0.42].forEach((z) => {
      const wheel = add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.14, 20), dark, [x, -0.36, z]);
      wheel.rotation.x = Math.PI / 2;
      const cap = add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.15, 16), hub, [x, -0.36, z]);
      cap.rotation.x = Math.PI / 2;
    });
  });
  return polish(g);
}

function createStarShape() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 0.78 : 0.36;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function makeStar() {
  const g = new THREE.Group();
  const geometry = new THREE.ExtrudeGeometry(createStarShape(), {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.055,
    bevelThickness: 0.055,
  });
  geometry.center();
  add(g, geometry, material(0xffd858, 0.44, { emissive: 0x5a3900, emissiveIntensity: 0.08 }));
  add(g, new THREE.SphereGeometry(0.09, 12, 8), material(0xfff3aa, 0.4), [-0.2, 0.25, 0.18], [1.25, 0.65, 0.5]);
  g.rotation.z = -0.08;
  return polish(g);
}

function createStrawberryBodyGeometry() {
  const geometry = new THREE.SphereGeometry(0.5, 26, 20);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i += 1) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = positions.getZ(i);
    const normalizedY = THREE.MathUtils.clamp((y + 0.5) / 1.0, 0, 1);
    const shoulder = 0.64 + 0.48 * Math.pow(normalizedY, 0.58);
    const bottomTaper = y < 0 ? THREE.MathUtils.lerp(0.7, 1, normalizedY * 2) : 1;
    x *= shoulder * bottomTaper;
    z *= shoulder * bottomTaper * 0.94;
    if (y < -0.08) y *= 1.22;
    positions.setXYZ(i, x, y, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function makeStrawberry() {
  const g = new THREE.Group();
  const red = material(0xf65f72, 0.58);
  const green = material(0x63b96f, 0.7);
  const seed = material(0xffe5a1, 0.54);

  add(g, createStrawberryBodyGeometry(), red, [0, -0.04, 0]);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    add(
      g,
      new THREE.ConeGeometry(0.1, 0.34, 5),
      green,
      [Math.cos(angle) * 0.15, 0.46, Math.sin(angle) * 0.1],
      [1, 0.85, 1],
      [Math.sin(angle) * 0.28, angle, Math.PI + Math.cos(angle) * 0.26],
    );
  }

  const seedPositions = [
    [-0.18, 0.23, 0.4], [0, 0.28, 0.43], [0.18, 0.22, 0.39],
    [-0.26, 0.06, 0.33], [-0.08, 0.08, 0.43], [0.12, 0.08, 0.42], [0.26, 0.04, 0.32],
    [-0.2, -0.12, 0.32], [0.02, -0.1, 0.42], [0.2, -0.12, 0.31],
  ];
  seedPositions.forEach(([x, y, z]) => add(g, new THREE.SphereGeometry(0.027, 7, 6), seed, [x, y, z], [0.75, 1.05, 0.45]));
  return polish(g);
}

function makeGrapes() {
  const g = new THREE.Group();
  const grape = material(0x8b70db, 0.54);
  const grapeLight = material(0xa68dec, 0.48);
  const stem = material(0x628c4c, 0.72);

  const coords = [
    [0, 0.52, 0], [-0.27, 0.28, 0.05], [0.27, 0.28, -0.04],
    [-0.4, -0.02, 0], [0, -0.02, 0.06], [0.4, -0.02, -0.03],
    [-0.24, -0.34, 0.03], [0.24, -0.34, -0.02], [0, -0.63, 0],
  ];
  coords.forEach((p, index) => add(g, new THREE.SphereGeometry(0.27, 18, 14), index % 3 === 0 ? grapeLight : grape, p));
  add(g, new THREE.CylinderGeometry(0.05, 0.06, 0.42, 9), stem, [0, 0.94, 0], [1, 1, 1], [0, 0, 0.14]);
  add(g, new THREE.SphereGeometry(0.22, 14, 10), material(0x75ad5b, 0.7), [0.23, 0.91, 0], [1.3, 0.28, 0.7], [0, 0, -0.35]);
  return polish(g);
}

function makeOrange() {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.7, 30, 22), material(0xff9a42, 0.6));
  add(g, new THREE.CylinderGeometry(0.045, 0.055, 0.23, 8), material(0x6d7f3d, 0.72), [0, 0.76, 0], [1, 1, 1], [0, 0, 0.12]);
  add(g, new THREE.SphereGeometry(0.24, 14, 10), material(0x72bd5b, 0.68), [0.24, 0.78, 0], [1.25, 0.28, 0.65], [0, 0, -0.28]);
  add(g, new THREE.SphereGeometry(0.1, 12, 8), material(0xffc27e, 0.52), [-0.23, 0.3, 0.61], [1.3, 0.6, 0.4]);
  return polish(g);
}

function makeGoldenEgg() {
  const g = new THREE.Group();
  const gold = material(0xffd95b, 0.28, {
    metalness: 0.16,
    emissive: 0x6a4300,
    emissiveIntensity: 0.1,
  });
  const cream = material(0xfff1ad, 0.34);
  add(g, new THREE.SphereGeometry(0.72, 32, 24), gold, [0, 0, 0], [0.88, 1.22, 0.88]);
  add(g, new THREE.SphereGeometry(0.14, 14, 10), cream, [-0.2, 0.34, 0.59], [1.25, 0.7, 0.45]);
  return polish(g);
}

export function createPolishedHiddenObjectModel(id) {
  const builders = {
    ball: makeBall,
    car: makeCar,
    starToy: makeStar,
    strawberry: makeStrawberry,
    grape: makeGrapes,
    orange: makeOrange,
    goldenEgg: makeGoldenEgg,
  };

  return builders[id]?.() ?? null;
}
