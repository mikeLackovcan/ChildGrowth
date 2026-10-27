import type { Task } from '../types/progress';

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// A submitted quest belongs to the day it was completed. Keep that submission
// until a parent reviews it, even across restarts and multiple midnights.
export function questOnDay(task: Task, day: string): Task {
  if (task.date >= day || task.pendingApproval) return task;
  return { ...task, date: day, done: false, pendingApproval: false,
    pendingReward: undefined, pendingSubmissionId: undefined, verificationNote: undefined, awardedReward: undefined,
    startedAt: undefined, helpRequested: false,
    postponedUntil: task.postponedUntil && task.postponedUntil > day ? task.postponedUntil : undefined };
}

export function reviewedQuest(task: Task, approved: boolean, reward: NonNullable<Task['awardedReward']>, day: string, time = Date.now()): Task {
  const reviewed = { ...task, pendingApproval: false, pendingReward: undefined, pendingSubmissionId: undefined,
    lastReview: { day: task.date, approved, at: time },
    done: approved, awardedReward: approved ? reward : undefined, helpRequested: false };
  // Credit the previous submission, but leave today's recurring quest undone.
  return questOnDay(reviewed, day);
}

export function tasksForDay(tasks: Task[], date = new Date()): Task[] {
  const day = localDay(date);
  const weekday = date.getDay();
  const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return tasks.filter(task => {
    if (task.postponedUntil) return task.postponedUntil <= day;
    if (task.isRolling) return true;
    return task.freq === 'daily' || task.freq === names[weekday] ||
      (task.freq === 'weekdays' && weekday > 0 && weekday < 6) ||
      (task.freq === 'weekends' && (weekday === 0 || weekday === 6));
  });
}

export function canSpin(tasks: Task[], epicDate: string | null, spinDate: string | null, date = new Date()): boolean {
  const today = localDay(date);
  return spinDate !== today && epicDate === today && tasksForDay(tasks, date).every(t => t.done && !t.pendingApproval);
}

export function taskBaseReward(task: Task): number {
  return (task.diff === 'hard' ? 35 : task.diff === 'med' ? 20 : 10) + (task.mystery ? 10 : 0);
}
