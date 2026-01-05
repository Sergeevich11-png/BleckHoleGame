import { LANG, DEFAULT_SETTINGS } from './config.js';

export class UIManager {
  constructor() {
    this.lang = DEFAULT_SETTINGS.language;
    this.visible = false;
    this.initElements();
    this.bindEvents();
    this.updateTexts();
  }

  initElements() {
    this.elements = {
      menu: document.getElementById('menu'),
      infoPanel: document.getElementById('infoPanel'),
      ui: document.getElementById('ui'),
      coordinates: document.getElementById('coordinates'),
      gameOver: document.getElementById('gameOver'),
      startBtn: document.getElementById('startBtn'),
      restartBtn: document.getElementById('restartBtn'),
      menuBtn: document.getElementById('menuBtn'),
      infoBtn: document.getElementById('infoBtn'),
      closeInfo: document.getElementById('closeInfo'),
      langBtn: document.getElementById('langBtn'),
      score: document.getElementById('score'),
      size: document.getElementById('size'),
      universe: document.getElementById('universe'),
      finalScore: document.getElementById('finalScore'),
      coords: document.getElementById('coordinates')
    };
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('game:start')));
    this.elements.restartBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('game:start')));
    this.elements.menuBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('game:menu')));
    this.elements.infoBtn.addEventListener('click', () => this.showInfo());
    this.elements.closeInfo.addEventListener('click', () => this.hideInfo());
    this.elements.langBtn.addEventListener('click', () => this.toggleLanguage());
  }

  toggleLanguage() {
    this.lang = this.lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('language', this.lang);
    this.updateTexts();
  }

  updateTexts() {
    const t = LANG[this.lang] || LANG.ru;
    this.elements.startBtn.textContent = t.play;
    this.elements.infoBtn.textContent = t.info;
    this.elements.langBtn.textContent = t.lang;
    document.getElementById('title').textContent = t.title;
    document.getElementById('scoreLabel').textContent = t.score;
    document.getElementById('sizeLabel').textContent = t.size;
    document.getElementById('universeLabel').textContent = t.universe;
    document.getElementById('gameOverText').textContent = t.gameOver;
    document.getElementById('finalScoreLabel').textContent = t.finalScore;
    document.getElementById('restartBtn').textContent = t.restart;
    document.getElementById('menuBtn').textContent = t.menu;
    document.getElementById('infoTitle').textContent = t.infoTitle;
    document.getElementById('infoDesc').innerHTML = t.infoDesc;
    document.getElementById('infoGoal').textContent = t.infoGoal;
    document.getElementById('infoControls').innerHTML = t.infoControls;
  }

  showInfo() {
    this.elements.infoPanel.classList.add('visible');
  }

  hideInfo() {
    this.elements.infoPanel.classList.remove('visible');
  }

  showMenu() {
    this.elements.menu.classList.remove('hidden');
    this.elements.gameOver.classList.remove('visible');
    this.hideUI();
  }

  hideMenu() {
    this.elements.menu.classList.add('hidden');
  }

  showGameOver(finalScore) {
    this.elements.finalScore.textContent = finalScore;
    this.elements.gameOver.classList.add('visible');
    this.hideUI();
  }

  showUI() {
    setTimeout(() => {
      this.elements.ui.classList.add('visible');
      this.elements.coordinates.classList.add('visible');
    }, 300);
  }

  hideUI() {
    this.elements.ui.classList.remove('visible');
    this.elements.coordinates.classList.remove('visible');
  }

  updateUI(score, size, universeSize) {
    this.elements.score.textContent = score;
    this.elements.size.textContent = size.toFixed(1);
    this.elements.universe.textContent = `${Math.round(universeSize)}³`;
  }

  updateCoordinates(x, y, z) {
    if (this.elements.coords) {
      this.elements.coords.textContent = `X: ${Math.round(x)}  Y: ${Math.round(y)}  Z: ${Math.round(z)}`;
    }
  }
}
