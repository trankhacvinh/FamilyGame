export const HIDDEN_OBJECTS = Object.freeze([
  { id: 'bear', labelKey: 'bear', icon: '🧸', position: [-3.35, -1.15, 0.72], size: 0.92, rotationY: 0.18 },
  { id: 'cat', labelKey: 'cat', icon: '🐱', position: [-2.35, -1.92, 0.92], size: 0.82, rotationY: -0.2 },
  { id: 'ball', labelKey: 'ball', icon: '⚽', position: [-0.65, -2.02, 0.98], size: 0.82, rotationY: 0.08 },
  { id: 'starToy', labelKey: 'starToy', icon: '⭐', position: [-0.05, 1.18, 0.62], size: 0.72, rotationY: -0.08 },
  { id: 'apple', labelKey: 'apple', icon: '🍎', position: [0.18, -0.28, 0.86], size: 0.68, rotationY: 0.12 },
  { id: 'fish', labelKey: 'fish', icon: '🐟', position: [1.25, 0.62, 0.72], size: 0.75, rotationY: -0.12 },
  { id: 'banana', labelKey: 'banana', icon: '🍌', position: [1.62, -0.28, 0.86], size: 0.73, rotationY: 0.1 },
  { id: 'car', labelKey: 'car', icon: '🚗', position: [2.35, -1.92, 0.9], size: 0.82, rotationY: -0.16 },
  { id: 'duck', labelKey: 'duck', icon: '🐤', position: [3.18, 1.28, 0.6], size: 0.72, rotationY: 0.15 },
  { id: 'turtle', labelKey: 'turtle', icon: '🐢', position: [3.35, -1.25, 0.8], size: 0.8, rotationY: -0.18 },
]);

export const HIDDEN_OBJECTS_CONFIG = Object.freeze({
  nextTargetDelayMs: 900,
  promptDelayMs: 180,
  successAnimationSeconds: 0.85,
  wrongAnimationSeconds: 0.38,
  tapMoveThresholdPx: 14,
  roomViewHeight: 6.8,
});
