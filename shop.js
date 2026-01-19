import { generateCloneId } from './saveSystem.js';

const DRYING_COLORS = [0x8B4513, 0xA16B3F, 0xB8855A, 0xff9800];
const WALL_MARGIN = 0.5;
const WORLD_SIZE_X = 50;
const WORLD_SIZE_Z = 50;

export function renderShopBuy() {
  const shopContent = document.getElementById('shopContent');
  const coinCountEl = document.getElementById('coinCount');
  const cubeUI = document.getElementById('cubeUI');
  const wateringCanUI = document.getElementById('wateringCanUI');
  const seedUI = document.getElementById('seedUI');
  const confirmBox = document.getElementById('confirmBox');
  const confirmText = document.getElementById('confirmText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  let playerCoins = parseInt(coinCountEl.textContent);
  let heldObject = window.heldObject;
  const clones = window.clones;
  const scene = window.scene;
  const camera = window.camera;
  const originalCube = window.originalCube;
  const originalSeed = window.originalSeed;

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
      function showConfirm(text, yesText, noText, onYes, onNo) {
        if (window.isConfirming) return;
        confirmText.textContent = text;
        confirmYes.textContent = yesText;
        confirmNo.textContent = noText;
        confirmYes.onclick = () => {
          onYes();
          confirmBox.style.display = 'none';
          window.isConfirming = false;
        };
        confirmNo.onclick = () => {
          onNo();
          confirmBox.style.display = 'none';          window.isConfirming = false;
        };
        confirmBox.style.display = 'block';
        window.isConfirming = true;
      }

      showConfirm(`Купить ${item.name} за ${item.price} монет?`, 'Да', 'Нет', () => {
        if (playerCoins >= item.price) {
          if (heldObject) {
            if (heldObject === window.wateringCan) {
              const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
              let dropPos = camera.position.clone().add(offset);
              dropPos.y = 0.5;
              dropPos.x = Math.round(dropPos.x);
              dropPos.z = Math.round(dropPos.z);
              const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
              const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
              dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
              dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
              heldObject.position.copy(dropPos);
              heldObject.visible = true;
              if (heldObject.userData.type === 'cube') cubeUI.style.display = 'none';
              else if (heldObject.userData.type === 'seed') seedUI.style.display = 'none';
            } else if (clones.has(heldObject)) {
              const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
              let dropPos = camera.position.clone().add(offset);
              dropPos.y = heldObject.userData.type === 'cube' ? 1.5/2 : 0.5;
              dropPos.x = Math.round(dropPos.x);
              dropPos.z = Math.round(dropPos.z);
              const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
              const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
              dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
              dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
              heldObject.position.copy(dropPos);
              heldObject.visible = true;
              if (heldObject.userData.type === 'cube') cubeUI.style.display = 'none';
              else if (heldObject.userData.type === 'seed') seedUI.style.display = 'none';
            }
            heldObject = null;
            window.heldObject = null;
          }

          let clone;
          if (item.id === 'cube') {
            clone = originalCube.clone();
            clone.material = originalCube.material.clone();
            clone.userData = { ...originalCube.userData, isClone: true, cloneId: generateCloneId() };
          } else if (item.id === 'seed') {
            clone = originalSeed.clone();
            clone.material = originalSeed.material.clone();            clone.userData = { ...originalSeed.userData, isClone: true, cloneId: generateCloneId() };
          }

          const offset = new THREE.Vector3(0, -0.3, -1.2).applyQuaternion(camera.quaternion);
          clone.position.copy(camera.position).add(offset);
          clone.visible = true;
          scene.add(clone);
          clones.add(clone);
          heldObject = clone;
          window.heldObject = clone;

          if (item.id === 'cube') {
            cubeUI.style.display = 'block';
          } else if (item.id === 'seed') {
            seedUI.style.display = 'block';
          }

          playerCoins -= item.price;
          coinCountEl.textContent = playerCoins;
          window.playerCoins = playerCoins;
        } else {
          showConfirm('Недостаточно монет!', 'OK', '', () => {}, () => {});
        }
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      }, () => {
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      });
    };
    shopContent.appendChild(div);
  });
}

export function renderShopSell() {
  const shopContent = document.getElementById('shopContent');
  const coinCountEl = document.getElementById('coinCount');
  const cubeUI = document.getElementById('cubeUI');
  const seedUI = document.getElementById('seedUI');
  const confirmBox = document.getElementById('confirmBox');
  const confirmText = document.getElementById('confirmText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  const heldObject = window.heldObject;
  const clones = window.clones;
  const scene = window.scene;

  shopContent.innerHTML = '';
  if (!heldObject) {    shopContent.innerHTML = '<div style="color:#aaa;">Нет предметов для продажи</div>';
    return;
  }
  if (heldObject === window.wateringCan) {
    shopContent.innerHTML = '<div style="color:#aaa;">Лейку нельзя продать</div>';
    return;
  }
  if (!clones.has(heldObject)) {
    shopContent.innerHTML = '<div style="color:#aaa;">Нельзя продать этот предмет</div>';
    return;
  }

  const name = heldObject.userData.type === 'cube' ? 'Куб' : 'Семечко';
  const div = document.createElement('div');
  div.className = 'shopItem';
  div.innerHTML = `<div class="itemIcon">${heldObject.userData.type === 'cube' ? '🟧' : '⚫'}</div><div class="itemName">${name}<br/>10 монет</div>`;
  div.onclick = () => {
    function showConfirm(text, yesText, noText, onYes, onNo) {
      if (window.isConfirming) return;
      confirmText.textContent = text;
      confirmYes.textContent = yesText;
      confirmNo.textContent = noText;
      confirmYes.onclick = () => {
        onYes();
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      };
      confirmNo.onclick = () => {
        onNo();
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      };
      confirmBox.style.display = 'block';
      window.isConfirming = true;
    }

    showConfirm(`Продать ${name} за 10 монет?`, 'Да', 'Нет', () => {
      scene.remove(heldObject);
      clones.delete(heldObject);
      window.heldObject = null;
      if (name === 'Куб') cubeUI.style.display = 'none';
      else if (name === 'Семечко') seedUI.style.display = 'none';
      let playerCoins = parseInt(coinCountEl.textContent) + 10;
      coinCountEl.textContent = playerCoins;
      window.playerCoins = playerCoins;
      confirmBox.style.display = 'none';
      window.isConfirming = false;
    }, () => {
      confirmBox.style.display = 'none';
      window.isConfirming = false;    });
  };
  shopContent.appendChild(div);
    }
