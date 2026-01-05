import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Player {
  constructor(scene, initialRadius = CONFIG.START_RADIUS) {
    this.scene = scene;
    this.radius = initialRadius;
    this.speed = 0;
    this.maxSpeed = CONFIG.MAX_PLAYER_SPEED;
    this.yaw = 0;
    this.pitch = 0;
    this.moveInputX = 0;
    this.moveInputY = 0;
    this.object = new THREE.Object3D();
    this.object.position.set(0, 0, 0);
    scene.add(this.object);

    // Black hole mesh
    this.blackHoleMesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x050515,
        roughness: 0.1,
        metalness: 0.98
      })
    );
    this.object.add(this.blackHoleMesh);

    // Accretion disk glow
    const particleCount = 400;
    const particles = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorsList = [0xb16ce9, 0x8a2be2, 0x5e17eb, 0x9a4cff];
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.0 + Math.random() * 2.5;
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.sin(angle1) * Math.cos(angle2) * radius;
      pos[i * 3 + 1] = Math.sin(angle2) * radius;
      pos[i * 3 + 2] = Math.cos(angle1) * Math.cos(angle2) * radius;
      const color = new THREE.Color(colorsList[Math.floor(Math.random() * colorsList.length)]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    particles.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true
    });
    this.accretionGlow = new THREE.Points(particles, material);
    this.object.add(this.accretionGlow);
  }

  update(dt, time, worldHalf) {
    // Update glow animation
    if (this.accretionGlow) {
      const scale = this.radius / CONFIG.START_RADIUS;
      this.accretionGlow.scale.setScalar(scale);
      this.accretionGlow.material.size = (0.6 + Math.sin(time * 2) * 0.2) * scale;
      this.accretionGlow.rotation.x += 0.01;
      this.accretionGlow.rotation.y += 0.015;
    }

    // Apply movement
    if (Math.abs(this.moveInputX) > 0.01 || Math.abs(this.moveInputY) > 0.01) {
      const speed = Math.min(150 + this.radius * 8, this.maxSpeed) * dt;
      const forward = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
      this.object.position.add(forward.multiplyScalar(this.moveInputY * speed));
      this.object.position.add(right.multiplyScalar(this.moveInputX * speed));

      // Clamp to world bounds
      const h = worldHalf;
      this.object.position.x = THREE.MathUtils.clamp(this.object.position.x, -h, h);
      this.object.position.y = THREE.MathUtils.clamp(this.object.position.y, -h, h);
      this.object.position.z = THREE.MathUtils.clamp(this.object.position.z, -h, h);
    }
  }

  grow(amount) {
    this.radius += amount;
    if (this.blackHoleMesh) {
      this.blackHoleMesh.scale.setScalar(this.radius / CONFIG.START_RADIUS);
    }
  }

  setMoveInput(x, y) {
    this.moveInputX = x;
    this.moveInputY = y;
  }

  setLookInput(deltaX, deltaY, sensitivity = CONFIG.LOOK_SENSITIVITY) {
    this.yaw -= deltaX * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * sensitivity, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
  }

  getSuctionRadius() {
    return Math.min(800, 300 + this.radius * 10);
  }

  getMaxPull() {
    return 15 + this.radius * 0.5;
  }

  dispose() {
    if (this.blackHoleMesh?.geometry) this.blackHoleMesh.geometry.dispose();
    if (this.blackHoleMesh?.material) this.blackHoleMesh.material.dispose();
    if (this.accretionGlow?.geometry) this.accretionGlow.geometry.dispose();
    if (this.accretionGlow?.material) this.accretionGlow.material.dispose();
    if (this.object.parent) this.object.parent.remove(this.object);
  }
}
