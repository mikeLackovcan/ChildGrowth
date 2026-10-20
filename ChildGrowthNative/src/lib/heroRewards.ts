import type { Task } from '../store/useAppStore';

export type QuestReward = {
  xp: number;
  coins: number;
  message?: string;
};

const baseXp = (task: Task) => task.diff === 'hard' ? 35 : task.diff === 'med' ? 20 : 10;

/** Distributes the normal daily wallet across all quests, totalling exactly 100 coins. */
export function dailyCoinShare(tasks: Task[], taskId: string): number {
  if (tasks.length === 0) return 0;
  const index = Math.max(0, tasks.findIndex((task) => task.id === taskId));
  const each = Math.floor(100 / tasks.length);
  const remainder = 100 % tasks.length;
  return each + (index < remainder ? 1 : 0);
}

export function calculateQuestReward(task: Task, tasks: Task[], heroId: string): QuestReward {
  let xp = baseXp(task);
  let coins = dailyCoinShare(tasks, task.id);
  let message: string | undefined;
  const id = heroId === 'default' ? 'quest_champ' : heroId;
  const icon = task.icon || '';

  switch (id) {
    case 'quest_champ':
      xp += 10; message = 'Champion spirit added 10 XP!';
      break;
    case 'quest_sprout':
      if (task.diff === 'easy') { coins = Math.ceil(coins * 1.1); message = 'Sprout found bonus coins!'; }
      break;
    case 'quest_ember':
      if (task.freq === 'daily') { xp = Math.ceil(xp * 1.15); message = 'Ember sparked extra XP!'; }
      break;
    case 'quest_drift':
      if (task.freq === 'daily') { coins = Math.ceil(coins * 1.1); message = 'Drift rewarded steady steps!'; }
      break;
    case 'quest_forge':
      if (['🧹', '🧺', '🧸'].includes(icon)) { coins = Math.ceil(coins * 1.2); message = 'Forge boosted a home quest!'; }
      break;
    case 'quest_coral':
      if (icon === '💖') { coins = Math.ceil(coins * 1.25); message = 'Coral boosted kindness!'; }
      break;
    case 'quest_dusk':
      if (task.focusDurationMinutes) { xp = Math.ceil(xp * 1.25); message = 'Dusk boosted focus XP!'; }
      break;
    case 'quest_jade':
      xp = Math.ceil(xp * 1.25); message = 'Jade grew extra XP!';
      break;
    case 'quest_nova':
      if (icon === '📚') { coins = Math.ceil(coins * 1.25); message = 'Nova lit up learning!'; }
      break;
    case 'quest_pulse':
      if (tasks.filter((item) => item.id !== task.id).every((item) => item.done)) { xp += 50; message = 'Pulse completed the full day!'; }
      break;
    case 'quest_prism':
      if (tasks.filter((item) => item.id !== task.id).every((item) => item.done)) { coins += 20; message = 'Prism found a perfect-day bonus!'; }
      break;
    case 'quest_frost':
      if (icon === '🪥') { xp = Math.ceil(xp * 1.3); message = 'Frost boosted a health quest!'; }
      break;
    case 'quest_sunrise':
      if (tasks.filter((item) => item.id !== task.id).every((item) => item.done)) {
        xp = Math.ceil(xp * 1.5);
        coins = Math.ceil(coins * 1.5);
        message = 'Sunrise powered a perfect day!';
      }
      break;
  }

  return { xp, coins, message };
}
