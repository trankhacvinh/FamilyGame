import * as THREE from 'three';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.46,
    metalness: 0.02,
    ...options,
  });
}

function addMesh(group, geometry, color, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], options = {}) {
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function makeEye(group, x, y, z) {
  addMesh(group, new THREE.SphereGeometry(0.07, 12, 8), 0x20243a, [x, y, z]);
}

function makeDinosaur() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.72, 24, 18), 0x75d693, [-0.15, 0, 0], [1.25, 0.72, 0.72]);
  addMesh(g, new THREE.SphereGeometry(0.44, 20, 14), 0x8ee4a8, [0.78, 0.4, 0.02]);
  addMesh(g, new THREE.ConeGeometry(0.34, 1.35, 16), 0x65bd84, [-1.0, 0.08, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  [-0.52, 0.2].forEach((x) => {
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.17, 0.72, 12), 0x62bf83, [x, -0.63, 0.25]);
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.17, 0.72, 12), 0x62bf83, [x, -0.63, -0.25]);
  });
  [ -0.65, -0.2, 0.25 ].forEach((x) => addMesh(g, new THREE.ConeGeometry(0.13, 0.32, 8), 0xf6b66d, [x, 0.63, 0], [1, 1, 1], [0, 0, Math.PI]));
  makeEye(g, 1.04, 0.52, 0.32);
  makeEye(g, 1.04, 0.52, -0.32);
  g.rotation.y = -0.25;
  return g;
}

function makeEgg() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.76, 32, 24), 0xffd85c, [0, 0, 0], [0.9, 1.25, 0.9], [0, 0, 0], {
    metalness: 0.42,
    roughness: 0.25,
    emissive: 0x6b4300,
    emissiveIntensity: 0.15,
  });
  return g;
}

function makeRabbit() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.58, 24, 18), 0xf0d4e4, [0, -0.15, 0], [0.9, 1.1, 0.9]);
  addMesh(g, new THREE.SphereGeometry(0.46, 22, 16), 0xf6ddeb, [0, 0.62, 0]);
  [-0.2, 0.2].forEach((x) => {
    addMesh(g, new THREE.SphereGeometry(0.18, 16, 12), 0xf4d8e8, [x, 1.28, 0], [0.75, 2.0, 0.65], [0, 0, x < 0 ? -0.12 : 0.12]);
    addMesh(g, new THREE.SphereGeometry(0.09, 12, 8), 0xff9fbe, [x, 1.3, 0.12], [0.7, 1.6, 0.45]);
  });
  makeEye(g, -0.18, 0.73, 0.39);
  makeEye(g, 0.18, 0.73, 0.39);
  addMesh(g, new THREE.SphereGeometry(0.07, 12, 8), 0xff8aa8, [0, 0.52, 0.45]);
  addMesh(g, new THREE.SphereGeometry(0.19, 14, 10), 0xffffff, [0, -0.25, -0.58]);
  return g;
}

function makeCat() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.62, 24, 18), 0xffb66f, [0, -0.12, 0], [0.92, 1.05, 0.92]);
  addMesh(g, new THREE.SphereGeometry(0.48, 22, 16), 0xffc17f, [0, 0.62, 0]);
  [-0.28, 0.28].forEach((x) => addMesh(g, new THREE.ConeGeometry(0.22, 0.48, 3), 0xf29a55, [x, 1.02, 0], [1, 1, 1], [0, 0, x < 0 ? 0.16 : -0.16]));
  makeEye(g, -0.18, 0.7, 0.4);
  makeEye(g, 0.18, 0.7, 0.4);
  addMesh(g, new THREE.SphereGeometry(0.06, 10, 8), 0xe66b79, [0, 0.54, 0.46]);
  const tail = addMesh(g, new THREE.TorusGeometry(0.44, 0.095, 10, 24, Math.PI * 1.3), 0xf29a55, [-0.58, -0.12, -0.15]);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = -0.7;
  return g;
}

