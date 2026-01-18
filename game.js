import { updateCoinDisplay, renderShopBuy, renderShopSell, showConfirm, buildColorPickerUI } from './ui.js';
import { saveGameState, loadGameState } from './save.js';

const DRYING_COLORS = [0x8B4513, 0xA16B3F, 0xB8855A, 0xff9800];
const WORLD_SIZE_X = 50;
const WORLD_SIZE_Y = 25;
const WORLD_SIZE_Z = 50;
const PLAYER_HEIGHT = 3.2;
const START_POS = { x: -20, y: PLAYER_HEIGHT, z: 20 };
const BASE_MOVE_SPEED = 0.008;
const LOOK_SENSITIVITY = 0.002;
const WALL_MARGIN = 0.5;
const HOLD_THRESHOLD_MS = 200;

let scene, camera, renderer, spotLight, bulb, wateringCan, originalCube, originalSeed;
let clones = new Set();
let heldObject = null;
let playerCoins = 100;
let isLampOn = true;
let lookX = 0, lookY = 0;
let joyDir = { x: 0, y: 0 };
let keys = { w: false, a: false, s: false, d: false };
let mouseDown = false;
let isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
let lastTime = 0;
let isConfirming = false;
let holdTimer = null;
let lastHoldTarget = null;
let holdStartPos = null;
let isColorPickerOpen = false;

