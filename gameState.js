import { generateCloneId } from './utils.js';

let _state = {
  coins: 100,
  heldObject: null,
  clones: new Set(),
  isLampOn: true,
  cubeUIVisible: false,
  wateringCanUIVisible: false,
  seedUIVisible: false,
  // флаги UI
};

// Геттеры
export const getState = () => _state;
export const getCoins = () => _state.coins;
export const getHeldObject = () => _state.heldObject;
export const getClones = () => _state.clones;
export const isLampOn = () => _state.isLampOn;

// Мутаторы
export const setCoins = (value) => { _state.coins = value; };
export const setHeldObject = (obj) => { _state.heldObject = obj; };
export const addClone = (clone) => { _state.clones.add(clone); };
export const removeClone = (clone) => { _state.clones.delete(clone); };
export const toggleLamp = () => { _state.isLampOn = !_state.isLampOn; };

export const showCubeUI = (show) => { _state.cubeUIVisible = show; };
export const showWateringCanUI = (show) => { _state.wateringCanUIVisible = show; };
export const showSeedUI = (show) => { _state.seedUIVisible = show; };

// Утилиты
export const isHoldingCube = () => _state.heldObject?.userData?.type === 'cube';
export const isHoldingSeed = () => _state.heldObject?.userData?.type === 'seed';
export const isHoldingWateringCan = () => _state.heldObject === 'wateringCan';
