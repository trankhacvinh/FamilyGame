export const CLAW_STATE = Object.freeze({
  IDLE: 'IDLE',
  LOWERING: 'LOWERING',
  GRABBING: 'GRABBING',
  LIFTING: 'LIFTING',
  DELIVERING: 'DELIVERING',
  DROPPING: 'DROPPING',
  RETURNING: 'RETURNING',
  COMPLETED: 'COMPLETED',
});

export const CLAW_CONFIG = Object.freeze({
  clawMinX: -3.25,
  clawMaxX: 3.15,
  clawHomeX: 0,
  clawTopY: 3.05,
  clawGrabY: -1.0,
  chuteX: 3.45,
  chuteDropY: -2.5,
  grabRadius: 0.78,
  lowerDuration: 0.95,
  grabDuration: 0.48,
  liftDuration: 0.92,
  deliverDuration: 1.05,
  dropDuration: 0.58,
  returnDuration: 0.82,
});
