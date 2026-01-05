import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Universe {
  constructor(scene, worldHalf) {
    this.scene = scene;
    this.worldHalf = worldHalf;
    this.worldSize = worldHalf * 2;
    this.layers = [];
    this.animatedNebulae = [];
    this.animatedGalaxies = [];
    this.animatedClusters = [];
    this.init();
  }

  init() {
    this.scene.background = new THREE.Color(0x020005);
    const loader = new THREE.TextureLoader();
    const nebulaTextures = [
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/nebulae/nebula-1.jpg",
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/nebulae/nebula-2.jpg",
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/nebulae/nebula-3.jpg"
    ].map(url => loader.load(url));

    this.addLayer(this.createRichStarLayer(300, 0.1), 1.2);
    this.addLayer(this.createRichStarLayer(1200, 0.3), 1.0);
    this.addLayer(this.createRichStarLayer(3000, 0.6), 0.6);
    this.addLayer(this.createRichStarLayer(12000, 1.0), 0.3);
    this.addLayer(this.createRichStarLayer(25000, 1.8), 0.12);
    this.addLayer(this.createStarClusterLayer(120, 8000), 0.2);
    this.addLayer(this.createGalaxyLayer(10), 0.08);
    this.addLayer(this.createVolumetricNebulaLayer(nebulaTextures), 0.05);
    this.addLayer(this.createDustLayer(6), 0.03);
    this.addLayer(this.createMilkyWayDisk(), 0.02);
  }

  addLayer(obj, speed) {
    this.scene.add(obj);
    this.layers.push({ obj, speed });
  }

  createRichStarLayer(count, depthFactor = 1.0) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const starColors = [
      { temp: 30000, color: new THREE.Color(0x8abfff) },
      { temp: 20000, color: new THREE.Color(0xa0d1ff) },
      { temp: 10000, color: new THREE.Color(0xc0e0ff) },
      { temp: 7000,  color: new THREE.Color(0xfff0d0) },
      { temp: 6000,  color: new THREE.Color(0xffe0b0) },
      { temp: 5000,  color: new THREE.Color(0xffc080) },
      { temp: 3500,  color: new THREE.Color(0xff8040) },
    ];
    const weights = [0.5, 1, 2, 5, 8, 12, 20];
    for (let i = 0; i < count; i++) {
      const radius = Math.random() * this.worldSize * depthFactor;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = radius * Math.cos(phi);
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let idx = 0;
      for (let w of weights) {
        r -= w;
        if (r <= 0) break;
        idx++;
      }
      const starClass = starColors[Math.min(idx, starColors.length - 1)];
      colors[i*3] = starClass.color.r;
      colors[i*3+1] = starClass.color.g;
      colors[i*3+2] = starClass.color.b;
      const baseSize = 0.4 + (starClass.temp / 30000) * 5.0;
      const sizeVariation = 0.7 + Math.random() * 0.6;
      sizes[i] = baseSize * sizeVariation * (1.0 / depthFactor);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 3));
    const material = new THREE.PointsMaterial({ 
      size: 1, 
      vertexColors: true, 
      sizeAttenuation: true, 
      transparent: true, 
      alphaTest: 0.1, 
      blending: THREE.AdditiveBlending 
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  createStarClusterLayer(count, maxDist) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const cluster = this.createRichStarLayer(80, 0.005);
      cluster.position.set(
        (Math.random() - 0.5) * maxDist,
        (Math.random() - 0.5) * maxDist * 0.3,
        (Math.random() - 0.5) * maxDist
      );
      const rotSpeed = (Math.random() - 0.5) * 0.00005;
      this.animatedClusters.push({ obj: cluster, rotSpeed });
      group.add(cluster);
    }
    return group;
  }

  createGalaxyLayer(count) {
    const group = new THREE.Group();
    const loader = new THREE.TextureLoader();
    const texture = loader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/galaxy.png");
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.6 + Math.random() * 0.3
      });
      const sprite = new THREE.Sprite(mat);
      const d = 10000 + Math.random() * 30000;
      const a = Math.random() * Math.PI * 2;
      sprite.position.set(Math.cos(a) * d, (Math.random() - 0.5) * 3000, Math.sin(a) * d);
      const scale = 800 + Math.random() * 1200;
      sprite.scale.set(scale, scale, 1);
      const rotationSpeed = (0.8 + Math.random() * 0.7) * 0.0001;
      this.animatedGalaxies.push({ sprite, rotationSpeed });
      group.add(sprite);
    }
    return group;
  }

  createDustLayer(count) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(20000, 32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0x1a0a2a, transparent: true, opacity: 0.03 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * this.worldSize,
        (Math.random() - 0.5) * 5000,
        (Math.random() - 0.5) * this.worldSize
      );
      group.add(mesh);
    }
    return group;
  }

  createMilkyWayDisk() {
    const geo = new THREE.RingGeometry(15000, 35000, 256);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xd0b0ff, 
      transparent: true, 
      opacity: 0.08, 
      side: THREE.DoubleSide 
    });
    const disk = new THREE.Mesh(geo, mat);
    disk.rotation.x = Math.PI / 2;
    return disk;
  }

  createVolumetricNebulaLayer(textures) {
    const group = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      const geometry = new THREE.BoxGeometry(8000, 8000, 8000);
      const material = new THREE.ShaderMaterial({
        uniforms: { 
          uTexture: { value: tex }, 
          uTime: { value: 0 } 
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform float uTime;
          varying vec3 vPosition;
          void main() {
            vec2 uv = vPosition.xy * 0.0001 + vec2(uTime * 0.01, 0.0);
            vec4 color = texture2D(uTexture, uv);
            color.a *= 0.6;
            if (color.a < 0.05) discard;
            gl_FragColor = color;
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * this.worldSize * 0.8,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * this.worldSize * 0.8
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.animatedNebulae.push({ mesh });
      group.add(mesh);
    }
    return group;
  }

  update(time, player, camera) {
    // Update nebula time
    this.animatedNebulae.forEach(neb => {
      if (neb.mesh.material.uniforms?.uTime) {
        neb.mesh.material.uniforms.uTime.value = time;
      }
    });

    // Rotate galaxies and clusters
    this.animatedGalaxies.forEach(gal => gal.sprite.rotation += gal.rotationSpeed);
    this.animatedClusters.forEach(cl => cl.obj.rotation.y += cl.rotSpeed);

    // Parallax background
    if (player && camera) {
      const camOffset = new THREE.Vector3().subVectors(camera.position, player.position);
      this.layers.forEach(layer => {
        layer.obj.position.copy(camOffset).multiplyScalar(-layer.speed);
      });
    }
  }

  dispose() {
    this.layers.forEach(l => this.scene.remove(l.obj));
    this.layers = [];
    this.animatedNebulae = [];
    this.animatedGalaxies = [];
    this.animatedClusters = [];
  }
}
