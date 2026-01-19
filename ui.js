import { getState, setCoins, showCubeUI, showWateringCanUI, showSeedUI } from './gameState.js';

const coinCountEl = document.getElementById('coinCount');
const cubeUI = document.getElementById('cubeUI');
const wateringCanUI = document.getElementById('wateringCanUI');
const seedUI = document.getElementById('seedUI');
const confirmBox = document.getElementById('confirmBox');
const confirmText = document.getElementById('confirmText');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
const colorPickerUI = document.getElementById('colorPickerUI');

let isConfirming = false;

export function updateCoinDisplay() {
  coinCountEl.textContent = getState().coins;
}

export function setupUIVisibility() {
  cubeUI.style.display = getState().cubeUIVisible ? 'block' : 'none';
  wateringCanUI.style.display = getState().wateringCanUIVisible ? 'block' : 'none';
  seedUI.style.display = getState().seedUIVisible ? 'block' : 'none';
}

export function showConfirm(text, yesText, noText, onYes, onNo) {
  if (isConfirming) return;
  confirmText.textContent = text;
  confirmYes.textContent = yesText;
  confirmNo.textContent = noText;
  confirmYes.onclick = () => {
    onYes(); confirmBox.style.display = 'none'; isConfirming = false;
  };
  confirmNo.onclick = () => {
    onNo(); confirmBox.style.display = 'none'; isConfirming = false;
  };
  confirmBox.style.display = 'block';
  isConfirming = true;
}

export function buildColorPickerUI(onSelect) {
  colorPickerUI.innerHTML = '<p>Выберите цвет</p>';
  import { COLOR_OPTIONS } from './constants.js';
  COLOR_OPTIONS.forEach(opt => {
    const btn = document.createElement('div');
    btn.style.backgroundColor = '#' + opt.hex.toString(16).padStart(6, '0');
    btn.onclick = () => {
      onSelect(opt);
      colorPickerUI.style.display = 'none';
    };
    colorPickerUI.appendChild(btn);
  });
  colorPickerUI.style.display = 'block';
}
