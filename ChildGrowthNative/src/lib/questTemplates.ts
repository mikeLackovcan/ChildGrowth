import i18n from '../i18n';
import type { Task } from '../store/useAppStore';

export const QUEST_TEMPLATES = [
  { key: 'template_teeth', icon: '🪥', minutes: 2 },
  { key: 'template_homework', icon: '📚', minutes: 15 },
  { key: 'template_toys', icon: '🧸' },
  { key: 'template_read', icon: '📖', minutes: 10 },
  { key: 'template_dressed', icon: '👕' },
  { key: 'template_bag', icon: '🎒' },
  { key: 'template_plants', icon: '🌱' },
  { key: 'template_help', icon: '💖' },
] as const;

export function questName(task: Pick<Task, 'name' | 'templateKey'>): string {
  return task.templateKey && QUEST_TEMPLATES.some(template => template.key === task.templateKey)
    ? i18n.t(task.templateKey) : task.name;
}

export const STARTER_HERO_IDS = ['quest_champ', 'quest_sprout', 'quest_coral', 'quest_dusk', 'quest_sunrise'];

export function starterTasks(keys: string[], date: string): Task[] {
  return [...new Set(keys)].flatMap(key => {
    const template = QUEST_TEMPLATES.find(item => item.key === key);
    return template ? [{
      id: 'starter-' + key,
      templateKey: key,
      name: i18n.t(key),
      icon: template.icon,
      freq: 'daily' as const,
      diff: 'med' as const,
      mystery: false,
      done: false,
      date,
      ...('minutes' in template ? { focusDurationMinutes: template.minutes } : {}),
    }] : [];
  });
}
