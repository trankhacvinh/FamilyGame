import { SCREEN } from './constants.js';

export const GAME_REGISTRY = Object.freeze({
  [SCREEN.SHAPES]: {
    id: SCREEN.SHAPES,
    titleKey: 'shapesTitle',
    descriptionKey: 'shapesDescription',
    icon: '🔺',
    accent: '#ff7f7f',
    category: 'logic',
    minAge: 3,
    type: '3D',
    loader: () => import('../games/shapes/ShapesSpeechGame.js'),
    exportName: 'ShapesSpeechGame',
  },
  [SCREEN.SPACE]: {
    id: SCREEN.SPACE,
    titleKey: 'spaceTitle',
    descriptionKey: 'spaceDescription',
    icon: '🪐',
    accent: '#6f93ff',
    category: 'science',
    minAge: 3,
    type: '3D',
    loader: () => import('../games/space/SpaceInfoGame.js'),
    exportName: 'SpaceInfoGame',
  },
  [SCREEN.ARCHAEOLOGY]: {
    id: SCREEN.ARCHAEOLOGY,
    titleKey: 'archaeologyTitle',
    descriptionKey: 'archaeologyDescription',
    icon: '🪨',
    accent: '#d89c62',
    category: 'curiosity',
    minAge: 3,
    type: '3D',
    loader: () => import('../games/archaeology/ContinuousBreakArchaeologyGame.js'),
    exportName: 'ContinuousBreakArchaeologyGame',
  },
});

export function getGameDefinition(screenId) {
  return GAME_REGISTRY[screenId] ?? null;
}
