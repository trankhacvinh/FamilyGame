export const PLANET_CATALOG = Object.freeze([
  Object.freeze({ nameKey: 'mercury', color: 0xb9b2aa, radius: 0.28, orbitRadius: 2.15, orbitSpeed: 0.98, angle: 0.25 }),
  Object.freeze({ nameKey: 'venus', color: 0xe8b56f, radius: 0.4, orbitRadius: 2.9, orbitSpeed: 0.78, angle: 1.35 }),
  Object.freeze({ nameKey: 'earth', color: 0x4e9fff, radius: 0.46, orbitRadius: 3.75, orbitSpeed: 0.62, angle: 2.25, atmosphere: true }),
  Object.freeze({ nameKey: 'mars', color: 0xf07962, radius: 0.35, orbitRadius: 4.65, orbitSpeed: 0.5, angle: 3.25 }),
  Object.freeze({ nameKey: 'jupiter', color: 0xd6a77d, radius: 0.82, orbitRadius: 5.95, orbitSpeed: 0.34, angle: 4.05, bands: true }),
  Object.freeze({ nameKey: 'saturn', color: 0xf2c77c, radius: 0.7, orbitRadius: 7.15, orbitSpeed: 0.27, angle: 4.8, ring: 'saturn' }),
  Object.freeze({ nameKey: 'uranus', color: 0x8ee6df, radius: 0.54, orbitRadius: 8.25, orbitSpeed: 0.22, angle: 5.45, ring: 'uranus' }),
  Object.freeze({ nameKey: 'neptune', color: 0x5479f0, radius: 0.53, orbitRadius: 9.35, orbitSpeed: 0.18, angle: 6.05 }),
]);

export const SPACE_VISITOR_CONFIG = Object.freeze({
  firstDelay: Object.freeze([5, 8]),
  nextDelay: Object.freeze([9, 17]),
  maxVisitors: 2,
  minSpeed: 2.2,
  maxSpeed: 3.2,
});
