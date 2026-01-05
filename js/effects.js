import * as THREE from 'three';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.particlePools = new Map();
    this.initPools();
  }

  initPools() {
    // Pre-create particle systems for reuse
    this.createParticlePool('absorption', 200);
  }

  createParticlePool(name, count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Initialize inactive particles off-screen
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 99999;
      positions[i * 3 + 1] = 99999;
      positions[i * 3 + 2] = 99999;
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      sizes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 3));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { active: [], total: count, timer: 0 };
    this.scene.add(points);
    this.particlePools.set(name, points);
  }

  spawnAbsorptionParticles(position, color = new THREE.Color(0xb16ce9)) {
    const pool = this.particlePools.get('absorption');
    if (!pool) return;

    const geom = pool.geometry;
    const posAttr = geom.getAttribute('position');
    const colAttr = geom.getAttribute('color');
    const sizeAttr = geom.getAttribute('size');

    // Find inactive particles
    let spawned = 0;
    const maxParticles = 50;
    for (let i = 0; i < pool.userData.total && spawned < maxParticles; i++) {
      if (posAttr.getX(i) > 99990) { // inactive
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 2.0;
        posAttr.setXYZ(
          i,
          position.x + Math.sin(angle1) * Math.cos(angle2) * radius,
          position.y + Math.sin(angle2) * radius,
          position.z + Math.cos(angle1) * Math.cos(angle2) * radius
        );
        colAttr.setXYZ(i, color.r, color.g, color.b);
        sizeAttr.setX(i, 0.5 + Math.random() * 0.8);
        pool.userData.active.push({ index: i, life: 1.0, speed: 15 + Math.random() * 10 });
        spawned++;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  update(dt) {
    for (const [name, pool] of this.particlePools) {
      const geom = pool.geometry;
      const posAttr = geom.getAttribute('position');
      const sizeAttr = geom.getAttribute('size');

      const active = pool.userData.active;
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.life -= dt;
        if (p.life <= 0) {
          // Deactivate particle
          posAttr.setXYZ(p.index, 99999, 99999, 99999);
          sizeAttr.setX(p.index, 0);
          active.splice(i, 1);
        } else {
          // Move toward center (simulate absorption)
          const px = posAttr.getX(p.index);
          const py = posAttr.getY(p.index);
          const pz = posAttr.getZ(p.index);
          const dx = 0 - px, dy = 0 - py, dz = 0 - pz;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist > 0.1) {
            const move = p.speed * dt;
            const nx = px + (dx / dist) * move;
            const ny = py + (dy / dist) * move;
            const nz = pz + (dz / dist) * move;
            posAttr.setXYZ(p.index, nx, ny, nz);
            // Shrink over time
            sizeAttr.setX(p.index, sizeAttr.getX(p.index) * (1 - dt * 2));
          }
        }
      }

      if (active.length > 0) {
        posAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
      }
    }
  }

  // Simple screen shake
  screenShake(intensity = 0.5) {
    const el = document.querySelector('canvas');
    if (!el) return;
    const originalTransform = el.style.transform || '';
    el.style.transform = `${originalTransform} translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
    setTimeout(() => {
      el.style.transform = originalTransform;
    }, 50);
  }

  dispose() {
    for (const pool of this.particlePools.values()) {
      this.scene.remove(pool);
      pool.geometry.dispose();
      pool.material.dispose();
    }
    this.particlePools.clear();
  }
        }
