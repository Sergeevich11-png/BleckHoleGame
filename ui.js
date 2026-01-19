export function setupMainMenu(initGame) {
  const playBtn = document.getElementById('playBtn');
  const continueBtn = document.getElementById('continueBtn');
  const exitBtn = document.getElementById('exitBtn');

  playBtn.onclick = () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';
    document.getElementById('shopBtn').style.display = 'block';
    window.setIsGameActive(true);
    initGame(null);
  };

  continueBtn.onclick = () => {
    const saved = localStorage.getItem('savedGameState');
    if (saved) {
      document.getElementById('mainMenu').style.display = 'none';
      document.getElementById('pauseBtn').style.display = 'block';
      document.getElementById('shopBtn').style.display = 'block';
      window.setIsGameActive(true);
      initGame(JSON.parse(saved));
    }
  };

  exitBtn.onclick = () => {
    if (confirm('Выйти?')) location.reload();
  };
}

export function setupPauseMenu() {
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseMenu = document.getElementById('pauseMenu');
  const resumeBtn = document.getElementById('resumeBtn');
  const saveAndExitBtn = document.getElementById('saveAndExitBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');

  pauseBtn.onclick = () => {
    window.setIsGameActive(false);
    pauseMenu.style.display = 'flex';
  };

  resumeBtn.onclick = () => {
    pauseMenu.style.display = 'none';
    window.setIsGameActive(true);
  };

  saveAndExitBtn.onclick = () => {
    if (window.gameInitialized && window.currentGameState) {
      const state = window.currentGameState();
      localStorage.setItem('savedGameState', JSON.stringify(state));
      document.getElementById('continueBtn').style.display = 'block';
    }
    cleanupGame();
    document.getElementById('mainMenu').style.display = 'block';
  };

  backToMenuBtn.onclick = () => {
    localStorage.removeItem('savedGameState');
    document.getElementById('continueBtn').style.display = 'none';
    cleanupGame();
    document.getElementById('mainMenu').style.display = 'block';
  };
}

function cleanupGame() {
  document.getElementById('pauseMenu').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'block';
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('shopBtn').style.display = 'none';
  window.setIsGameActive(false);
  document.querySelector('canvas')?.remove();
  window.setGameInitialized(false);
  ['cubeUI', 'wateringCanUI', 'seedUI', 'colorPickerUI', 'confirmBox', 'shopMenu'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );
}

export function setupShopButtons() {
  // Ничего не делаем здесь — всё уже в game.js
}
