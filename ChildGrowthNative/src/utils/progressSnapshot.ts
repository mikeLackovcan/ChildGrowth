import { normalizeOutfits } from './fighterOutfits';
import type { Task, WonPrize } from '../types/progress';
import type { ThemeKey } from '../constants/theme';
import { localDay, questOnDay } from './questDay';
import { restorePrizePool } from '../constants/prizes';

// Only server progress fields may replace optimistic state. Never spread a
// remote document into the Zustand store: identity and actions stay separate.
export function progressSnapshot(profile: Record<string, any>, data: Record<string, any>) {
  return {
    recoveryRequests: (data.recoveryRequests || []) as import('../types/recovery').RecoveryRequest[],
    coins: profile.coins ?? 0, xp: profile.xp ?? 0, level: profile.level ?? 1,
    fighterOutfits: normalizeOutfits(data.fighterOutfits),
    currentAvatar: profile.current_avatar || 'roblox_noob',
    tasks: ((data.tasks || []) as Task[]).map(task => questOnDay(task, localDay())),
    prizes: restorePrizePool(data.prizes), wonPrizes: (data.won_prizes || []) as WonPrize[],
    unlockedAvatars: [...new Set<string>(['roblox_noob', ...(data.unlocked_avatars || [])])],
    epicBossTask: data.epicBossTask || 'habit_focus', epicBossXP: data.epicBossXP ?? 35,
    lastActiveDate: data.lastActiveDate || localDay(), lastSpinDate: data.lastSpinDate || null,
    epicClaimedDate: data.epicClaimedDate || null, dailyChestClaimedDate: data.dailyChestClaimedDate || null,
    superchargedTaskId: data.superchargedTaskId || null, dailyMood: data.dailyMood || null,
    isSick: !!data.isSick, streak: data.streak || 1,
    activeTheme: (data.activeTheme || 'classic') as ThemeKey,
    unlockedThemes: (data.unlockedThemes || ['classic']) as ThemeKey[],
  };
}
