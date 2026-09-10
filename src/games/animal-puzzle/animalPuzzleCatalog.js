const base = `${import.meta.env.BASE_URL}assets/puzzles`;

export const ANIMAL_PUZZLES = Object.freeze([
  Object.freeze({
    id: 'rabbit',
    nameVi: 'Con Thỏ',
    nameEn: 'Rabbit',
    image: `${base}/rabbit/full.webp`,
    rows: 2,
    cols: 3,
    pieceCount: 6,
    accent: '#f3a5c4',
  }),
  Object.freeze({
    id: 'lion',
    nameVi: 'Con Sư Tử',
    nameEn: 'Lion',
    image: `${base}/lion/full.webp`,
    rows: 2,
    cols: 3,
    pieceCount: 6,
    accent: '#f4b85b',
  }),
]);

export function getAnimalName(animal, language) {
  return language === 'en' ? animal.nameEn : animal.nameVi;
}
