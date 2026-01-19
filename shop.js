import { getState, setCoins, getHeldObject, getClones, setHeldObject } from './gameState.js';
import { showConfirm } from './ui.js';
import { generateCloneId } from './utils.js';
import { DRYING_COLORS } from './constants.js';

const shopContent = document.getElementById('shopContent');

export function renderShopBuy(scene, camera, originalCube, originalSeed, onDropHeld, onAddClone) {
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
        if (getState().coins >= item.price) {
          onDropHeld(); // если что-то держим — выложить
          let clone;
          if (item.id === 'cube') {
            clone = originalCube.clone();
            clone.material = originalCube.material.clone();
            clone.userData = { ...originalCube.userData, isClone: true, cloneId: generateCloneId() };
          } else {
            clone = originalSeed.clone();
            clone.material = originalSeed.material.clone();
            clone.userData = { ...originalSeed.userData, isClone: true, cloneId: generateCloneId() };
          }
          const offset = new THREE.Vector3(0, -0.3, -1.2).applyQuaternion(camera.quaternion);
          clone.position.copy(camera.position).add(offset);
          clone.visible = true;
          scene.add(clone);
          onAddClone(clone);
          setHeldObject(clone);
          setCoins(getState().coins - item.price);
        } else {
          showConfirm('Недостаточно монет!', 'OK', '', () => {}, () => {});
        }
      }, () => {});
    };
    shopContent.appendChild(div);
  });
}

export function renderShopSell(onSell) {
  shopContent.innerHTML = '';
  const held = getHeldObject();
  if (!held || held === 'wateringCan' || !getClones().has(held)) {
    shopContent.innerHTML = '<div style="color:#aaa;">Нет предметов для продажи</div>';
    return;
  }
  const name = held.userData.type === 'cube' ? 'Куб' : 'Семечко';
  const div = document.createElement('div');
  div.className = 'shopItem';
  div.innerHTML = `<div class="itemIcon">${held.userData.type === 'cube' ? '🟧' : '⚫'}</div><div class="itemName">${name}<br/>10 монет</div>`;
  div.onclick = () => {
    showConfirm(`Продать ${name} за 10 монет?`, 'Да', 'Нет', () => {
      onSell(held);
      setCoins(getState().coins + 10);
    }, () => {});
  };
  shopContent.appendChild(div);
}
