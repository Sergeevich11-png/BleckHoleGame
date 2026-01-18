import { playerCoins, clones, heldObject, wateringCan, scene, getCurrentGameState } from './game.js';
import { saveGameState } from './save.js';

let isConfirming = false;

export function showConfirm(text, yesText, noText, onYes, onNo) {
  if (isConfirming) return;
  const confirmText = document.getElementById('confirmText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');
  const confirmBox = document.getElementById('confirmBox');

  confirmText.textContent = text;
  confirmYes.textContent = yesText;
  confirmNo.textContent = noText;
  confirmYes.onclick = () => { onYes(); confirmBox.style.display = 'none'; isConfirming = false; };
  confirmNo.onclick = () => { onNo(); confirmBox.style.display = 'none'; isConfirming = false; };
  confirmBox.style.display = 'block';
  isConfirming = true;
}

export function updateCoinDisplay() {
  document.getElementById('coinCount').textContent = playerCoins;
}

export function renderShopBuy() {
  const shopContent = document.getElementById('shopContent');
  shopContent.innerHTML = '';
  const items = [
    { id: 'cube', name: 'Куб', icon: '🟧', price: 10 },
    { id: 'seed', name: 'Семечко', icon: '⚫', price: 10 }
  ];
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'shopItem';
    div.innerHTML = `<div class="itemIcon">${item.icon}</div><div class="itemName">${item.name}<br/>${item.price} монет</div>`;
    div.onclick = () => {
      showConfirm(`Купить ${item.name} за ${item.price} монет?`, 'Да', 'Нет', () => {
        if (playerCoins >= item.price) {
          // Выложить текущий предмет
          if (heldObject) {
            const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(scene.camera.quaternion);
            let dropPos = scene.camera.position.clone().add(offset);
            dropPos.y = heldObject.userData?.type === 'cube' ? 1.5/2 : 0.5;
            dropPos.x = Math.round(dropPos.x);
            dropPos.z = Math.round(dropPos.z);
            const halfX = 50 / 2 - 0.5;
            const halfZ = 50 / 2 - 0.5;
            dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
            dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));            heldObject.position.copy(dropPos);
            heldObject.visible = true;
            if (heldObject.userData?.type === 'cube') document.getElementById('cubeUI').style.display = 'none';
            else if (heldObject.userData?.type === 'seed') document.getElementById('seedUI').style.display = 'none';
            heldObject = null;
          }

          let clone;
          if (item.id === 'cube') {
            clone = scene.originalCube.clone();
            clone.material = scene.originalCube.material.clone();
            clone.userData = { ...scene.originalCube.userData, isClone: true, cloneId: generateCloneId() };
          } else if (item.id === 'seed') {
            clone = scene.originalSeed.clone();
            clone.material = scene.originalSeed.material.clone();
            clone.userData = { ...scene.originalSeed.userData, isClone: true, cloneId: generateCloneId() };
          }

          const offset = new THREE.Vector3(0, -0.3, -1.2).applyQuaternion(scene.camera.quaternion);
          clone.position.copy(scene.camera.position).add(offset);
          clone.visible = true;
          scene.scene.add(clone);
          clones.add(clone);
          heldObject = clone;
          if (item.id === 'cube') document.getElementById('cubeUI').style.display = 'block';
          else if (item.id === 'seed') document.getElementById('seedUI').style.display = 'block';

          playerCoins -= item.price;
          updateCoinDisplay();
        } else {
          showConfirm('Недостаточно монет!', 'OK', '', () => {}, () => {});
        }
      }, () => {});
    };
    shopContent.appendChild(div);
  });
}

export function renderShopSell() {
  const shopContent = document.getElementById('shopContent');
  shopContent.innerHTML = '';
  if (!heldObject) {
    shopContent.innerHTML = '<div style="color:#aaa;">Нет предметов для продажи</div>';
    return;
  }
  if (heldObject === wateringCan) {
    shopContent.innerHTML = '<div style="color:#aaa;">Лейку нельзя продать</div>';
    return;
  }
  if (!clones.has(heldObject)) {    shopContent.innerHTML = '<div style="color:#aaa;">Нельзя продать этот предмет</div>';
    return;
  }
  const name = heldObject.userData.type === 'cube' ? 'Куб' : 'Семечко';
  const div = document.createElement('div');
  div.className = 'shopItem';
  div.innerHTML = `<div class="itemIcon">${heldObject.userData.type === 'cube' ? '🟧' : '⚫'}</div><div class="itemName">${name}<br/>10 монет</div>`;
  div.onclick = () => {
    showConfirm(`Продать ${name} за 10 монет?`, 'Да', 'Нет', () => {
      scene.scene.remove(heldObject);
      clones.delete(heldObject);
      heldObject = null;
      if (name === 'Куб') document.getElementById('cubeUI').style.display = 'none';
      else if (name === 'Семечко') document.getElementById('seedUI').style.display = 'none';
      playerCoins += 10;
      updateCoinDisplay();
    }, () => {});
  };
  shopContent.appendChild(div);
}

export function buildColorPickerUI(colorOptions, spotLight, bulb) {
  const colorPickerUI = document.getElementById('colorPickerUI');
  colorPickerUI.innerHTML = '<p>Выберите цвет</p>';
  colorOptions.forEach(opt => {
    const btn = document.createElement('div');
    btn.style.backgroundColor = '#' + opt.hex.toString(16).padStart(6, '0');
    btn.onclick = () => {
      spotLight.color.set(opt.light);
      bulb.material.color.set(opt.hex);
      colorPickerUI.style.display = 'none';
    };
    colorPickerUI.appendChild(btn);
  });
  colorPickerUI.style.display = 'block';
}

export function setupMainMenu() {
  document.getElementById('exitBtn').addEventListener('click', () => {
    if (confirm('Выйти?')) location.reload();
  });
}

export function setupPauseMenu(onBackToMenu) {
  document.getElementById('resumeBtn').addEventListener('click', () => {
    document.getElementById('pauseMenu').style.display = 'none';
  });

  document.getElementById('saveAndExitBtn').addEventListener('click', () => {
    const state = getCurrentGameState();    localStorage.setItem('savedGameState', JSON.stringify(state));
    document.getElementById('continueBtn').style.display = 'block';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('shopBtn').style.display = 'none';
    onBackToMenu();
  });

  document.getElementById('backToMenuBtn').addEventListener('click', () => {
    localStorage.removeItem('savedGameState');
    document.getElementById('continueBtn').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('shopBtn').style.display = 'none';
    onBackToMenu();
  });
}

export function setupShopButtons() {
  document.getElementById('shopBuyBtn').addEventListener('click', renderShopBuy);
  document.getElementById('shopSellBtn').addEventListener('click', renderShopSell);
  document.getElementById('shopCloseBtn').addEventListener('click', () => {
    document.getElementById('shopMenu').style.display = 'none';
  });
  document.getElementById('shopBtn').addEventListener('click', () => {
    document.getElementById('shopMenu').style.display = 'flex';
    renderShopBuy();
  });
}

function generateCloneId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                                                            }
