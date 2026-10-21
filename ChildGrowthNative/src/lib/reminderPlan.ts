import type { Task } from '../store/useAppStore';
import { isQuestDue, localDateKey } from './questSchedule';

/** Keep the nearest reminders within the OS queue budget; refresh on app activity. */
export function reminderPlan(tasks: Task[], now = new Date()) {
  const plan: { task: Task; date: Date }[] = [];
  for (let day = 0; day < 14; day++) {
    for (const task of tasks) {
      if (!task.reminderEnabled || !/^\d{1,2}:\d{2}$/.test(task.reminderTime || '')) continue;
      if (task.pendingApproval) continue;
      const [hour, minute] = task.reminderTime!.split(':').map(Number);
      if (hour > 23 || minute > 59) continue;
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      date.setHours(hour, minute, 0, 0);
      if (date <= now || !isQuestDue(task, date)) continue;
      if (localDateKey(date) === task.date && (task.done || task.pendingApproval)) continue;
      plan.push({ task, date });
    }
  }
  // Leave room for focus-end and snooze notifications on iOS.
  return plan.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 48);
}
