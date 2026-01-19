import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { createScene } from './scene.js';
import { setupInput } from './input.js';
import { updateCoinDisplay, setupUIVisibility, showConfirm, buildColorPickerUI } from './ui.js';
import { renderShopBuy, renderShopSell } from './shop.js';
import { saveGameState, loadGameState } from './saveLoad.js';
import {
  getState, setCoins, setHeldObject, addClone, removeClone,
  showCubeUI, showWateringCanUI, showSeedUI
} from './gameState.js';
import { WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, PLAYER_HEIGHT, WALL_MARGIN, BASE_MOVE_SPEED, LOOK_SENSITIVITY, HOLD_THRESHOLD_MS } from './constants.js';

// DOM элементы
const mainMenu = document.getElementById('mainMenu');
const continueBtn = document.getElementById('continueBtn');
const playBtn = document.getElementById('playBtn');
const exitBtn = document.getElementById('exitBtn');
const pauseBtn = document.getElementById('pauseBtn');
const shopBtn = document.getElementById('shopBtn');
const pauseMenu = document.getElementById('pauseMenu');
const shopMenu = document.getElementById('shopMenu');
const resumeBtn = document.getElementById('resumeBtn');
const saveAndExitBtn = document.getElementById('saveAndExitBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const shopBuyBtn = document.getElementById('shopBuyBtn');
const shopSellBtn = document.getElementById('shopSellBtn');
const shopCloseBtn = document.getElementById('shopCloseBtn');
const debugEl = document.getElementById('debug');

let isGameActive = false;
let gameInitialized = false;
let currentScene = null;
let lookX = 0, lookY = 0;
let joyDir = { x: 0, y: 0 };
let keys = { w: false, a: false, s: false, d: false };
let isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

// Инициализация игры
function initGame(loadState = null) {
  if (gameInitialized) return;

  const { scene, camera, renderer, objects } = createScene(loadState);
  currentScene = { scene, camera, renderer, objects };

  // Восстановление состояния
  if (loadState) {
    setCoins(loadState.coins);
    const heldId = loadGameState(
      loadState,      scene,
      camera,
      objects.spotLight,
      objects.bulb,
      objects.wateringCan,
      objects.originalCube,
      objects.originalSeed,
      getState().clones
    );
    if (heldId === 'wateringCan') {
      setHeldObject(objects.wateringCan);
      showWateringCanUI(true);
    } else if (heldId) {
      getState().clones.forEach(clone => {
        if (clone.userData.cloneId === heldId) {
          setHeldObject(clone);
          if (clone.userData.type === 'cube') showCubeUI(true);
          else if (clone.userData.type === 'seed') showSeedUI(true);
        }
      });
    }
  } else {
    setCoins(100);
  }

  updateCoinDisplay();
  setupUIVisibility();

  // Подключение ввода
  setupInput(camera, scene, objects, handleInteraction);

  // Магазин
  shopBuyBtn.onclick = () => renderShopBuy(scene, camera, objects.originalCube, objects.originalSeed, dropHeldObject, addClone);
  shopSellBtn.onclick = () => renderShopSell(sellHeldObject);
  shopCloseBtn.onclick = () => { shopMenu.style.display = 'none'; isGameActive = true; };
  shopBtn.onclick = () => {
    isGameActive = false;
    shopMenu.style.display = 'flex';
    renderShopBuy(scene, camera, objects.originalCube, objects.originalSeed, dropHeldObject, addClone);
  };

  // Анимация
  animate(0);
  gameInitialized = true;
}

// Обработка взаимодействий из input.js
function handleInteraction(action, target) {
  if (action === 'lamp') {
    currentScene.objects.spotLight.intensity = getState().isLampOn ? 9.5 : 0;  } else if (action === 'colorPicker') {
    buildColorPickerUI((opt) => {
      currentScene.objects.spotLight.color.set(opt.light);
      currentScene.objects.bulb.material.color.set(opt.hex);
    });
  } else if (action === 'pickup') {
    setHeldObject(target);
    if (target === currentScene.objects.wateringCan) {
      showWateringCanUI(true);
    } else if (target.userData.type === 'cube') {
      showCubeUI(true);
    } else if (target.userData.type === 'seed') {
      showSeedUI(true);
    }
    setupUIVisibility();
  }
}

// Выложить предмет
function dropHeldObject() {
  const held = getState().heldObject;
  if (!held || !currentScene) return;

  const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(currentScene.camera.quaternion);
  let dropPos = currentScene.camera.position.clone().add(offset);
  dropPos.y = held === currentScene.objects.wateringCan ? 0.5 :
              held.userData.type === 'cube' ? 1.5 / 2 : 0.5;
  dropPos.x = Math.round(dropPos.x);
  dropPos.z = Math.round(dropPos.z);
  const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
  const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
  dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
  dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));

  held.position.copy(dropPos);
  held.visible = true;
  setHeldObject(null);
  showCubeUI(false);
  showWateringCanUI(false);
  showSeedUI(false);
  setupUIVisibility();
}

// Продать предмет
function sellHeldObject(held) {
  currentScene.scene.remove(held);
  removeClone(held);
  setHeldObject(null);
  showCubeUI(false);
  showWateringCanUI(false);  showSeedUI(false);
  setupUIVisibility();
}

