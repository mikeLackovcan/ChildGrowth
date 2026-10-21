import type { Task } from '../store/useAppStore';
import { isQuestDue, localDateKey } from './questSchedule';

export type QuestReward = { xp: number; coins: number; message?: string };
export const DAILY_COINS = 100;
// Delayed parent reviews earn from the approval day's budget, even on a non-repeat day.
const eligible = (task: Task) => task.pendingApproval || isQuestDue(task);

/** Split the remaining daily budget; the ledger also remembers deleted quests. */
export function dailyCoinShare(tasks: Task[], taskId: string, earned?: number): number {
  const today = localDateKey();
  const task = tasks.find(item => item.id === taskId);
  if (!task || !eligible(task)) return 0;
  if (task.done && task.date === today) return task.rewardedCoins || 0;
  const completedCoins = earned ?? tasks
    .filter(item => item.done && item.date === today)
    .reduce((sum, item) => sum + (item.rewardedCoins || 0), 0);
  const available = Math.max(0, DAILY_COINS - completedCoins);
  const remaining = tasks.filter(item => eligible(item) && !(item.done && item.date === today));
  const index = remaining.findIndex(item => item.id === taskId);
  if (index < 0 || !remaining.length) return 0;
  return Math.floor(available / remaining.length) + (index < available % remaining.length ? 1 : 0);
}

/** Heroes are cosmetic: every child has the same daily earning opportunity. */
export function calculateQuestReward(task: Task, tasks: Task[], _heroId?: string, earned?: number): QuestReward {
  return {
    xp: task.diff === 'hard' ? 35 : task.diff === 'easy' ? 10 : 20,
    coins: dailyCoinShare(tasks, task.id, earned),
  };
}
