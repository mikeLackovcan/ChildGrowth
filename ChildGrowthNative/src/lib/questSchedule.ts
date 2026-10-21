import type { Task } from '../store/useAppStore';

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isQuestDue(task: Pick<Task, 'freq'>, date = new Date()): boolean {
  const day = date.getDay();
  if (task.freq === 'daily') return true;
  if (task.freq === 'weekdays') return day > 0 && day < 6;
  if (task.freq === 'weekends') return day === 0 || day === 6;
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day] === task.freq;
}

export function isQuestLater(task: Task, date = new Date()): boolean {
  if (!task.reminderEnabled || !task.reminderTime || task.activeFocusStartedAt) return false;
  const [hour, minute] = task.reminderTime.split(':').map(Number);
  return hour * 60 + minute > date.getHours() * 60 + date.getMinutes();
}

export function freshTaskDay(task: Task, date = localDateKey()): Task {
  if (task.date === date) return task;
  return { ...task, date, done: false, pendingApproval: Boolean(task.pendingApproval), rewardedCoins: 0, rewardedXP: 0,
    activeFocusStartedAt: undefined, focusNotificationId: undefined };
}
