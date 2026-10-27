import type { Task, WonPrize } from './progress';
export interface RecoveryClaim {
  coins: number; level: number; xp: number;
  unlockedAvatars: string[];
  tasks: Task[]; wonPrizes: WonPrize[];
  lastSpinDate: string | null; dailyChestClaimedDate: string | null; epicClaimedDate: string | null;
}
export type RecoveryRequest = { id: string; sourceId: string; submittedAt: string } & (
  { kind: 'snapshot'; claim: RecoveryClaim } |
  { kind: 'quest'; quest: { id: string; name: string; day: string; reward: import('../utils/avatarSkills').QuestRewardCalculation } }
);
// Strip identity, family permissions, functions and other unrelated cached data.
export function recoveryClaimFromSave(saved: Record<string, any>): RecoveryClaim {
  return {
    coins: saved.coins ?? 0, level: saved.level ?? 1, xp: saved.xp ?? 0,
    unlockedAvatars: saved.unlockedAvatars || ['roblox_noob'],
    tasks: (saved.tasks || []).map((task: Task) => ({ id: task.id, name: task.name, diff: task.diff, freq: task.freq,
      mystery: !!task.mystery, ...(task.icon ? { icon: task.icon } : {}), ...(task.shortName ? { shortName: task.shortName } : {}),
      ...(task.reminderMode ? { reminderMode: task.reminderMode } : {}),
      ...(task.reminderTime ? { reminderTime: task.reminderTime } : {}) })),
    wonPrizes: (saved.wonPrizes || []).map((prize: WonPrize) => ({ id: prize.id, prize: prize.prize, date: prize.date, redeemed: !!prize.redeemed })),
    lastSpinDate: saved.lastSpinDate || null, dailyChestClaimedDate: saved.dailyChestClaimedDate || null,
    epicClaimedDate: saved.epicClaimedDate || null,
  };
}
