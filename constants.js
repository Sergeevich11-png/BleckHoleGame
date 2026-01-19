export const DRYING_COLORS = [0x8B4513, 0xA16B3F, 0xB8855A, 0xff9800];

export const WORLD_SIZE = {
  X: 50,
  Y: 25,
  Z: 50
};

export const PLAYER_HEIGHT = 3.2;
export const START_POS = { x: -20, y: PLAYER_HEIGHT, z: 20 };
export const BASE_MOVE_SPEED = 0.008;
export const LOOK_SENSITIVITY = 0.002;
export const WALL_MARGIN = 0.5;
export const HOLD_THRESHOLD_MS = 200;

export const COLORS = {
  wall: 0xC8C8C8,
  ceiling: 0xF5F0E6,
  floorDark: 0x5D4037,
  floorLight: 0x8D6E63,
  bulb: 0xffffcc,
  wateringCan: 0x2196F3,
  cube: 0xff9800,
  seed: 0x000000,
  switchPlate: 0xffff00
};

export const COLOR_OPTIONS = [
  { hex: 0xffffff, light: 0xffffff },
  { hex: 0xffffb3, light: 0xfff0b3 },
  { hex: 0xffb3ff, light: 0xff66ff },
  { hex: 0xb3ffb3, light: 0x66ff66 }
];
