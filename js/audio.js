import { Howl, Howler } from '../lib/howler.min.js';

export class AudioManager {
  constructor() {
    this.sounds = {};
    this.music = null;
    this.init();
  }

  init() {
    // Бесплатные звуки с Freesound.org (CC0)
    this.loadSound('absorb', 'assets/sounds/black_hole_suck.mp3');
    this.loadSound('grow', 'assets/sounds/deep_pulse.mp3');
    this.loadSound('aggro', 'assets/sounds/low_growl.mp3');
    this.loadSound('gameover', 'assets/sounds/whoosh_down.mp3');
    this.loadSound('event', 'assets/sounds/space_chime.mp3');

    this.music = new Howl({
      src: ['assets/sounds/space_drift.mp3'],
      loop: true,
      volume: 0.6,
      onloaderror: (id, err) => console.warn('Music load error:', err)
    });
  }

  loadSound(name, path) {
    this.sounds[name] = new Howl({
      src: [path],
      volume: 0.7,
      onloaderror: (id, err) => console.warn(`Sound "${name}" load error:`, err)
    });
  }

  play(soundName) {
    const sound = this.sounds[soundName];
    if (sound && !sound.playing()) {
      sound.seek(0);
      sound.play();
    }
  }

  playOneShot(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.seek(0);
      sound.play();
    }
  }

  setSoundVolume(vol) {
    Howler.volume(vol);
  }

  setMusicVolume(vol) {
    if (this.music) this.music.volume(vol);
  }

  playMusic() {
    if (this.music && !this.music.playing()) {
      this.music.play();
    }
  }

  stopMusic() {
    if (this.music) this.music.stop();
  }
}
