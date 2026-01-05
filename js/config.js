// === CONFIG / НАСТРОЙКИ ===
export const CONFIG = {
  START_RADIUS: 3.0,
  MAX_OBJECTS: 3000,
  SPAWN_INTERVAL: 80,
  MAX_PLAYER_SPEED: 400,
  INITIAL_WORLD_HALF: 36000,
  LOOK_SENSITIVITY: 0.02,
  MIN_ENEMY_SPAWN_DIST: 1500,
  MAX_ENEMY_SPAWN_DIST: 2000,
  MIN_ENEMY_DIST: 1000,
  ENEMY_SIZE_FACTOR: 0.6,
  ENEMY_MAX_SPEED_FACTOR: 0.6,
  AGGRO_RADIUS_FACTOR: 2.0,
  GROUP_MIN_DIST: 800,
  OBJECT_SPAWN_AFTER_ABSORB: 0.8,
  WORLD_GROWTH_STEP: 500,
  WORLD_GROWTH_EVERY: 5,
};

// === LANGUAGE / ЯЗЫК ===
export const LANG = {
  ru: {
    title: 'ЧЁРНАЯ ДЫРА',
    play: 'Играть',
    info: 'Инфо',
    lang: '🇷🇺/🇬🇧',
    score: 'Очки:',
    size: 'Размер:',
    universe: 'Вселенная:',
    gameOver: 'Вас поглотила другая дыра...',
    finalScore: 'Очки:',
    restart: 'Заново',
    menu: 'В меню',
    infoTitle: 'Информация об игре',
    infoDesc: 'Вы — чёрная дыра в бескрайнем космосе. Поглощайте астероиды, планеты, звёзды и даже другие чёрные дыры, чтобы расти и становиться сильнее.',
    infoGoal: 'Великая цель — поглотить галактику.',
    infoControls: '<strong>Управление:</strong><br>• Нижняя часть экрана — движение (вперёд/назад, влево/вправо)<br>• Верхняя часть экрана — поворот взгляда (камера)<br>• Космос бесконечен — исследуйте его!'
  },
  en: {
    title: 'BLACK HOLE',
    play: 'Play',
    info: 'Info',
    lang: '🇬🇧/🇷🇺',
    score: 'Score:',
    size: 'Size:',
    universe: 'Universe:',
    gameOver: 'You were swallowed by another black hole...',
    finalScore: 'Score:',
    restart: 'Restart',
    menu: 'Menu',
    infoTitle: 'About the Game',
    infoDesc: 'You are a black hole in the infinite cosmos. Absorb asteroids, planets, stars, and even other black holes to grow stronger.',
    infoGoal: 'Your ultimate goal: consume the galaxy.',
    infoControls: '<strong>Controls:</strong><br>• Bottom half: move (forward/back, left/right)<br>• Top half: look around (camera)<br>• The cosmos is endless — explore it!'
  }
};

// === DEFAULT SETTINGS ===
export const DEFAULT_SETTINGS = {
  soundVolume: 0.7,
  musicVolume: 0.6,
  sensitivity: 0.02,
  graphicsQuality: 'auto', // 'low', 'high', 'auto'
  language: 'ru'
};

// === OBJECT TYPES / ТИПЫ ОБЪЕКТОВ ===
export const OBJECT_TYPES = [
  { name: 'asteroid', color: 0x555555, emissive: 0x222222, roughness: 0.9, metalness: 0.1, min: 0.3, max: 1.8, points: 1 },
  { name: 'planet', color: 0x44aa44, emissive: 0x113311, roughness: 0.7, metalness: 0.0, min: 1.9, max: 3.5, points: 2 },
  { name: 'oasis-planet', color: 0x3388dd, emissive: 0x114466, roughness: 0.6, metalness: 0.0, min: 2.0, max: 3.2, points: 3 },
  { name: 'gas-giant', color: 0x4444cc, emissive: 0x111144, roughness: 0.5, metalness: 0.2, min: 3.6, max: 6.0, points: 4 },
  { name: 'star', color: 0xffff66, emissive: 0x888800, roughness: 0.1, metalness: 0.9, emissiveIntensity: 3, min: 6.1, max: 12.0, points: 8 },
  { name: 'moving-asteroid', color: 0xaa8844, emissive: 0x332211, roughness: 0.85, metalness: 0.1, min: 0.5, max: 1.5, points: 1 },
  { name: 'neutron-star', color: 0xffdd44, emissive: 0xff8800, roughness: 0.2, metalness: 0.95, emissiveIntensity: 5, min: 10, max: 12, points: 30, rare: true },
  { name: 'dark-matter', color: 0x000000, emissive: 0x110022, roughness: 0.1, metalness: 0.99, emissiveIntensity: 2, min: 2.0, max: 5.0, points: 10, invisible: true, rare: true },
  { name: 'spaceship', color: 0xcccccc, emissive: 0x4444ff, roughness: 0.3, metalness: 0.7, emissiveIntensity: 1, min: 1.0, max: 2.0, points: 5, rare: true, fleeing: true },
  { name: 'black-hole', color: 0x000000, emissive: 0x050515, roughness: 0.1, metalness: 0.98, min: 2.0, max: 3.5, points: 0 }
];
