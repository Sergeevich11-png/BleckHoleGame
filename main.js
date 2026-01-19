import { initGame } from './game.js';
import { setupMainMenu, setupPauseMenu, setupShopButtons } from './ui.js';

// Глобальные флаги (доступны через window для совместимости)
let isGameActive = false;
let gameInitialized = false;
let currentGameState = null;

window.isGameActive = isGameActive;
window.gameInitialized = gameInitialized;
window.currentGameState = currentGameState;

window.setIsGameActive = (val) => { window.isGameActive = val; };
window.setGameInitialized = (val) => { window.gameInitialized = val; };
window.setCurrentGameState = (fn) => { window.currentGameState = fn; };

// Инициализация UI
setupMainMenu(initGame);
setupPauseMenu();
setupShopButtons();

// Проверка сохранения
if (localStorage.getItem('savedGameState')) {
  document.getElementById('continueBtn').style.display = 'block';
}
