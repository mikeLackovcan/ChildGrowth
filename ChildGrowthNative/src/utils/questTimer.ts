import type { Task } from '../types/progress';

export const QUEST_DURATION_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60] as const;

export function isTimedQuest(task: Pick<Task, 'durationMinutes'>): boolean {
  return Number.isInteger(task.durationMinutes) && (task.durationMinutes || 0) > 0;
}

export function questTimeRemainingMs(task: Pick<Task, 'durationMinutes' | 'startedAt'>, now = Date.now()): number {
  if (!isTimedQuest(task)) return 0;
  const duration = (task.durationMinutes || 0) * 60_000;
  if (!task.startedAt) return duration;
  const started = Date.parse(task.startedAt);
  if (!Number.isFinite(started)) return duration;
  return Math.max(0, duration - Math.max(0, now - started));
}

export function questTimerText(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
