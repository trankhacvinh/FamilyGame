export const SHAPE_GAME_CONFIG = Object.freeze({
  defaultCount: 3,
  countOptions: Object.freeze([3, 4, 5, 6]),
  storageKey: 'familygame-shape-count',
});

/**
 * Catalog data-driven: thêm shape mới chủ yếu bằng cách thêm một entry tại đây
 * và geometry factory tương ứng trong ShapesGame.
 */
export const SHAPE_CATALOG = Object.freeze([
  Object.freeze({ id: 'circle', nameKey: 'circle', color: 0xff6f7f, geometry: 'sphere' }),
  Object.freeze({ id: 'square', nameKey: 'square', color: 0x66d59a, geometry: 'box' }),
  Object.freeze({ id: 'triangle', nameKey: 'triangle', color: 0x65a9ff, geometry: 'trianglePrism' }),
  Object.freeze({ id: 'rectangle', nameKey: 'rectangle', color: 0xffa85c, geometry: 'rectangleBox' }),
  Object.freeze({ id: 'star', nameKey: 'star', color: 0xb487f2, geometry: 'starPrism' }),
  Object.freeze({ id: 'hexagon', nameKey: 'hexagon', color: 0x55cbd3, geometry: 'hexagonPrism' }),
]);

export function readShapeCount() {
  const stored = Number.parseInt(localStorage.getItem(SHAPE_GAME_CONFIG.storageKey) ?? '', 10);
  return SHAPE_GAME_CONFIG.countOptions.includes(stored)
    ? stored
    : SHAPE_GAME_CONFIG.defaultCount;
}
