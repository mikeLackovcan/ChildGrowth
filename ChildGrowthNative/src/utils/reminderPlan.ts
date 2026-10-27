import type { Task } from '../store/useAppStore';
import { localDay, tasksForDay } from './questDay';

export const validReminderTime = (value: string) => /^(0[7-9]|1[0-9]):[0-5][0-9]$/.test(value);
export interface ReminderSlot { at: number; taskIds: string[] }
// One alert per time slot, at most 60 pending alerts (also fits iOS's limit).
export function reminderPlan(tasks: Task[], time: string, lastActiveDate: string | null, isSick: boolean, now = new Date()): ReminderSlot[] {
  if (isSick || !validReminderTime(time)) return [];
  const slots: ReminderSlot[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now); day.setDate(day.getDate() + offset);
    const grouped = new Map<number, string[]>();
    for (const task of tasksForDay(tasks, day)) {
      if (task.pendingApproval || (offset === 0 && lastActiveDate === localDay(now) && task.done)) continue;
      const clock = validReminderTime(task.reminderTime || '') ? task.reminderTime! : time;
      const [hour, minute] = clock.split(':').map(Number);
      const at = new Date(day); at.setHours(hour, minute, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      const ids = grouped.get(at.getTime()) || []; ids.push(task.id); grouped.set(at.getTime(), ids);
    }
    for (const [at, taskIds] of grouped) slots.push({ at, taskIds });
  }
  return slots.sort((a, b) => a.at - b.at).slice(0, 60);
}
