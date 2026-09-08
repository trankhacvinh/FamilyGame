export const FRUIT_CATCH_CONFIG = Object.freeze({
  maxHearts: 3,
  healEveryPoints: 20,
  quizlessScorePerFruit: 1,
  baseFallSpeed: 0.92,
  fallSpeedVariance: 0.16,
  spawnDelayMin: 1.7,
  spawnDelayMax: 2.35,
  firstSpawnDelay: 0.65,
  wormChance: 0.18,
  maxActiveItems: 7,
  speedOptions: [1, 2, 3, 4],
});

export const FALLING_TYPES = Object.freeze({
  APPLE: 'apple',
  BANANA: 'banana',
  STRAWBERRY: 'strawberry',
  WORM: 'worm',
});

export const FRUIT_TYPES = Object.freeze([
  FALLING_TYPES.APPLE,
  FALLING_TYPES.BANANA,
  FALLING_TYPES.STRAWBERRY,
]);
