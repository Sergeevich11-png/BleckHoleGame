import { initGame, destroyGame, getCurrentGameState } from './game.js';
import { setupMainMenu, setupPauseMenu, setupShopButtons } from './ui.js';
import { loadSavedState } from './save.js';

let isGameActive = false;
let gameInitialized = false;

const mainMenu = document.getElementById('mainMenu');
const continueBtn = document.getElementById('continueBtn');
const playBtn = document.getElementById('playBtn');
const exitBtn = document.getElementById('exitBtn');
const pauseBtn = document.getElementById('pauseBtn');
const shopBtn = document.getElementById('shopBtn');

// Скрыть "Продолжить", если нет сохранения
if (!localStorage.getItem('savedGameState')) {
  continueBtn.style.display = 'none';
}

function startNewGame() {
  mainMenu.style.display = 'none';
  pauseBtn.style.display = 'block';
  shopBtn.style.display = 'block';
  isGameActive = true;
  initGame(null);
  gameInitialized = true;
}

function resumeSavedGame() {
  const saved = localStorage.getItem('savedGameState');
  if (saved) {
    mainMenu.style.display = 'none';
    pauseBtn.style.display = 'block';
    shopBtn.style.display = 'block';
    isGameActive = true;
    initGame(JSON.parse(saved));
    gameInitialized = true;
  }
}

playBtn.addEventListener('click', startNewGame);
continueBtn.addEventListener('click', resumeSavedGame);

exitBtn.addEventListener('click', () => {
  if (confirm('Выйти?')) location.reload();
});

pauseBtn.addEventListener('click', () => {
  isGameActive = false;
  document.getElementById('pauseMenu').style.display = 'flex';
});

// Настройка UI-менюшек
setupMainMenu();
setupPauseMenu(() => {
  isGameActive = true;
  gameInitialized = false;
});
setupShopButtons();

// Глобальный флаг активности для других модулей
export { isGameActive, gameInitialized };
