const DRYING_COLORS = [0x8B4513, 0xA16B3F, 0xB8855A, 0xff9800];

export function saveGameState(scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed, isLampOn, heldObject, cubeUIVisible, wateringCanUIVisible, seedUIVisible, playerCoins, clones) {
  const cloneData = [];
  clones.forEach(clone => {
    if (clone.userData.type === 'cube') {
      cloneData.push({
        type: 'cube',
        position: clone.position.clone(),
        wet: clone.userData.wet,
        dryStage: clone.userData.dryStage,
        color: clone.material.color.getHex(),
        cloneId: clone.userData.cloneId
      });
    } else if (clone.userData.type === 'seed') {
      cloneData.push({
        type: 'seed',
        position: clone.position.clone(),
        cloneId: clone.userData.cloneId
      });
    }
  });

  let heldObjectId = null;
  if (heldObject) {
    if (heldObject === wateringCan) {
      heldObjectId = 'wateringCan';
    } else if (clones.has(heldObject)) {
      heldObjectId = heldObject.userData.cloneId;
    }
  }

  return {
    cameraPosition: camera.position.clone(),
    cameraRotation: { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z },
    isLampOn,
    spotLightColor: spotLight.color.getHex(),
    bulbColor: bulb.material.color.getHex(),
    wateringCan: {
      position: wateringCan.position.clone(),
      visible: wateringCan.visible
    },
    clones: cloneData,
    heldObjectId,
    cubeUIVisible,
    wateringCanUIVisible,
    seedUIVisible,
    coins: playerCoins
  };
}
export function loadGameState(gameState, scene, camera, spotLight, bulb, wateringCan, originalCube, originalSeed, clones) {
  camera.position.copy(gameState.cameraPosition);
  camera.rotation.set(gameState.cameraRotation.x, gameState.cameraRotation.y, gameState.cameraRotation.z);
  spotLight.intensity = gameState.isLampOn ? 9.5 : 0;
  spotLight.color.setHex(gameState.spotLightColor);
  bulb.material.color.setHex(gameState.bulbColor);
  wateringCan.position.copy(gameState.wateringCan.position);
  wateringCan.visible = gameState.wateringCan.visible;

  let heldObject = null;

  gameState.clones.forEach(data => {
    let clone;
    if (data.type === 'cube') {
      clone = originalCube.clone();
      clone.material = originalCube.material.clone();
      clone.position.copy(data.position);
      clone.userData = {
        type: 'cube',
        wet: data.wet,
        dryStage: data.dryStage,
        cloneId: data.cloneId,
        isClone: true
      };
      clone.material.color.setHex(data.color);
      scene.add(clone);
      clones.add(clone);
    } else if (data.type === 'seed') {
      clone = originalSeed.clone();
      clone.material = originalSeed.material.clone();
      clone.position.copy(data.position);
      clone.userData = {
        type: 'seed',
        cloneId: data.cloneId,
        isClone: true
      };
      scene.add(clone);
      clones.add(clone);
    }
  });

  document.getElementById('cubeUI').style.display = gameState.cubeUIVisible ? 'block' : 'none';
  document.getElementById('wateringCanUI').style.display = gameState.wateringCanUIVisible ? 'block' : 'none';
  document.getElementById('seedUI').style.display = gameState.seedUIVisible ? 'block' : 'none';

  if (gameState.heldObjectId === 'wateringCan') {
    heldObject = wateringCan;
  } else if (gameState.heldObjectId) {
    clones.forEach(clone => {      if (clone.userData.cloneId === gameState.heldObjectId) {
        heldObject = clone;
      }
    });
  }

  return heldObject;
}

export function loadSavedState() {
  return localStorage.getItem('savedGameState') ? JSON.parse(localStorage.getItem('savedGameState')) : null;
}
