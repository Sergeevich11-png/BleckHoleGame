import * as THREE from 'three';
import { CONFIG } from './config.js';

export class EnemyManager {
  constructor(scene, player, objectManager) {
    this.scene = scene;
    this.player = player;
    this.objectManager = objectManager;
    this.enemies = [];
  }

  createEnemyAtPosition(pos, playerRadius) {
    const enemySize = playerRadius * CONFIG.ENEMY_SIZE_FACTOR;
    const obj = this.objectManager.createObjectAtPosition(pos, true, enemySize);
    obj.userData.isBlackHole = true;
    obj.userData.aiWanderTimer = Math.random() * 10;
    this.scene.add(obj);
    this.objectManager.objects.push(obj);
    this.enemies.push(obj);
    return obj;
  }

  isPositionValid(pos, playerPos) {
    const dx = pos.x - playerPos.x;
    const dy = pos.y - playerPos.y;
    const dz = pos.z - playerPos.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < CONFIG.MIN_ENEMY_SPAWN_DIST ** 2 || d2 > CONFIG.MAX_ENEMY_SPAWN_DIST ** 2) return false;
    for (const enemy of this.enemies) {
      if (!enemy.position) continue;
      const edx = pos.x - enemy.position.x;
      const edy = pos.y - enemy.position.y;
      const edz = pos.z - enemy.position.z;
      if (edx * edx + edy * edy + edz * edz < CONFIG.MIN_ENEMY_DIST ** 2) return false;
    }
    return true;
  }

  spawnEnemies(count, playerPos, playerRadius) {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = 50;
    while (spawned < count && attempts < maxAttempts) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const distance = CONFIG.MIN_ENEMY_SPAWN_DIST + Math.random() * (CONFIG.MAX_ENEMY_SPAWN_DIST - CONFIG.MIN_ENEMY_SPAWN_DIST);
      const pos = new THREE.Vector3(
        Math.sin(angle1) * Math.cos(angle2) * distance,
        Math.sin(angle2) * distance,
        Math.cos(angle1) * Math.cos(angle2) * distance
      ).add(playerPos);
      if (this.isPositionValid(pos, playerPos)) {
        this.createEnemyAtPosition(pos, playerRadius);
        spawned++;
      }
      attempts++;
    }
  }

  maintainEnemyCount(min = 2, max = 4) {
    const currentCount = this.enemies.length;
    if (currentCount < min && this.player) {
      this.spawnEnemies(min - currentCount, this.player.object.position, this.player.radius);
    }
    // Optional: cull if > max and far away
  }

  update(dt, time) {
    for (const enemy of this.enemies) {
      this.updateEnemy(enemy, dt, time);
    }
  }

  updateEnemy(enemy, dt, time) {
    if (!enemy || !enemy.userData?.isBlackHole || !this.player) return;

    // Suction logic (enemy pulls nearby objects)
    const suctionRadius = Math.min(800, 300 + enemy.userData.radius * 10);
    const maxPull = 15 + enemy.userData.radius * 0.5;
    for (const obj of this.objectManager.objects) {
      if (!obj || obj === enemy || !obj.userData) continue;
      if (obj.userData.isBlackHole) continue;
      if (obj.userData.radius >= enemy.userData.radius) continue;

      const d = Math.sqrt(this.dist3(enemy.position, obj.position));
      if (d < suctionRadius && d > 0.1) {
        const pullStrength = (1 - d / suctionRadius) * maxPull;
        const dir = new THREE.Vector3().subVectors(enemy.position, obj.position).normalize();
        obj.position.add(dir.multiplyScalar(pullStrength * dt));

        // Absorb if close enough
        const d2 = this.dist3(enemy.position, obj.position);
        const rSum = enemy.userData.radius + obj.userData.radius;
        if (d2 < rSum * rSum) {
          this.objectManager.scene.remove(obj);
          const objIdx = this.objectManager.objects.indexOf(obj);
          if (objIdx !== -1) this.objectManager.objects.splice(objIdx, 1);
          const eIdx = this.enemies.indexOf(obj);
          if (eIdx !== -1) this.enemies.splice(eIdx, 1);
          enemy.userData.radius += obj.userData.radius * 0.2;
          if (enemy.children.length > 0) {
            enemy.children[0].scale.setScalar(enemy.userData.radius / 3.0);
          }
        }
      }
    }

    // AI Behavior
    const playerSuctionRadius = this.player.getSuctionRadius();
    const aggroRadius = playerSuctionRadius * CONFIG.AGGRO_RADIUS_FACTOR;
    const playerDist2 = this.dist3(enemy.position, this.player.object.position);
    const inAggroRange = playerDist2 < aggroRadius * aggroRadius;
    let target = null;

    // Flee if player is bigger
    if (inAggroRange && this.player.radius > enemy.userData.radius) {
      const fleeDir = new THREE.Vector3().subVectors(enemy.position, this.player.object.position).normalize();
      const fleeSpeed = Math.min(100 + enemy.userData.radius * 5, this.player.getMaxPull() * CONFIG.ENEMY_MAX_SPEED_FACTOR);
      enemy.position.add(fleeDir.multiplyScalar(fleeSpeed * dt));
    } else {
      // Normal behavior: seek smaller objects or player if safe
      if (inAggroRange && this.player.radius < enemy.userData.radius) {
        target = { position: this.player.object.position };
      } else {
        let minDist = Infinity;
        for (const obj of this.objectManager.objects) {
          if (!obj || obj === enemy || !obj.userData) continue;
          if (obj.userData.isBlackHole) continue;
          if (obj.userData.radius >= enemy.userData.radius) continue;
          const d2 = this.dist3(enemy.position, obj.position);
          if (d2 < minDist) {
            minDist = d2;
            target = obj;
          }
        }
      }

      if (target && target.position) {
        const dir = new THREE.Vector3().subVectors(target.position, enemy.position).normalize();
        const playerSpeed = Math.min(150 + this.player.radius * 8, CONFIG.MAX_PLAYER_SPEED);
        const enemyMaxSpeed = playerSpeed * CONFIG.ENEMY_MAX_SPEED_FACTOR;
        const speed = Math.min(100 + enemy.userData.radius * 5, enemyMaxSpeed);
        enemy.position.add(dir.multiplyScalar(speed * dt));
      } else {
        // Wander
        enemy.userData.aiWanderTimer += dt;
        const wx = Math.cos(enemy.userData.aiWanderTimer) * 15;
        const wy = Math.sin(enemy.userData.aiWanderTimer * 0.7) * 15;
        const wz = Math.cos(enemy.userData.aiWanderTimer * 0.5) * 15;
        enemy.position.add(new THREE.Vector3(wx, wy, wz));
      }
    }

    // Clamp to world
    const h = this.objectManager.worldHalf;
    enemy.position.x = THREE.MathUtils.clamp(enemy.position.x, -h, h);
    enemy.position.y = THREE.MathUtils.clamp(enemy.position.y, -h, h);
    enemy.position.z = THREE.MathUtils.clamp(enemy.position.z, -h, h);
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

  cleanup() {
    this.enemies = [];
  }
    }
