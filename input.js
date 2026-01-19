import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getState, setHeldObject, getClones, toggleLamp } from './gameState.js';
import { showConfirm } from './ui.js';
import { DRYING_COLORS } from './constants.js';

export function setupInput(camera, scene, objects, onInteract) {
  const { wateringCan, switchPlate, colorTile, originalCube, originalSeed } = objects;
  const canvas = document.querySelector('canvas');
  let holdTimer = null;
  let lastHoldTarget = null;
  let holdStartPos = null;
  let isColorPickerOpen = false;

  const cancelHold = (e) => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    lastHoldTarget = null;
    holdStartPos = null;
  };

  const startHold = (target, action) => {
    if (holdTimer) clearTimeout(holdTimer);
    lastHoldTarget = target;
    holdTimer = setTimeout(() => {
      action();
      cancelHold();
    }, 200);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!document.getElementById('pauseMenu').style.display.includes('flex') &&
        !document.getElementById('shopMenu').style.display.includes('flex') &&
        !isColorPickerOpen) {
      holdStartPos = { x: e.clientX, y: e.clientY };
      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      raycaster.set(camera.position, direction);
      const maxDist = 5;
      const intersects = [];

      getClones().forEach(clone => {
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

      if (intersects.length === 0) return cancelHold(e);

      intersects.sort((a, b) => a.dist - b.dist);
      const closest = intersects[0].obj;

      if (lastHoldTarget !== closest) cancelHold(e);

      if (closest === colorTile) {
        isColorPickerOpen = true;
        onInteract('colorPicker');
      } else if (closest === switchPlate) {
        toggleLamp();
        onInteract('lamp');
      } else if (closest === wateringCan && getState().heldObject !== wateringCan && getState().heldObject === null) {
        startHold(closest, () => {
          setHeldObject(wateringCan);
          wateringCan.visible = false;
          onInteract('pickup', wateringCan);
        });
      } else if (getClones().has(closest) && getState().heldObject !== closest && getState().heldObject === null) {
        startHold(closest, () => {
          setHeldObject(closest);
          closest.visible = false;
          onInteract('pickup', closest);
        });
      }
    }
  });

  canvas.addEventListener('pointermove', cancelHold);
  canvas.addEventListener('pointerup', cancelHold);
  canvas.addEventListener('pointercancel', cancelHold);
}