function makeFish() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.68, 24, 18), 0x61c9e9, [0, 0, 0], [1.25, 0.72, 0.56]);
  addMesh(g, new THREE.ConeGeometry(0.52, 0.7, 3), 0x4aaecf, [-1.0, 0, 0], [1, 1, 1], [0, 0, -Math.PI / 2]);
  makeEye(g, 0.62, 0.16, 0.38);
  addMesh(g, new THREE.ConeGeometry(0.18, 0.44, 3), 0xffd25f, [-0.05, 0.6, 0], [1, 1, 1], [0, 0, Math.PI]);
  return g;
}

function makeTurtle() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.7, 24, 18), 0x66a96f, [0, 0, 0], [1.15, 0.48, 0.92]);
  addMesh(g, new THREE.SphereGeometry(0.34, 18, 12), 0x91d39a, [0.9, 0.02, 0]);
  [[-0.48,-0.38,0.5],[0.48,-0.38,0.5],[-0.48,-0.38,-0.5],[0.48,-0.38,-0.5]].forEach((p) => addMesh(g, new THREE.SphereGeometry(0.2, 14, 10), 0x8bd095, p, [1.35,0.55,0.8]));
  makeEye(g, 1.08, 0.1, 0.23);
  return g;
}

function makeApple() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.72, 26, 20), 0xff626b, [0, 0, 0], [1, 0.95, 1]);
  addMesh(g, new THREE.CylinderGeometry(0.07, 0.08, 0.45, 10), 0x6f4a2c, [0, 0.78, 0], [1,1,1], [0,0,0.18]);
  addMesh(g, new THREE.SphereGeometry(0.25, 14, 10), 0x62bd73, [0.26, 0.82, 0], [1.2, 0.35, 0.7], [0,0,-0.35]);
  return g;
}

function makeBanana() {
  const g = new THREE.Group();
  const banana = addMesh(g, new THREE.TorusGeometry(0.66, 0.18, 14, 32, Math.PI * 1.28), 0xffdc4f, [0, 0.05, 0]);
  banana.rotation.z = -0.35;
  banana.rotation.x = 0.24;
  addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), 0x80622e, [-0.66, 0.52, 0], [1,1,1], [0,0,0.4]);
  return g;
}

function makeStrawberry() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.65, 24, 18), 0xff5572, [0, -0.05, 0], [0.9, 1.15, 0.9]);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    addMesh(g, new THREE.ConeGeometry(0.16, 0.48, 3), 0x63bd6f, [Math.cos(angle)*0.25, 0.72, Math.sin(angle)*0.25], [1,1,1], [0,0,Math.PI]);
  }
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    addMesh(g, new THREE.SphereGeometry(0.035, 8, 6), 0xffe274, [Math.cos(angle)*0.45, -0.1 + (i%3)*0.22, Math.sin(angle)*0.42]);
  }
  return g;
}

function makeGrape() {
  const g = new THREE.Group();
  const coords = [[0,0.55,0],[-0.28,0.25,0.12],[0.28,0.25,-0.08],[-0.42,-0.08,-0.05],[0,-0.08,0.08],[0.42,-0.08,0.02],[-0.25,-0.42,0.02],[0.25,-0.42,-0.04],[0,-0.72,0]];
  coords.forEach((p) => addMesh(g, new THREE.SphereGeometry(0.27, 16, 12), 0x8b67d7, p));
  addMesh(g, new THREE.CylinderGeometry(0.05, 0.06, 0.42, 8), 0x618c45, [0,0.98,0], [1,1,1], [0,0,0.15]);
  return g;
}

function makeOrange() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.72, 28, 20), 0xff973f);
  addMesh(g, new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8), 0x6d7f35, [0,0.78,0], [1,1,1], [0,0,0.12]);
  addMesh(g, new THREE.SphereGeometry(0.23, 14, 10), 0x6fbf55, [0.25,0.83,0], [1.2,0.3,0.65], [0,0,-0.3]);
  return g;
}