// Обновление игрока
function updatePlayer(delta) {
  let moveForward = 0, moveRight = 0;
  if (!isMobile) {
    if (keys.w) moveForward += 1;
    if (keys.s) moveForward -= 1;
    if (keys.a) moveRight -= 1;
    if (keys.d) moveRight += 1;
  } else {
    moveForward = -joyDir.y;
    moveRight = joyDir.x;
  }

  const inputStrength = Math.hypot(moveForward, moveRight);
  if (inputStrength > 0) {
    moveForward /= inputStrength;
    moveRight /= inputStrength;
    const responsiveness = 0.4;
    const speed = BASE_MOVE_SPEED * Math.pow(inputStrength, responsiveness) * delta;
    const dir = new THREE.Vector3(-Math.sin(lookX), 0, -Math.cos(lookX)).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    currentScene.camera.position.x += (dir.x * moveForward + right.x * moveRight) * speed;
    currentScene.camera.position.z += (dir.z * moveForward + right.z * moveRight) * speed;
  }

  currentScene.camera.position.y = PLAYER_HEIGHT;
  const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
  const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
  currentScene.camera.position.x = Math.max(-halfX, Math.min(halfX, currentScene.camera.position.x));
  currentScene.camera.position.z = Math.max(-halfZ, Math.min(halfZ, currentScene.camera.position.z));
  currentScene.camera.rotation.order = 'YXZ';
  currentScene.camera.rotation.y = lookX;
  currentScene.camera.rotation.x = lookY;

  if (getState().heldObject) {
    const offset = new THREE.Vector3(0, -0.3, -1.2).applyQuaternion(currentScene.camera.quaternion);
    getState().heldObject.position.copy(currentScene.camera.position).add(offset);
    getState().heldObject.quaternion.copy(currentScene.camera.quaternion);
    getState().heldObject.rotateY(Math.PI);
  }

  getState().clones.forEach(clone => {
    if (clone.visible && clone.userData.type === 'cube') clone.position.y = 1.5 / 2;
    else if (clone.visible && clone.userData.type === 'seed') clone.position.y = 0.5;
  });
  if (currentScene.objects.wateringCan.visible) currentScene.objects.wateringCan.position.y = 0.5;}

// Анимационный цикл
let lastTime = 0;
function animate(time) {
  if (!isGameActive || !currentScene) return requestAnimationFrame(animate);
  const delta = time - lastTime;
  lastTime = time;
  updatePlayer(delta);
  const pos = currentScene.camera.position;
  const degX = (lookX * 180 / Math.PI).toFixed(1);
  const degY = (lookY * 180 / Math.PI).toFixed(1);
  debugEl.textContent =
    `POS: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}
LOOK: Yaw=${degX}°, Pitch=${degY}°
MOBILE: ${isMobile ? 'Да' : 'Нет'} | FPS: ${Math.round(1000/delta)}`;
  currentScene.renderer.render(currentScene.scene, currentScene.camera);
  requestAnimationFrame(animate);
}

// Управление клавиатурой
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = ['w','a','s','d'].includes(e.key.toLowerCase()); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Основные кнопки
playBtn.onclick = () => {
  mainMenu.style.display = 'none';
  pauseBtn.style.display = 'block';
  shopBtn.style.display = 'block';
  isGameActive = true;
  initGame(null);
};

continueBtn.onclick = () => {
  const saved = localStorage.getItem('savedGameState');
  if (saved) {
    mainMenu.style.display = 'none';
    pauseBtn.style.display = 'block';
    shopBtn.style.display = 'block';
    isGameActive = true;
    initGame(JSON.parse(saved));
  }
};

exitBtn.onclick = () => { if (confirm('Выйти?')) location.reload(); };
pauseBtn.onclick = () => { isGameActive = false; pauseMenu.style.display = 'flex'; };
resumeBtn.onclick = () => { pauseMenu.style.display = 'none'; isGameActive = true; };

saveAndExitBtn.onclick = () => {
  if (gameInitialized && currentScene) {    const state = saveGameState(
      currentScene.scene,
      currentScene.camera,
      currentScene.objects.spotLight,
      currentScene.objects.bulb,
      currentScene.objects.wateringCan,
      currentScene.objects.originalCube,
      currentScene.objects.originalSeed,
      getState().clones
    );
    localStorage.setItem('savedGameState', JSON.stringify(state));
    continueBtn.style.display = 'block';
  }
  cleanup();
};

backToMenuBtn.onclick = () => {
  localStorage.removeItem('savedGameState');
  continueBtn.style.display = 'none';
  cleanup();
};

function cleanup() {
  pauseMenu.style.display = 'none';
  mainMenu.style.display = 'block';
  pauseBtn.style.display = 'none';
  shopBtn.style.display = 'none';
  isGameActive = false;
  document.querySelector('canvas')?.remove();
  gameInitialized = false;
  document.querySelectorAll('#cubeUI, #wateringCanUI, #seedUI, #colorPickerUI, #confirmBox, #shopMenu')
    .forEach(el => el.style.display = 'none');
}

// Проверка сохранения при старте
if (localStorage.getItem('savedGameState')) {
  continueBtn.style.display = 'block';
} else {
  continueBtn.style.display = 'none';
}

// Resize
window.addEventListener('resize', () => {
  if (currentScene) {
    currentScene.camera.aspect = window.innerWidth / window.innerHeight;
    currentScene.camera.updateProjectionMatrix();
    currentScene.renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
