import * as THREE from 'three';
import { CONFIG, OBJECT_TYPES } from './config.js';

export class ObjectManager {
  constructor(scene, playerRadius, maxObjects = 3000) {
    this.scene = scene;
    this.playerRadius = playerRadius;
    this.maxObjects = maxObjects;
    this.objects = [];
    this.enemyBlackHoles = [];
    this.groupCenters = [];
  }

  getTypeBySize(size) {
    const types = OBJECT_TYPES.filter(t => !t.rare && t.name !== 'black-hole');
    for (let i = types.length - 1; i >= 0; i--) {
      if (size <= types[i].max) return types[i];
    }
    return types[0];
  }

  createObjectAtPosition(pos, isEnemy = false, forcedSize = null) {
    let size = forcedSize;
    if (size === null) {
      if (isEnemy) {
        size = this.playerRadius * CONFIG.ENEMY_SIZE_FACTOR;
      } else {
        size = (Math.random() < 0.4) 
          ? Math.random() * (this.playerRadius * 0.5) 
          : 0.3 + Math.random() * 15;
        if (size < 0.3) size = 0.3;
      }
    }

    const typeObj = isEnemy 
      ? OBJECT_TYPES.find(t => t.name === 'black-hole') 
      : this.getTypeBySize(size);

    const geometry = new THREE.SphereGeometry(size, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: typeObj.color,
      emissive: typeObj.emissive,
      roughness: typeObj.roughness,
      metalness: typeObj.metalness,
      emissiveIntensity: typeObj.emissiveIntensity || 1,
      transparent: typeObj.invisible,
      opacity: typeObj.invisible ? 0.0 : 1.0
    });

    const obj = new THREE.Mesh(geometry, material);
    obj.userData = {
      radius: size,
      points: typeObj.points,
      type: typeObj.name,
      isBlackHole: typeObj.name === 'black-hole',
      isMovingAsteroid: typeObj.name === 'moving-asteroid',
      isFleeing: !!typeObj.fleeing,
      velocity: null,
      wanderTimer: Math.random() * 10,
      invisible: !!typeObj.invisible
    };
    obj.position.copy(pos);

