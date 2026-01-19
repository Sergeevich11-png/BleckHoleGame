import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import {
  WORLD_SIZE, PLAYER_HEIGHT, COLORS, COLOR_OPTIONS, START_POS
} from './constants.js';

export function createScene(loadState = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
  if (loadState) {
    camera.position.copy(loadState.cameraPosition);
    camera.rotation.set(
      loadState.cameraRotation.x,
      loadState.cameraRotation.y,
      loadState.cameraRotation.z
    );
  } else {
    camera.position.set(START_POS.x, START_POS.y, START_POS.z);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.touchAction = 'none';
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(
    loadState?.spotLightColor || 0xfff0b3,
    (loadState && !loadState.isLampOn) ? 0 : 9.5
  );
  spotLight.position.set(0, WORLD_SIZE.Y, 0);
  spotLight.angle = Math.atan(28.6 / WORLD_SIZE.Y);
  spotLight.penumbra = 0.3;
  spotLight.decay = 1;
  spotLight.distance = 60;
  scene.add(spotLight);

  // --- текстура стен ---
  function createConcreteTexture(size = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#C8C8C8';
    ctx.fillRect(0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    for (let i = 0; i < data.length; i += 4) {
      let noise = (Math.random() - 0.5) * 15;      if (Math.random() > 0.8) noise *= 2;
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

  // --- стены, пол, потолок ---
  const walls = [
    { pos: [0, WORLD_SIZE.Y/2, -WORLD_SIZE.Z/2], size: [WORLD_SIZE.X, WORLD_SIZE.Y, 1], color: COLORS.wall },
    { pos: [0, WORLD_SIZE.Y/2,  WORLD_SIZE.Z/2], size: [WORLD_SIZE.X, WORLD_SIZE.Y, 1], color: COLORS.wall },
    { pos: [-WORLD_SIZE.X/2, WORLD_SIZE.Y/2, 0], size: [1, WORLD_SIZE.Y, WORLD_SIZE.Z], color: COLORS.wall },
    { pos: [ WORLD_SIZE.X/2, WORLD_SIZE.Y/2, 0], size: [1, WORLD_SIZE.Y, WORLD_SIZE.Z], color: COLORS.wall },
    { pos: [0, 0, 0], size: [WORLD_SIZE.X, 1, WORLD_SIZE.Z], color: COLORS.wall },
    { pos: [0, WORLD_SIZE.Y, 0], size: [WORLD_SIZE.X, 1, WORLD_SIZE.Z], color: COLORS.ceiling }
  ];

  walls.forEach((w, idx) => {
    const geo = new THREE.BoxGeometry(...w.size);
    const mat = idx < 4
      ? new THREE.MeshStandardMaterial({ color: COLORS.wall, map: concreteTexture, roughness: 0.95, metalness: 0, side: THREE.BackSide })
      : new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.9, metalness: 0, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...w.pos);
    scene.add(mesh);
  });

  // --- пол ---
  for (let x = 0; x < WORLD_SIZE.X; x++) {
    for (let z = 0; z < WORLD_SIZE.Z; z++) {
      const tileMat = new THREE.MeshStandardMaterial({
        color: ((x + z) % 2 === 0 ? COLORS.floorDark : COLORS.floorLight),
        roughness: 0.95,
        metalness: 0
      });
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(-WORLD_SIZE.X/2 + x + 0.5, 0.01, -WORLD_SIZE.Z/2 + z + 0.5);
      scene.add(tile);
    }
  }

  // --- объекты ---
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: loadState?.bulbColor || COLORS.bulb }));  bulb.position.set(0, WORLD_SIZE.Y, 0);
  scene.add(bulb);

  const wateringCan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), new THREE.MeshStandardMaterial({ color: COLORS.wateringCan }));
  if (loadState) {
    wateringCan.position.copy(loadState.wateringCan.position);
    wateringCan.visible = loadState.wateringCan.visible;
  } else {
    wateringCan.position.set(5, 0.5, 0);
  }
  scene.add(wateringCan);

  const originalCube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: COLORS.cube }));
  originalCube.position.set(1000, 0, 0);
  originalCube.visible = false;
  originalCube.userData = { type: 'cube', wet: false, dryStage: 3 };
  scene.add(originalCube);

  const originalSeed = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshStandardMaterial({ color: COLORS.seed }));
  originalSeed.position.set(1000, 0, 0);
  originalSeed.visible = false;
  originalSeed.userData = { type: 'seed' };
  scene.add(originalSeed);

  const plateMat = new THREE.MeshStandardMaterial({ color: COLORS.switchPlate, emissive: 0x333300, side: THREE.DoubleSide });
  const switchPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), plateMat);
  switchPlate.position.set(0, PLAYER_HEIGHT, -WORLD_SIZE.Z/2 + 0.51);
  switchPlate.rotation.y = Math.PI;
  scene.add(switchPlate);

  const colorTile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), plateMat);
  colorTile.position.set(0, PLAYER_HEIGHT, WORLD_SIZE.Z/2 - 0.51);
  scene.add(colorTile);

  return {
    scene,
    camera,
    renderer,
    objects: {
      spotLight,
      bulb,
      wateringCan,
      originalCube,
      originalSeed,
      switchPlate,
      colorTile
    }
  };
        }
