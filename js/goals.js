import { AudioManager } from './audio.js';

export class GoalSystem {
  constructor(audioManager) {
    this.audio = audioManager;
    this.achievements = [
      { id: 'stars', target: 10, current: 0, unlocked: false, type: 'absorb', name: 'star', message: 'Галактическое ядро активировано!' },
      { id: 'size50', target: 50, current: 0, unlocked: false, type: 'size', message: 'Вы достигли критической массы!' },
      { id: 'enemies', target: 5, current: 0, unlocked: false, type: 'enemies', message: 'Тёмная эра наступила!' }
    ];
    this.finalTriggered = false;
  }

  checkProgress(score, size, enemiesDefeated, absorbedObjects) {
    let unlocked = [];
    for (const goal of this.achievements) {
      if (goal.unlocked) continue;
      if (goal.type === 'size' && size >= goal.target) {
        goal.unlocked = true;
        unlocked.push(goal.message);
        this.audio.playOneShot('event');
      } else if (goal.type === 'enemies' && enemiesDefeated >= goal.target) {
        goal.unlocked = true;
        unlocked.push(goal.message);
        this.audio.playOneShot('event');
      } else if (goal.type === 'absorb') {
        const starCount = absorbedObjects.filter(o => o.type === 'star').length;
        if (starCount >= goal.target && goal.current < goal.target) {
          goal.current = starCount;
          if (starCount >= goal.target) {
            goal.unlocked = true;
            unlocked.push(goal.message);
            this.audio.playOneShot('event');
          }
        }
      }
    }

    if (size > 200 && !this.finalTriggered) {
      this.finalTriggered = true;
      unlocked.push('Вселенная коллапсирует...');
      this.audio.stopMusic();
      // Could trigger final cinematic here
    }

    return unlocked;
  }

  showNotification(messages) {
    // Simple on-screen notification
    messages.forEach((msg, i) => {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = `
        position: absolute;
        top: ${100 + i * 40}px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(94, 23, 235, 0.85);
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 18px;
        z-index: 1000;
        pointer-events: none;
        animation: fadeInOut 4s forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    });
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -20px); }
        10% { opacity: 1; transform: translate(-50%, 0); }
        90% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => document.head.removeChild(style), 4100);
  }
}
