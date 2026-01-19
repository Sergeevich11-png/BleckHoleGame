import { renderShopBuy, renderShopSell } from './shop.js';
import { saveGameState, loadGameState } from './saveSystem.js';

const DRYING_COLORS = [0x8B4513, 0xA16B3F, 0xB8855A, 0xff9800];

export function initGame(loadState = null) {
  if (window.gameInitialized) return;

  const WORLD_SIZE_X = 50;
  const WORLD_SIZE_Y = 25;
  const WORLD_SIZE_Z = 50;
  const PLAYER_HEIGHT = 3.2;
  const START_POS = { x: -20, y: PLAYER_HEIGHT, z: 20 };
  const BASE_MOVE_SPEED = 0.008;
  const LOOK_SENSITIVITY = 0.002;
  const WALL_MARGIN = 0.5;
  const HOLD_THRESHOLD_MS = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
  if (loadState) {
    camera.position.copy(loadState.cameraPosition);
    camera.rotation.set(loadState.cameraRotation.x, loadState.cameraRotation.y, loadState.cameraRotation.z);
  } else {
    camera.position.set(START_POS.x, START_POS.y, START_POS.z);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.touchAction = 'none';
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xfff0b3, loadState && !loadState.isLampOn ? 0 : 9.5);
  spotLight.position.set(0, WORLD_SIZE_Y, 0);
  spotLight.angle = Math.atan(28.6 / WORLD_SIZE_Y);
  spotLight.penumbra = 0.3;
  spotLight.decay = 1;
  spotLight.distance = 60;
  if (loadState) {
    spotLight.color.setHex(loadState.spotLightColor);
  }
  scene.add(spotLight);

  let isLampOn = loadState ? loadState.isLampOn : true;
  const wallColor = 0xC8C8C8;
  const ceilingColor = 0xF5F0E6;
  const floorDark = 0x5D4037;
  const floorLight = 0x8D6E63;

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

  const walls = [
    { pos: [0, WORLD_SIZE_Y/2, -WORLD_SIZE_Z/2], size: [WORLD_SIZE_X, WORLD_SIZE_Y, 1], color: wallColor },
    { pos: [0, WORLD_SIZE_Y/2,  WORLD_SIZE_Z/2], size: [WORLD_SIZE_X, WORLD_SIZE_Y, 1], color: wallColor },
    { pos: [-WORLD_SIZE_X/2, WORLD_SIZE_Y/2, 0], size: [1, WORLD_SIZE_Y, WORLD_SIZE_Z], color: wallColor },
    { pos: [ WORLD_SIZE_X/2, WORLD_SIZE_Y/2, 0], size: [1, WORLD_SIZE_Y, WORLD_SIZE_Z], color: wallColor },
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
      const tileMat = new THREE.MeshStandardMaterial({        color: ((x + z) % 2 === 0 ? floorDark : floorLight),
        roughness: 0.95,
        metalness: 0
      });
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(-WORLD_SIZE_X/2 + x + 0.5, 0.01, -WORLD_SIZE_Z/2 + z + 0.5);
      scene.add(tile);
    }
  }

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
  bulb.position.set(0, WORLD_SIZE_Y, 0);
  if (loadState) bulb.material.color.setHex(loadState.bulbColor);
  scene.add(bulb);

  const wateringCan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x2196F3 }));
  if (loadState) {
    wateringCan.position.copy(loadState.wateringCan.position);
    wateringCan.visible = loadState.wateringCan.visible;
  } else {
    wateringCan.position.set(5, 0.5, 0);
  }
  scene.add(wateringCan);

  const originalCube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
  originalCube.position.set(1000, 0, 0);
  originalCube.visible = false;
  originalCube.userData = { type: 'cube', wet: false, dryStage: 3 };
  scene.add(originalCube);

  const originalSeed = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
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
    { hex: 0xffffb3, light: 0xfff0b3 },    { hex: 0xffb3ff, light: 0xff66ff },
    { hex: 0xb3ffb3, light: 0x66ff66 }
  ];

  let isColorPickerOpen = false;

  function buildColorPickerUI() {
    const colorPickerUI = document.getElementById('colorPickerUI');
    colorPickerUI.innerHTML = '<p>Выберите цвет</p>';
    colorOptions.forEach(opt => {
      const btn = document.createElement('div');
      btn.style.backgroundColor = '#' + opt.hex.toString(16).padStart(6, '0');
      btn.onclick = () => {
        spotLight.color.set(opt.light);
        bulb.material.color.set(opt.hex);
        colorPickerUI.style.display = 'none';
        isColorPickerOpen = false;
      };
      colorPickerUI.appendChild(btn);
    });
    colorPickerUI.style.display = 'block';
    isColorPickerOpen = true;
  }

  let playerCoins = loadState ? loadState.coins : 100;
  const coinCountEl = document.getElementById('coinCount');
  coinCountEl.textContent = playerCoins;

  const clones = new Set();
  let heldObject = null;

  if (loadState) {
    heldObject = loadGameState(loadState, scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed, clones);
    document.getElementById('cubeUI').style.display = loadState.cubeUIVisible ? 'block' : 'none';
    document.getElementById('wateringCanUI').style.display = loadState.wateringCanUIVisible ? 'block' : 'none';
    document.getElementById('seedUI').style.display = loadState.seedUIVisible ? 'block' : 'none';
  }

  function updateCoinDisplay() {
    coinCountEl.textContent = playerCoins;
  }

  function showConfirm(text, yesText, noText, onYes, onNo) {
    const confirmBox = document.getElementById('confirmBox');
    const confirmText = document.getElementById('confirmText');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    if (window.isConfirming) return;
    confirmText.textContent = text;    confirmYes.textContent = yesText;
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

  let isConfirming = false;
  window.isConfirming = isConfirming;

  let holdTimer = null;
  let lastHoldTarget = null;
  let holdStartPos = null;

  function setupHoldOnUI(element, targetObject, action) {
    let holdTimeout = null;
    const cancel = () => {
      if (holdTimeout) clearTimeout(holdTimeout);
      holdTimeout = null;
    };
    element.addEventListener('pointerdown', e => {
      e.stopPropagation();
      cancel();
      holdTimeout = setTimeout(() => {
        action(targetObject);
      }, HOLD_THRESHOLD_MS);
    });
    element.addEventListener('pointerup', cancel);
    element.addEventListener('pointerleave', cancel);
    element.addEventListener('pointercancel', cancel);
  }

  const cubeUI = document.getElementById('cubeUI');
  const wateringCanUI = document.getElementById('wateringCanUI');
  const seedUI = document.getElementById('seedUI');

  setupHoldOnUI(cubeUI, null, () => {
    if (!heldObject || !clones.has(heldObject) || heldObject.userData.type !== 'cube') return;
    showConfirm('Выложить куб?', 'Да', 'Нет', () => {
      const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
      let dropPos = camera.position.clone().add(offset);      dropPos.y = 1.5 / 2;
      dropPos.x = Math.round(dropPos.x);
      dropPos.z = Math.round(dropPos.z);
      const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
      const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
      dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
      dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
      heldObject.position.copy(dropPos);
      heldObject.visible = true;
      heldObject = null;
      cubeUI.style.display = 'none';
    }, () => {});
  });

  setupHoldOnUI(wateringCanUI, wateringCan, (obj) => {
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
            if (stage >= DRYING_COLORS.length) {
              closestCube.userData.wet = false;
              closestCube.userData.dryStage = 3;
              return;
            }
            closestCube.userData.dryStage = stage;
            closestCube.material.color.set(DRYING_COLORS[stage]);
            if (stage < DRYING_COLORS.length - 1) {
              closestCube.userData.dryTimer = setTimeout(() => {
                stage++;
                advance();              }, 10000);
            } else {
              closestCube.userData.wet = false;
            }
          };
          advance();
        }, 10000);
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      }, () => {
        const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
        let dropPos = camera.position.clone().add(offset);
        dropPos.y = 0.5;
        dropPos.x = Math.round(dropPos.x);
        dropPos.z = Math.round(dropPos.z);
        const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
        const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
        dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
        dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
        obj.position.copy(dropPos);
        obj.visible = true;
        if (heldObject === obj) heldObject = null;
        wateringCanUI.style.display = 'none';
        confirmBox.style.display = 'none';
        window.isConfirming = false;
      });
    } else {
      showConfirm('Выложить лейку?', 'Да', 'Нет', () => {
        const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
        let dropPos = camera.position.clone().add(offset);
        dropPos.y = 0.5;
        dropPos.x = Math.round(dropPos.x);
        dropPos.z = Math.round(dropPos.z);
        const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
        const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
        dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
        dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
        obj.position.copy(dropPos);
        obj.visible = true;
        if (heldObject === obj) heldObject = null;
        wateringCanUI.style.display = 'none';
      }, () => {});
    }
  });

  setupHoldOnUI(seedUI, null, () => {
    if (!heldObject || !clones.has(heldObject) || heldObject.userData.type !== 'seed') return;
    showConfirm('Выложить семечко?', 'Да', 'Нет', () => {
      const offset = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion);
      let dropPos = camera.position.clone().add(offset);      dropPos.y = 0.5;
      dropPos.x = Math.round(dropPos.x);
      dropPos.z = Math.round(dropPos.z);
      const halfX = WORLD_SIZE_X / 2 - WALL_MARGIN;
      const halfZ = WORLD_SIZE_Z / 2 - WALL_MARGIN;
      dropPos.x = Math.max(-halfX, Math.min(halfX, dropPos.x));
      dropPos.z = Math.max(-halfZ, Math.min(halfZ, dropPos.z));
      heldObject.position.copy(dropPos);
      heldObject.visible = true;
      heldObject = null;
      seedUI.style.display = 'none';
    }, () => {});
  });

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
      if (distance <= 10) {
        return;
      }
    }
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    lastHoldTarget = null;
    holdStartPos = null;
  }

  function handleRaycastInteraction(e) {
    if (!window.isGameActive || window.isConfirming || isColorPickerOpen) return;
    holdStartPos = { x: e.clientX, y: e.clientY };
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);
    const maxDist = 5;
    const intersects = [];
    clones.forEach(clone => {
      if (clone.visible) {        const ic = raycaster.intersectObject(clone);
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
    if (lastHoldTarget !== closest) {
      cancelHold(e);
    }
    if (closest === colorTile) {
      buildColorPickerUI();
    } else if (closest === switchPlate) {
      isLampOn = !isLampOn;
      spotLight.intensity = isLampOn ? 9.5 : 0;
    } else if (closest === wateringCan && heldObject !== wateringCan && heldObject === null) {
      startHold(closest, () => {
        heldObject = wateringCan;
        wateringCanUI.style.display = 'block';
        wateringCan.visible = false;
      });
    } else if (clones.has(closest) && heldObject !== closest && heldObject === null) {
      startHold(closest, () => {
        heldObject = closest;
        if (closest.userData.type === 'cube') {
          cubeUI.style.display = 'block';
        } else if (closest.userData.type === 'seed') {
          seedUI.style.display = 'block';
        }
        closest.visible = false;
      });
    } else {
      cancelHold(e);
    }
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', handleRaycastInteraction);
  canvas.addEventListener('pointermove', cancelHold);  canvas.addEventListener('pointerup', cancelHold);
  canvas.addEventListener('pointercancel', cancelHold);

  const keys = { w: false, a: false, s: false, d: false };
  let joyDir = { x: 0, y: 0 };
  let lookX = camera.rotation.y;
  let lookY = camera.rotation.x;
  let isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) document.getElementById('joystick').style.display = 'block';

  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = ['w','a','s','d'].includes(e.key.toLowerCase());
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  const joyEl = document.getElementById('joystick');
  const stickEl = document.getElementById('stick');
  let joyTouchId = null;
  let swipeTouchId = null;
  let joyStart = { x: 0, y: 0 };
  let touchStart = { x: 0, y: 0 };

  function getTouchById(touches, id) {
    for (let t of touches) if (t.identifier === id) return t;
    return null;
  }

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

  window.addEventListener('touchmove', e => {    e.preventDefault();
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
        const dy = swipeTouch.clientY - touchStart.y;
        lookX -= dx * 0.005;
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

  let mouseDown = false;
  renderer.domElement.addEventListener('mousedown', () => {
    if (!isMobile) {
      mouseDown = true;      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', e => {
    if (mouseDown || document.pointerLockElement === renderer.domElement) {
      lookX -= e.movementX * LOOK_SENSITIVITY;
      lookY -= e.movementY * LOOK_SENSITIVITY;
      lookY = Math.max(-Math.PI/2, Math.min(Math.PI/2, lookY));
    }
  });

  document.addEventListener('mouseup', () => {
    mouseDown = false;
  });

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
      heldObject.quaternion.copy(camera.quaternion);      heldObject.rotateY(Math.PI);
    }
    clones.forEach(clone => {
      if (clone.visible && clone.userData.type === 'cube') {
        clone.position.y = 1.5 / 2;
      } else if (clone.visible && clone.userData.type === 'seed') {
        clone.position.y = 0.5;
      }
    });
    if (wateringCan.visible) wateringCan.position.y = 0.5;
  }

  // Подключаем функции магазина
  document.getElementById('shopBuyBtn').onclick = renderShopBuy;
  document.getElementById('shopSellBtn').onclick = renderShopSell;
  document.getElementById('shopCloseBtn').onclick = () => {
    document.getElementById('shopMenu').style.display = 'none';
    window.setIsGameActive(true);
  };
  document.getElementById('shopBtn').onclick = () => {
    window.setIsGameActive(false);
    document.getElementById('shopMenu').style.display = 'flex';
    renderShopBuy();
  };

  const debugEl = document.getElementById('debug');
  let lastTime = 0;

  function animate(time) {
    if (!window.isGameActive) return requestAnimationFrame(animate);
    const delta = time - lastTime;
    lastTime = time;
    updatePlayer(delta);
    const pos = camera.position;
    const degX = (lookX * 180 / Math.PI).toFixed(1);
    const degY = (lookY * 180 / Math.PI).toFixed(1);
    debugEl.textContent =
      `POS: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}\n` +
      `LOOK: Yaw=${degX}°, Pitch=${degY}°\n` +
      `MOBILE: ${isMobile ? 'Да' : 'Нет'} | FPS: ${Math.round(1000/delta)}`;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  animate(0);

  window.setGameInitialized(true);
  window.setCurrentGameState(() => saveGameState(
    scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed,
    isLampOn, heldObject, cubeUI.style.display === 'block', wateringCanUI.style.display === 'block', seedUI.style.display === 'block',
    playerCoins, clones
  ));
    }
