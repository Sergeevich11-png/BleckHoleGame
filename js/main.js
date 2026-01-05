import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { Game } from './game.js';
import { DEFAULT_SETTINGS } from './config.js';

// Initialize managers
const uiManager = new UIManager();
const audioManager = new AudioManager();

// Load settings from localStorage or use defaults
let settings = { ...DEFAULT_SETTINGS };
const savedLang = localStorage.getItem('language');
if (savedLang) {
  settings.language = savedLang;
  uiManager.lang = savedLang;
  uiManager.updateTexts();
}

// Initialize game
const game = new Game(uiManager, audioManager);

// Event listeners
window.addEventListener('game:start', () => {
  game.start();
});

window.addEventListener('game:menu', () => {
  game.cleanup();
  uiManager.showMenu();
});

window.addEventListener('resize', () => {
  if (game.renderer) {
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  if (game.camera) {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
  }
});
