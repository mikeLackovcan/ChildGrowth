import type { Task } from '../store/useAppStore';
import { localDateKey } from './questSchedule';

export interface QuestActivity {
  taskId: string;
  name: string;
  templateKey?: string;
  date: string;
  completed: boolean;
  postponed: number;
}

export function normalizeActivity(value: unknown, now = new Date()): QuestActivity[] {
  if (!Array.isArray(value)) return [];
  const oldest = new Date(now);
  oldest.setDate(oldest.getDate() - 34);
  const min = localDateKey(oldest);
  const max = localDateKey(now);
  const unique = new Map<string, QuestActivity>();
  for (const item of value) {
    if (!item || typeof item.taskId !== 'string' || typeof item.name !== 'string'
      || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
      || item.date < min || item.date > max) continue;
    const safe: QuestActivity = {
      taskId: item.taskId, name: item.name.slice(0, 80), date: item.date,
      completed: item.completed === true,
      postponed: Number.isFinite(item.postponed) ? Math.max(0, Math.floor(item.postponed)) : 0,
      ...(typeof item.templateKey === 'string' ? { templateKey: item.templateKey } : {}),
    };
    unique.set(item.date + ':' + item.taskId, safe);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-1500);
}

export function recordQuestActivity(
  history: QuestActivity[], task: Pick<Task, 'id' | 'name' | 'templateKey'>,
  action: 'complete' | 'undo' | 'postpone', now = new Date(),
): QuestActivity[] {
  const date = localDateKey(now);
  const clean = normalizeActivity(history, now);
  const prior = clean.find(item => item.taskId === task.id && item.date === date);
  const next: QuestActivity = {
    taskId: task.id, name: task.name, date,
    ...(task.templateKey ? { templateKey: task.templateKey } : {}),
    completed: action === 'complete' || (action !== 'undo' && Boolean(prior?.completed)),
    postponed: (prior?.postponed || 0) + (action === 'postpone' ? 1 : 0),
  };
  return normalizeActivity([...clean.filter(item => item !== prior), next], now);
}

export function weeklyProgress(history: QuestActivity[], now = new Date()) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(day.getDate() - 6 + index);
    return localDateKey(day);
  });
  const entries = normalizeActivity(history, now).filter(item => days.includes(item.date));
  const tasks = new Map<string, { taskId: string; name: string; templateKey?: string; completed: number; postponed: number }>();
  for (const entry of entries) {
    const item = tasks.get(entry.taskId) || { taskId: entry.taskId, name: entry.name, templateKey: entry.templateKey, completed: 0, postponed: 0 };
    item.name = entry.name;
    item.templateKey = entry.templateKey;
    item.completed += Number(entry.completed);
    item.postponed += entry.postponed;
    tasks.set(entry.taskId, item);
  }
  return {
    days: days.map(date => ({ date, completed: entries.filter(item => item.date === date && item.completed).length })),
    completed: entries.filter(item => item.completed).length,
    postponed: entries.reduce((sum, item) => sum + item.postponed, 0),
    tasks: [...tasks.values()].sort((a, b) => b.postponed - a.postponed || b.completed - a.completed),
    hasRecords: entries.length > 0,
  };
}