    if (typeObj.name === 'black-hole') {
      const colorsList = [0xb16ce9, 0x8a2be2, 0x5e17eb, 0x9a4cff];
      const particleCount = 300;
      const particles = new THREE.BufferGeometry();
      const posAttr = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const radius = 1.0 + Math.random() * 2.5;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        posAttr[i*3] = Math.sin(angle1) * Math.cos(angle2) * radius;
        posAttr[i*3+1] = Math.sin(angle2) * radius;
        posAttr[i*3+2] = Math.cos(angle1) * Math.cos(angle2) * radius;
        const color = new THREE.Color(colorsList[Math.floor(Math.random() * colorsList.length)]);
        colors[i*3] = color.r; colors[i*3+1] = color.g; colors[i*3+2] = color.b;
      }
      particles.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const glowMat = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        sizeAttenuation: true
      });
      const enemyGlow = new THREE.Points(particles, glowMat);
      enemyGlow.scale.setScalar(size / 3.0);
      obj.add(enemyGlow);
    }

    if (typeObj.name === 'moving-asteroid' || typeObj.fleeing) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      obj.userData.velocity = new THREE.Vector3(
        Math.sin(angle1) * Math.cos(angle2),
        Math.sin(angle2),
        Math.cos(angle1) * Math.cos(angle2)
      ).multiplyScalar(typeObj.fleeing ? 120 : 60);
    }

    return obj;
  }

  isPositionTooClose(pos, minDist = CONFIG.GROUP_MIN_DIST, excludePlayer = false, playerPos = null) {
    if (!excludePlayer && playerPos) {
      const dx = pos.x - playerPos.x;
      const dy = pos.y - playerPos.y;
      const dz = pos.z - playerPos.z;
      if (dx*dx + dy*dy + dz*dz < minDist * minDist) return true;
    }
    for (const center of this.groupCenters) {
      const dx = pos.x - center.x;
      const dy = pos.y - center.y;
      const dz = pos.z - center.z;
      if (dx*dx + dy*dy + dz*dz < minDist * minDist) return true;
    }
    return false;
  }

  isEnemyPositionValid(pos, playerPos) {
    const dx = pos.x - playerPos.x;
    const dy = pos.y - playerPos.y;
    const dz = pos.z - playerPos.z;
    const d2 = dx*dx + dy*dy + dz*dz;
    if (d2 < CONFIG.MIN_ENEMY_SPAWN_DIST**2 || d2 > CONFIG.MAX_ENEMY_SPAWN_DIST**2) return false;
    for (const enemy of this.enemyBlackHoles) {
      if (!enemy.position) continue;
      const edx = pos.x - enemy.position.x;
      const edy = pos.y - enemy.position.y;
      const edz = pos.z - enemy.position.z;
      if (edx*edx + edy*edy + edz*edz < CONFIG.MIN_ENEMY_DIST**2) return false;
    }
    return true;
  }

  spawnObjectGroup(nearPlayer = false, playerPos = null, maxAttempts = 20) {
    if (this.objects.length >= this.maxObjects) return null;

    let groupCenter = null;
    if (nearPlayer && playerPos) {
      const distance = 200 + Math.random() * 400;
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      groupCenter = new THREE.Vector3(
        Math.sin(angle1) * Math.cos(angle2) * distance,
        Math.sin(angle2) * distance,
        Math.cos(angle1) * Math.cos(angle2) * distance
      ).add(playerPos);
    } else {
      let attempts = 0;
      while (attempts < maxAttempts) {
        groupCenter = new THREE.Vector3(
          (Math.random() - 0.5) * (this.worldSize - 1600),
          (Math.random() - 0.5) * (this.worldSize - 1600),
          (Math.random() - 0.5) * (this.worldSize - 1600)
        );
        if (!this.isPositionTooClose(groupCenter, CONFIG.GROUP_MIN_DIST, false, playerPos)) break;
        attempts++;
      }
      if (attempts >= maxAttempts) return null;
    }

    const leaderTypes = OBJECT_TYPES.filter(t => 
      t.name !== 'asteroid' && 
      t.name !== 'moving-asteroid' && 
      t.name !== 'black-hole' && 
      !t.rare
    );
    const leaderType = leaderTypes[Math.floor(Math.random() * leaderTypes.length)];
    const leaderSize = leaderType.min + Math.random() * (leaderType.max - leaderType.min);
    const leader = this.createObjectAtPosition(groupCenter, false, leaderSize);
    this.scene.add(leader);
    this.objects.push(leader);

    const satelliteCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < satelliteCount; i++) {
      if (this.objects.length >= this.maxObjects) break;
      const satSize = 0.3 + Math.random() * Math.min(leaderSize * 0.5, 15);
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80
      );
      const satPos = groupCenter.clone().add(offset);
      const satellite = this.createObjectAtPosition(satPos, false, satSize);
      this.scene.add(satellite);
      this.objects.push(satellite);
    }

    this.groupCenters.push(groupCenter.clone());
    return groupCenter;
  }

  spawnRareObject(playerPos) {
    if (this.objects.length >= this.maxObjects) return;
    const rareTypes = OBJECT_TYPES.filter(t => t.rare);
    if (rareTypes.length === 0) return;
    const type = rareTypes[Math.floor(Math.random() * rareTypes.length)];
    const size = type.min + Math.random() * (type.max - type.min);
    const distance = 3000 + Math.random() * 5000;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const pos = new THREE.Vector3(
      Math.sin(angle1) * Math.cos(angle2) * distance,
      Math.sin(angle2) * distance,
      Math.cos(angle1) * Math.cos(angle2) * distance
    ).add(playerPos);
    const obj = this.createObjectAtPosition(pos, false, size);
    this.scene.add(obj);
    this.objects.push(obj);
  }

  spawnEnemyBlackHoles(count, playerPos) {
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
      if (this.isEnemyPositionValid(pos, playerPos)) {
        const enemySize = this.playerRadius * CONFIG.ENEMY_SIZE_FACTOR;
        const obj = this.createObjectAtPosition(pos, true, enemySize);
        this.scene.add(obj);
        this.objects.push(obj);
        this.enemyBlackHoles.push(obj);
        spawned++;
      }
      attempts++;
    }
  }

  maintainEnemyCount(min = 2, max = 4) {
    const currentCount = this.enemyBlackHoles.length;
    if (currentCount < min) {
      // Will be called from game loop with player position
    } else if (currentCount > max) {
      // Optional: cull farthest enemies
    }
  }

  update(dt, player, camera, playerRadius, worldHalf) {
    this.playerRadius = playerRadius;
    this.worldHalf = worldHalf;
    this.worldSize = worldHalf * 2;

    for (const obj of this.objects) {
      if (!obj || !obj.userData) continue;
      if (obj.userData.isFleeing && player) {
        const dir = new THREE.Vector3().subVectors(obj.position, player.position).normalize();
        obj.position.add(dir.multiplyScalar(120 * dt));
      }
      if (obj.userData.isMovingAsteroid && obj.userData.velocity) {
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(dt));
        obj.position.x = THREE.MathUtils.clamp(obj.position.x, -worldHalf, worldHalf);
        obj.position.y = THREE.MathUtils.clamp(obj.position.y, -worldHalf, worldHalf);
        obj.position.z = THREE.MathUtils.clamp(obj.position.z, -worldHalf, worldHalf);
      }
    }
  }

  cleanup() {
    this.objects.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m?.dispose?.());
      }
      if (obj.parent) obj.parent.remove(obj);
    });
    this.objects = [];
    this.enemyBlackHoles = [];
    this.groupCenters = [];
  }
}
