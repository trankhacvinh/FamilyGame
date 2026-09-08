export const ARCHAEOLOGY_CONFIG = Object.freeze({
  minHits: 5,
  maxHits: 7,
  answerCount: 3,
});

export const ARCHAEOLOGY_CATALOG = Object.freeze([
  { id: 'dinosaur', nameKey: 'dinosaur', category: 'dinosaur', accent: 0x75d693 },
  { id: 'egg', nameKey: 'goldenEgg', category: 'dinosaur', accent: 0xffd35f },
  { id: 'rabbit', nameKey: 'rabbit', category: 'animal', accent: 0xf2c6df },
  { id: 'cat', nameKey: 'cat', category: 'animal', accent: 0xffbd7e },
  { id: 'fish', nameKey: 'fish', category: 'animal', accent: 0x65c9e8 },
  { id: 'turtle', nameKey: 'turtle', category: 'animal', accent: 0x79c98f },
  { id: 'apple', nameKey: 'apple', category: 'fruit', accent: 0xff6f72 },
  { id: 'banana', nameKey: 'banana', category: 'fruit', accent: 0xffdd55 },
  { id: 'strawberry', nameKey: 'strawberry', category: 'fruit', accent: 0xff6485 },
  { id: 'grape', nameKey: 'grape', category: 'fruit', accent: 0x9b7de3 },
  { id: 'orange', nameKey: 'orange', category: 'fruit', accent: 0xff9c47 },
  { id: 'car', nameKey: 'car', category: 'object', accent: 0x6c9eff },
  { id: 'ball', nameKey: 'ball', category: 'object', accent: 0xff867d },
  { id: 'starToy', nameKey: 'starToy', category: 'object', accent: 0xffd85c },
  { id: 'duck', nameKey: 'duck', category: 'animal', accent: 0xffd85c },
  { id: 'bear', nameKey: 'bear', category: 'animal', accent: 0xb98a63 },
]);

export function getRandomItem(excludeId = null) {
  const pool = excludeId
    ? ARCHAEOLOGY_CATALOG.filter((item) => item.id !== excludeId)
    : ARCHAEOLOGY_CATALOG;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function makeAnswerOptions(correctItem) {
  const distractors = ARCHAEOLOGY_CATALOG
    .filter((item) => item.id !== correctItem.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, ARCHAEOLOGY_CONFIG.answerCount - 1);

  return [correctItem, ...distractors].sort(() => Math.random() - 0.5);
}