export function initGame(loadState = null) {
  // Очистка при повторном вызове
  if (renderer) renderer.domElement.remove();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
  if (loadState) {
    camera.position.copy(loadState.cameraPosition);
    camera.rotation.set(loadState.cameraRotation.x, loadState.cameraRotation.y, loadState.cameraRotation.z);
    lookX = loadState.cameraRotation.y;
    lookY = loadState.cameraRotation.x;
  } else {
    camera.position.set(START_POS.x, START_POS.y, START_POS.z);
    lookX = 0;
    lookY = 0;
  }
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.touchAction = 'none';
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambientLight);

  spotLight = new THREE.SpotLight(0xfff0b3, loadState && !loadState.isLampOn ? 0 : 9.5);
  spotLight.position.set(0, WORLD_SIZE_Y, 0);
  spotLight.angle = Math.atan(28.6 / WORLD_SIZE_Y);
  spotLight.penumbra = 0.3;
  spotLight.decay = 1;
  spotLight.distance = 60;
  if (loadState) spotLight.color.setHex(loadState.spotLightColor);
  scene.add(spotLight);

  isLampOn = loadState ? loadState.isLampOn : true;

  // === Текстуры и окружение ===
  function createConcreteTexture(size = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#C8C8C8';
    ctx.fillRect(0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    for (let i = 0; i < data.length; i += 4) {
      let noise = (Math.random() - 0.5) * 15;
      if (Math.random() > 0.8) noise *= 2;
      data[i] = data[i+1] = data[i+2] = Math.min(255, Math.max(0, 0xC8 + noise));
      data[i+3] = 255;
    }
    ctx.putImageData(new ImageData(data, size, size), 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
  }

  const concreteTexture = createConcreteTexture();
  const wallColor = 0xC8C8C8;
  const ceilingColor = 0xF5F0E6;
  const floorDark = 0x5D4037;
  const floorLight = 0x8D6E63;

  const walls = [
    { pos: [0, WORLD_SIZE_Y/2, -WORLD_SIZE_Z/2], size: [WORLD_SIZE_X, WORLD_SIZE_Y, 1], color: wallColor },
    { pos: [0, WORLD_SIZE_Y/2,  WORLD_SIZE_Z/2], size: [WORLD_SIZE_X, WORLD_SIZE_Y, 1], color: wallColor },
    { pos: [-WORLD_SIZE_X/2, WORLD_SIZE_Y/2, 0], size: [1, WORLD_SIZE_Y, WORLD_SIZE_Z], color: wallColor },    { pos: [ WORLD_SIZE_X/2, WORLD_SIZE_Y/2, 0], size: [1, WORLD_SIZE_Y, WORLD_SIZE_Z], color: wallColor },
    { pos: [0, 0, 0], size: [WORLD_SIZE_X, 1, WORLD_SIZE_Z], color: wallColor },
    { pos: [0, WORLD_SIZE_Y, 0], size: [WORLD_SIZE_X, 1, WORLD_SIZE_Z], color: ceilingColor }
  ];

  walls.forEach((w, idx) => {
    const geo = new THREE.BoxGeometry(...w.size);
    const mat = idx < 4
      ? new THREE.MeshStandardMaterial({ color: wallColor, map: concreteTexture, roughness: 0.95, metalness: 0, side: THREE.BackSide })
      : new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.9, metalness: 0, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...w.pos);
    scene.add(mesh);
  });

  const tileSize = 1;
  for (let x = 0; x < WORLD_SIZE_X; x++) {
    for (let z = 0; z < WORLD_SIZE_Z; z++) {
      const tileMat = new THREE.MeshStandardMaterial({
        color: ((x + z) % 2 === 0 ? floorDark : floorLight),
        roughness: 0.95,
        metalness: 0
      });
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(-WORLD_SIZE_X/2 + x + 0.5, 0.01, -WORLD_SIZE_Z/2 + z + 0.5);
      scene.add(tile);
    }
  }

  bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
  bulb.position.set(0, WORLD_SIZE_Y, 0);
  if (loadState) bulb.material.color.setHex(loadState.bulbColor);
  scene.add(bulb);

  wateringCan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x2196F3 }));
  if (loadState) {
    wateringCan.position.copy(loadState.wateringCan.position);
    wateringCan.visible = loadState.wateringCan.visible;
  } else {
    wateringCan.position.set(5, 0.5, 0);
  }
  scene.add(wateringCan);

  originalCube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
  originalCube.position.set(1000, 0, 0);
  originalCube.visible = false;
  originalCube.userData = { type: 'cube', wet: false, dryStage: 3 };
  scene.add(originalCube);
  originalSeed = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
  originalSeed.position.set(1000, 0, 0);
  originalSeed.visible = false;
  originalSeed.userData = { type: 'seed' };
  scene.add(originalSeed);

  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x333300, side: THREE.DoubleSide });
  const switchPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), plateMat);
  switchPlate.position.set(0, PLAYER_HEIGHT, -WORLD_SIZE_Z/2 + 0.51);
  switchPlate.rotation.y = Math.PI;
  scene.add(switchPlate);

  const colorTile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), plateMat);
  colorTile.position.set(0, PLAYER_HEIGHT, WORLD_SIZE_Z/2 - 0.51);
  scene.add(colorTile);

  const colorOptions = [
    { hex: 0xffffff, light: 0xffffff },
    { hex: 0xffffb3, light: 0xfff0b3 },
    { hex: 0xffb3ff, light: 0xff66ff },
    { hex: 0xb3ffb3, light: 0x66ff66 }
  ];

  playerCoins = loadState ? loadState.coins : 100;
  updateCoinDisplay();

  clones.clear();
  heldObject = null;

  if (loadState) {
    heldObject = loadGameState(loadState, scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed, clones);
    document.getElementById('cubeUI').style.display = loadState.cubeUIVisible ? 'block' : 'none';
    document.getElementById('wateringCanUI').style.display = loadState.wateringCanUIVisible ? 'block' : 'none';
    document.getElementById('seedUI').style.display = loadState.seedUIVisible ? 'block' : 'none';
  }

  // === Восстановление таймеров высыхания ===
  clones.forEach(clone => {
    if (clone.userData.type === 'cube' && clone.userData.wet && clone.userData.dryStage < 3) {
      const stage = clone.userData.dryStage;
      clone.userData.dryTimer = setTimeout(() => {
        let currentStage = stage + 1;
        const advance = () => {
          if (currentStage >= DRYING_COLORS.length) {
            clone.userData.wet = false;
            clone.userData.dryStage = 3;
            return;
          }
          clone.userData.dryStage = currentStage;
          clone.material.color.set(DRYING_COLORS[currentStage]);          if (currentStage < DRYING_COLORS.length - 1) {
            clone.userData.dryTimer = setTimeout(() => {
              currentStage++;
              advance();
            }, 10000);
          } else {
            clone.userData.wet = false;
          }
        };
        advance();
      }, 100);
    }
  });

  // === UI-интерфейсы предметов ===
  setupHoldOnUI(document.getElementById('cubeUI'), null, () => {
    if (!heldObject || !clones.has(heldObject) || heldObject.userData.type !== 'cube') return;
    showConfirm('Выложить куб?', 'Да', 'Нет', () => {
      dropHeldObject(heldObject, 1.5 / 2);
      heldObject = null;
      document.getElementById('cubeUI').style.display = 'none';
    }, () => {});
  });

  setupHoldOnUI(document.getElementById('wateringCanUI'), wateringCan, (obj) => {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    raycaster.set(camera.position, direction);
    const intersectsCube = [];
    clones.forEach(clone => {
      if (clone.userData.type === 'cube' && clone.visible) {
        const ic = raycaster.intersectObject(clone);
        if (ic.length && ic[0].distance <= 5) {
          intersectsCube.push({ obj: clone, dist: ic[0].distance });
        }
      }
    });
    const canSeeCube = intersectsCube.length > 0;
    if (canSeeCube) {
      const closestCube = intersectsCube.sort((a, b) => a.dist - b.dist)[0].obj;
      showConfirm('Полить куб или выложить лейку?', 'Полить', 'Выложить', () => {
        closestCube.userData.wet = true;
        closestCube.userData.dryStage = 0;
        closestCube.material.color.set(DRYING_COLORS[0]);
        if (closestCube.userData.dryTimer) clearTimeout(closestCube.userData.dryTimer);
        closestCube.userData.dryTimer = setTimeout(() => {
          let stage = 1;
          const advance = () => {
            if (stage >= DRYING_COLORS.length) {              closestCube.userData.wet = false;
              closestCube.userData.dryStage = 3;
              return;
            }
            closestCube.userData.dryStage = stage;
            closestCube.material.color.set(DRYING_COLORS[stage]);
            if (stage < DRYING_COLORS.length - 1) {
              closestCube.userData.dryTimer = setTimeout(() => {
                stage++;
                advance();
              }, 10000);
            } else {
              closestCube.userData.wet = false;
            }
          };
          advance();
        }, 10000);
      }, () => {
        dropHeldObject(obj, 0.5);
        wateringCanUI.style.display = 'none';
      });
    } else {
      showConfirm('Выложить лейку?', 'Да', 'Нет', () => {
        dropHeldObject(obj, 0.5);
        wateringCanUI.style.display = 'none';
      }, () => {});
    }
  });

  setupHoldOnUI(document.getElementById('seedUI'), null, () => {
    if (!heldObject || !clones.has(heldObject) || heldObject.userData.type !== 'seed') return;
    showConfirm('Выложить семечко?', 'Да', 'Нет', () => {
      dropHeldObject(heldObject, 0.5);
      heldObject = null;
      document.getElementById('seedUI').style.display = 'none';
    }, () => {});
  });

  function dropHeldObject(obj, y) {
    const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
    let dropPos = camera.position.clone().add(offset);
    dropPos.y = y;
    dropPos.x = Math.round(dropPos.x);
    dropPos.z = Math.round(dropPos.z);
    const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
    const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
    dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
    dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
    obj.position.copy(dropPos);
    obj.visible = true;  }

  // === Raycast interaction ===
  function handleRaycastInteraction(e) {
    if (!document.querySelector('#pauseMenu').style.display.includes('flex') && !isConfirming && !isColorPickerOpen) {
      holdStartPos = { x: e.clientX, y: e.clientY };
      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      raycaster.set(camera.position, direction);
      const maxDist = 5;
      const intersects = [];

      clones.forEach(clone => {
        if (clone.visible) {
          const ic = raycaster.intersectObject(clone);
          if (ic.length && ic[0].distance <= maxDist) {
            intersects.push({ obj: clone, dist: ic[0].distance });
          }
        }
      });

      const wc = raycaster.intersectObject(wateringCan);
      const sp = raycaster.intersectObject(switchPlate);
      const ct = raycaster.intersectObject(colorTile);
      if (wc.length && wc[0].distance <= maxDist) intersects.push({ obj: wateringCan, dist: wc[0].distance });
      if (sp.length && sp[0].distance <= maxDist) intersects.push({ obj: switchPlate, dist: sp[0].distance });
      if (ct.length && ct[0].distance <= maxDist) intersects.push({ obj: colorTile, dist: ct[0].distance });

      if (intersects.length === 0) {
        cancelHold(e);
        return;
      }

      intersects.sort((a, b) => a.dist - b.dist);
      const closest = intersects[0].obj;
      if (lastHoldTarget !== closest) cancelHold(e);

      if (closest === colorTile) {
        buildColorPickerUI(colorOptions, spotLight, bulb);
      } else if (closest === switchPlate) {
        isLampOn = !isLampOn;
        spotLight.intensity = isLampOn ? 9.5 : 0;
      } else if (closest === wateringCan && heldObject !== wateringCan && heldObject === null) {
        startHold(closest, () => {
          heldObject = wateringCan;
          document.getElementById('wateringCanUI').style.display = 'block';
          wateringCan.visible = false;
        });
      } else if (clones.has(closest) && heldObject !== closest && heldObject === null) {
        startHold(closest, () => {          heldObject = closest;
          if (closest.userData.type === 'cube') document.getElementById('cubeUI').style.display = 'block';
          else if (closest.userData.type === 'seed') document.getElementById('seedUI').style.display = 'block';
          closest.visible = false;
        });
      } else {
        cancelHold(e);
      }
    }
  }

  function startHold(target, action) {
    if (holdTimer) clearTimeout(holdTimer);
    lastHoldTarget = target;
    holdTimer = setTimeout(() => {
      action();
      holdTimer = null;
      lastHoldTarget = null;
      holdStartPos = null;
    }, HOLD_THRESHOLD_MS);
  }

  function cancelHold(e) {
    if (holdTimer && e) {
      const dx = e.clientX - holdStartPos.x;
      const dy = e.clientY - holdStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 10) return;
    }
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    lastHoldTarget = null;
    holdStartPos = null;
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', handleRaycastInteraction);
  canvas.addEventListener('pointermove', cancelHold);
  canvas.addEventListener('pointerup', cancelHold);
  canvas.addEventListener('pointercancel', cancelHold);

  // === Управление ===
  window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = ['w','a','s','d'].includes(e.key.toLowerCase()); });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  const joyEl = document.getElementById('joystick');
  const stickEl = document.getElementById('stick');
  let joyTouchId = null;
  let swipeTouchId = null;
  let joyStart = { x: 0, y: 0 };  let touchStart = { x: 0, y: 0 };

  function getTouchById(touches, id) {
    for (let t of touches) if (t.identifier === id) return t;
    return null;
  }

  if (isMobile) joyEl.style.display = 'block';

  window.addEventListener('touchstart', e => {
    e.preventDefault();
    const joyRect = joyEl.getBoundingClientRect();
    for (let touch of e.changedTouches) {
      const x = touch.clientX, y = touch.clientY;
      if (x >= joyRect.left && x <= joyRect.right && y >= joyRect.top && y <= joyRect.bottom) {
        if (joyTouchId === null) {
          joyTouchId = touch.identifier;
          joyStart = { x, y };
          joyEl.style.borderColor = 'lime';
        }
      } else {
        if (swipeTouchId === null) {
          swipeTouchId = touch.identifier;
          touchStart = { x, y };
        }
      }
    }
  });

  window.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.touches;
    if (joyTouchId !== null) {
      const joyTouch = getTouchById(touches, joyTouchId);
      if (joyTouch) {
        const dx = joyTouch.clientX - joyStart.x;
        const dy = joyTouch.clientY - joyStart.y;
        const maxR = 40;
        const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxR);
        const angle = Math.atan2(dy, dx);
        joyDir.x = Math.cos(angle) * (dist / maxR);
        joyDir.y = Math.sin(angle) * (dist / maxR);
        stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }
    if (swipeTouchId !== null) {
      const swipeTouch = getTouchById(touches, swipeTouchId);
      if (swipeTouch) {
        const dx = swipeTouch.clientX - touchStart.x;
        const dy = swipeTouch.clientY - touchStart.y;        lookX -= dx * 0.005;
        lookY -= dy * 0.005;
        lookY = Math.max(-Math.PI/2, Math.min(Math.PI/2, lookY));
        touchStart.x = swipeTouch.clientX;
        touchStart.y = swipeTouch.clientY;
      }
    }
  });

  window.addEventListener('touchend', e => {
    for (let touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        joyTouchId = null; joyDir.x = joyDir.y = 0;
        stickEl.style.transform = 'translate(0,0)';
        joyEl.style.borderColor = 'white';
      }
      if (touch.identifier === swipeTouchId) swipeTouchId = null;
    }
  });

  window.addEventListener('touchcancel', () => {
    joyTouchId = null; swipeTouchId = null; joyDir.x = joyDir.y = 0;
    stickEl.style.transform = 'translate(0,0)';
    joyEl.style.borderColor = 'white';
  });

  canvas.addEventListener('mousedown', () => {
    if (!isMobile) { mouseDown = true; canvas.requestPointerLock(); }
  });

  document.addEventListener('mousemove', e => {
    if (mouseDown || document.pointerLockElement === canvas) {
      lookX -= e.movementX * LOOK_SENSITIVITY;
      lookY -= e.movementY * LOOK_SENSITIVITY;
      lookY = Math.max(-Math.PI/2, Math.min(Math.PI/2, lookY));
    }
  });

  document.addEventListener('mouseup', () => { mouseDown = false; });

  // === Анимация ===
  function animate(time) {
    if (!document.querySelector('#pauseMenu').style.display.includes('flex') &&
        !document.querySelector('#shopMenu').style.display.includes('flex')) {
      const delta = time - lastTime;
      lastTime = time;
      updatePlayer(delta);
      const pos = camera.position;
      const degX = (lookX * 180 / Math.PI).toFixed(1);
      const degY = (lookY * 180 / Math.PI).toFixed(1);      document.getElementById('debug').textContent =
        `POS: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}\n` +
        `LOOK: Yaw=${degX}°, Pitch=${degY}°\n` +
        `MOBILE: ${isMobile ? 'Да' : 'Нет'} | FPS: ${Math.round(1000/delta)}`;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  animate(0);
}

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
    camera.position.x += (dir.x * moveForward + right.x * moveRight) * speed;
    camera.position.z += (dir.z * moveForward + right.z * moveRight) * speed;
  }

  camera.position.y = PLAYER_HEIGHT;
  const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
  const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
  camera.position.x = Math.max(-halfX, Math.min(halfX, camera.position.x));
  camera.position.z = Math.max(-halfZ, Math.min(halfZ, camera.position.z));

  camera.rotation.order = 'YXZ';
  camera.rotation.y = lookX;
  camera.rotation.x = lookY;

  if (heldObject) {
    const offset = new THREE.Vector3(0, -0.3, -1.2).applyQuaternion(camera.quaternion);
    heldObject.position.copy(camera.position).add(offset);
    heldObject.quaternion.copy(camera.quaternion);    heldObject.rotateY(Math.PI);
  }

  clones.forEach(clone => {
    if (clone.visible && clone.userData.type === 'cube') clone.position.y = 1.5 / 2;
    else if (clone.visible && clone.userData.type === 'seed') clone.position.y = 0.5;
  });

  if (wateringCan.visible) wateringCan.position.y = 0.5;
}

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

export function destroyGame() {
  if (renderer) renderer.domElement.remove();
  scene = null; camera = null; renderer = null;
  clones.clear();
  heldObject = null;
}

export function getCurrentGameState() {
  return saveGameState(
    scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed,
    isLampOn, heldObject,
    document.getElementById('cubeUI').style.display === 'block',
    document.getElementById('wateringCanUI').style.display === 'block',
    document.getElementById('seedUI').style.display === 'block',
    playerCoins, clones
  );
}

export { playerCoins, clones, heldObject, wateringCan, originalCube, originalSeed, scene, camera, spotLight, bulb, isLampOn };
