import * as THREE from 'three';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { Player } from './player.js';
import { ObjectManager } from './objects.js';
import { EnemyManager } from './enemies.js';
import { Universe } from './universe.js';
import { GoalSystem } from './goals.js';
import { EffectsManager } from './effects.js';
import { CONFIG } from './config.js';

export class Game {
  constructor(uiManager, audioManager) {
    this.ui = uiManager;
    this.audio = audioManager;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 80000);
    this.renderer = null;
    this.player = null;
    this.universe = null;
    this.objectManager = null;
    this.enemyManager = null;
    this.goalSystem = new GoalSystem(audioManager);
    this.effects = null;
    this.absorbedObjects = [];
    this.enemiesDefeated = 0;
    this.worldHalf = CONFIG.INITIAL_WORLD_HALF;
    this.score = 0;
    this.growthCounter = 0;
    this.lastSpawn = 0;
    this.gameState = 'menu';
    this.touchState = { lookId: null, moveId: null };
  }

  initRenderer() {
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.remove();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  start() {
    this.cleanup();
    this.initRenderer();
    this.scene.add(this.camera);
    this.player = new Player(this.scene, CONFIG.START_RADIUS);
    this.universe = new Universe(this.scene, this.worldHalf);
    this.objectManager = new ObjectManager(this.scene, this.player.radius, CONFIG.MAX_OBJECTS);
    this.enemyManager = new EnemyManager(this.scene, this.player, this.objectManager);
    this.effects = new EffectsManager(this.scene);
    this.score = 0;
    this.growthCounter = 0;
    this.worldHalf = CONFIG.INITIAL_WORLD_HALF;
    this.absorbedObjects = [];
    this.enemiesDefeated = 0;
    this.gameState = 'playing';
    this.ui.hideMenu();
    this.ui.showUI();
    this.audio.playMusic();

    // Spawn initial objects
    this.objectManager.spawnObjectGroup(true, this.player.object.position);
    let count = 0;
    while (this.objectManager.objects.length < Math.min(200, CONFIG.MAX_OBJECTS) && count < 100) {
      this.objectManager.spawnObjectGroup(false, this.player.object.position);
      count++;
    }
    this.enemyManager.spawnEnemies(2 + Math.floor(Math.random() * 2), this.player.object.position, this.player.radius);

    this.bindControls();
    this.animate();
  }

  bindControls() {
    const canvas = this.renderer.domElement;
    const onTouchStart = (e) => {
      if (this.gameState !== 'playing') return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.clientY < window.innerHeight / 2) {
          if (this.touchState.lookId === null) {
            this.touchState.lookId = touch.identifier;
            this.showJoystick(touch.clientX, touch.clientY, 'look');
          }
        } else {
          if (this.touchState.moveId === null) {
            this.touchState.moveId = touch.identifier;
            this.showJoystick(touch.clientX, touch.clientY, 'move');
          }
        }
      }
      e.preventDefault();
    };

    const onTouchMove = (e) => {
      if (this.gameState !== 'playing') return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.touchState.lookId) {
          const el = document.getElementById('lookJoystick');
          if (el) {
            const rect = el.getBoundingClientRect();
            this.updateJoystick(touch.clientX, touch.clientY, rect.left + 42, rect.top + 42, 'look');
          }
        } else if (touch.identifier === this.touchState.moveId) {
          const el = document.getElementById('joystick');
          if (el) {
            const rect = el.getBoundingClientRect();
            this.updateJoystick(touch.clientX, touch.clientY, rect.left + 42, rect.top + 42, 'move');
          }
        }
      }
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchState.lookId) {
          this.touchState.lookId = null;
          this.hideJoystick('look');
        } else if (touch.identifier === this.touchState.moveId) {
          this.touchState.moveId = null;
          this.hideJoystick('move');
        }
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
  }

  showJoystick(x, y, type) {
    const el = document.getElementById(type === 'move' ? 'joystick' : 'lookJoystick');
    if (el) {
      el.style.left = (x - 42) + 'px';
      el.style.top = (y - 42) + 'px';
      el.style.display = 'block';
    }
  }

  updateJoystick(x, y, baseX, baseY, type) {
    const dx = x - baseX;
    const dy = y - baseY;
    const maxDist = 42;
    const dist = Math.hypot(dx, dy);
    let ix = 0, iy = 0;
    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      ix = Math.cos(angle);
      iy = Math.sin(angle);
    } else {
      ix = dx / maxDist;
      iy = dy / maxDist;
    }
    const inner = document.getElementById(type === 'move' ? 'joystick-inner' : 'lookJoystick-inner');
    if (inner) {
      inner.style.left = (42 + ix * maxDist - 16) + 'px';
      inner.style.top = (42 + iy * maxDist - 16) + 'px';
    }
    if (type === 'move') {
      this.player.setMoveInput(ix, iy);
    } else {
      this.player.setLookInput(ix, iy);
    }
  }

  hideJoystick(type) {
    const el = document.getElementById(type === 'move' ? 'joystick' : 'lookJoystick');
    if (el) el.style.display = 'none';
    if (type === 'move') this.player.setMoveInput(0, 0);
    else this.player.setLookInput(0, 0);
  }

  updateCamera() {
    if (!this.camera || !this.player) return;
    const camDistance = 60 + this.player.radius * 8;
    const camX = this.player.object.position.x - Math.sin(this.player.yaw) * Math.cos(this.player.pitch) * camDistance;
    const camY = this.player.object.position.y + Math.sin(this.player.pitch) * camDistance;
    const camZ = this.player.object.position.z - Math.cos(this.player.yaw) * Math.cos(this.player.pitch) * camDistance;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.player.object.position);
  }

  checkCollisions() {
    const playerSuction = this.player.getSuctionRadius();
    const maxPull = this.player.getMaxPull();
    const dt = 1 / 60;

    // Apply suction to objects
    for (const obj of this.objectManager.objects) {
      if (!obj || !obj.userData || obj.userData.isBlackHole) continue;
      if (obj.userData.radius >= this.player.radius) continue;
      const d = Math.sqrt(this.dist3(this.player.object.position, obj.position));
      if (d < playerSuction && d > 0.1) {
        const pullStrength = (1 - d / playerSuction) * maxPull;
        const dir = new THREE.Vector3().subVectors(this.player.object.position, obj.position).normalize();
        obj.position.add(dir.multiplyScalar(pullStrength * dt));
      }
    }

    // Check absorption
    for (let i = this.objectManager.objects.length - 1; i >= 0; i--) {
      const obj = this.objectManager.objects[i];
      if (!obj || !obj.userData) continue;
      const d2 = this.dist3(this.player.object.position, obj.position);
      const radiusSum = this.player.radius + obj.userData.radius;
      if (d2 < radiusSum * radiusSum) {
        if (this.player.radius > obj.userData.radius) {
          // Absorb
          this.objectManager.scene.remove(obj);
          this.objectManager.objects.splice(i, 1);
          const idx = this.enemyManager.enemies.indexOf(obj);
          if (idx !== -1) {
            this.enemyManager.enemies.splice(idx, 1);
            this.enemiesDefeated++;
          }
          this.score += obj.userData.points || 0;
          this.player.grow(obj.userData.radius * 0.2);
          this.absorbedObjects.push(obj.userData);
          this.growthCounter++;
          if (this.growthCounter >= CONFIG.WORLD_GROWTH_EVERY) {
            this.worldHalf += CONFIG.WORLD_GROWTH_STEP;
            this.growthCounter = 0;
          }
          // Effects
          this.effects.spawnAbsorptionParticles(obj.position, new THREE.Color(obj.material.color));
          this.effects.screenShake(0.3);
          this.audio.play('absorb');
          if (obj.userData.radius > 5) this.audio.play('grow');
          // Spawn new group far away
          if (Math.random() < CONFIG.OBJECT_SPAWN_AFTER_ABSORB) {
            this.objectManager.spawnObjectGroup(false, this.player.object.position);
          }
        } else if (obj.userData.isBlackHole) {
          // Game over
          this.gameOver();
          return;
        }
      }
    }
  }

  dist3(a, b) {
    const ax = a.x ?? (a.position?.x ?? 0);
    const ay = a.y ?? (a.position?.y ?? 0);
    const az = a.z ?? (a.position?.z ?? 0);
    const bx = b.x ?? (b.position?.x ?? 0);
    const by = b.y ?? (b.position?.y ?? 0);
    const bz = b.z ?? (b.position?.z ?? 0);
    const dx = ax - bx, dy = ay - by, dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
  }

  animate = () => {
    if (this.gameState !== 'playing') return;
    const dt = 1 / 60;
    const time = performance.now() * 0.001;

    this.player.update(dt, time, this.worldHalf);
    this.objectManager.update(dt, this.player, this.camera, this.player.radius, this.worldHalf);
    this.enemyManager.update(dt, time);
    this.effects.update(dt);
    this.universe.update(time, this.player, this.camera);
    this.checkCollisions();
    this.enemyManager.maintainEnemyCount(2, 4);
    this.updateCamera();

    // Update UI
    this.ui.updateUI(this.score, this.player.radius, this.worldHalf * 2);
    this.ui.updateCoordinates(
      this.player.object.position.x,
      this.player.object.position.y,
      this.player.object.position.z
    );

    // Check goals
    const unlocked = this.goalSystem.checkProgress(this.score, this.player.radius, this.enemiesDefeated, this.absorbedObjects);
    if (unlocked.length > 0) {
      this.goalSystem.showNotification(unlocked);
    }

    // Spawn new objects
    const now = performance.now();
    if (this.objectManager.objects.length < CONFIG.MAX_OBJECTS && now - this.lastSpawn > CONFIG.SPAWN_INTERVAL) {
      if (Math.random() < 0.6) this.objectManager.spawnObjectGroup(false, this.player.object.position);
      this.lastSpawn = now;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };

  gameOver() {
    this.gameState = 'gameOver';
    this.ui.showGameOver(this.score);
    this.audio.play('gameover');
    this.audio.stopMusic();
    this.cleanupScene();
  }

  cleanupScene() {
    if (this.player) this.player.dispose();
    if (this.objectManager) this.objectManager.cleanup();
    if (this.universe) this.universe.dispose();
    if (this.effects) this.effects.dispose();
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
    this.scene = new THREE.Scene();
  }

  cleanup() {
    this.cleanupScene();
    this.player = null;
    this.universe = null;
    this.objectManager = null;
    this.enemyManager = null;
    this.effects = null;
    this.touchState = { lookId: null, moveId: null };
  }
                                       }