function makeCar() {
  const g = new THREE.Group();
  addMesh(g, new THREE.BoxGeometry(1.5, 0.52, 0.72), 0x6d98ff, [0,-0.05,0]);
  addMesh(g, new THREE.BoxGeometry(0.8, 0.45, 0.68), 0x8eb4ff, [0.18,0.42,0]);
  [[-0.5,-0.38,0.42],[0.5,-0.38,0.42],[-0.5,-0.38,-0.42],[0.5,-0.38,-0.42]].forEach((p) => {
    const wheel = addMesh(g, new THREE.CylinderGeometry(0.22, 0.22, 0.14, 18), 0x30374b, p);
    wheel.rotation.x = Math.PI / 2;
  });
  return g;
}

function makeBall() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.72, 26, 20), 0xff7d78);
  const band1 = addMesh(g, new THREE.TorusGeometry(0.72, 0.055, 10, 36), 0xffffff);
  band1.rotation.x = Math.PI / 2;
  const band2 = addMesh(g, new THREE.TorusGeometry(0.72, 0.055, 10, 36), 0x6c98ff);
  band2.rotation.y = Math.PI / 2;
  return g;
}

function createStarShape() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.78 : 0.35;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function makeStar() {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(createStarShape(), { depth: 0.3, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2 });
  geo.center();
  addMesh(g, geo, 0xffd558, [0,0,0], [1,1,1], [0,0,-0.1], { emissive: 0x4c3100, emissiveIntensity: 0.12 });
  return g;
}

function makeDuck() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.62, 24, 18), 0xffd653, [-0.1,-0.12,0], [1.15,0.8,0.9]);
  addMesh(g, new THREE.SphereGeometry(0.43, 20, 14), 0xffe16d, [0.42,0.55,0]);
  addMesh(g, new THREE.ConeGeometry(0.18, 0.42, 4), 0xff923e, [0.85,0.48,0], [1,1,1], [0,0,-Math.PI/2]);
  makeEye(g, 0.55,0.68,0.33);
  return g;
}

function makeBear() {
  const g = new THREE.Group();
  addMesh(g, new THREE.SphereGeometry(0.62, 24, 18), 0xb9865f, [0,-0.12,0], [0.95,1.12,0.92]);
  addMesh(g, new THREE.SphereGeometry(0.5, 22, 16), 0xc89670, [0,0.68,0]);
  [-0.34,0.34].forEach((x) => addMesh(g, new THREE.SphereGeometry(0.2, 14, 10), 0xa97250, [x,1.05,0]));
  addMesh(g, new THREE.SphereGeometry(0.24, 14, 10), 0xe6bd98, [0,0.56,0.4], [1.2,0.7,0.6]);
  makeEye(g,-0.18,0.78,0.4); makeEye(g,0.18,0.78,0.4);
  addMesh(g, new THREE.SphereGeometry(0.075, 10, 8), 0x34303a, [0,0.6,0.54]);
  [-0.52,0.52].forEach((x) => addMesh(g, new THREE.SphereGeometry(0.24, 14, 10), 0xb9865f, [x,-0.18,0], [0.75,1.2,0.8]));
  return g;
}

export function createToyModel(itemId) {
  const builders = {
    dinosaur: makeDinosaur,
    egg: makeEgg,
    rabbit: makeRabbit,
    cat: makeCat,
    fish: makeFish,
    turtle: makeTurtle,
    apple: makeApple,
    banana: makeBanana,
    strawberry: makeStrawberry,
    grape: makeGrape,
    orange: makeOrange,
    car: makeCar,
    ball: makeBall,
    starToy: makeStar,
    duck: makeDuck,
    bear: makeBear,
  };

  const group = (builders[itemId] ?? makeBall)();
  group.userData.itemId = itemId;
  return group;
}
