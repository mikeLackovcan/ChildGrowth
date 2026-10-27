import { normalizeOutfits } from './fighterOutfits';
import type { Task } from '../store/useAppStore';
import { localDay, questOnDay } from './questDay';
import { restorePrizePool } from '../constants/prizes';

// Explicit allowlist: persisted data must never replace store actions or identity.
export function restoredAccount(profile: any, data: any, identity: { uid: string; email: string; name: string; nickname: string; role: 'child' | 'parent' }) {
  const today = localDay();
  const day = data.lastActiveDate || today;
  const normalizeTasks = (tasks: Task[] = []) => tasks.map(task => questOnDay(task, today));
  return {
    familyVerifiedUid: data.familyVerifiedUid || null, familyReconnectTags: data.familyReconnectTags || [],
    syncError: null, syncIssueCount: 0, recoveryRequests: data.recoveryRequests || [],
    userId: identity.uid, userEmail: identity.email, fullName: profile.full_name || identity.name,
    nickname: profile.nickname || identity.nickname, role: profile.role === 'parent' || profile.role === 'child' ? profile.role : identity.role,
    coins: profile.coins ?? 0, xp: profile.xp ?? 0, level: profile.level ?? 1,
    fighterOutfits: normalizeOutfits(data.fighterOutfits),
    currentAvatar: profile.current_avatar && !['default', 'questblox_hero'].includes(profile.current_avatar) ? profile.current_avatar : 'roblox_noob',
    tasks: normalizeTasks(data.tasks || []), prizes: restorePrizePool(data.prizes), wonPrizes: data.won_prizes || [],
    unlockedAvatars: [...new Set(['roblox_noob', ...(data.unlocked_avatars || []).filter((id: string) => !['default', 'questblox_hero'].includes(id))])],
    children: (data.children || []).map((child: any) => ({ ...child, tasks: normalizeTasks(child.tasks) })),
    selectedChildId: null, linkedParents: data.linked_parents || [], parentEmail: data.parent_email || null,
    pendingInvitation: data.pending_invitation || null,
    approvalStatus: data.approval_status || null, lastActiveDate: today,
    lastSpinDate: data.lastSpinDate || null, epicClaimedDate: day === today ? data.epicClaimedDate || null : null,
    dailyChestClaimedDate: day === today ? data.dailyChestClaimedDate || null : null,
    superchargedTaskId: day === today ? data.superchargedTaskId || null : null,
    dailyMood: day === today ? data.dailyMood || null : null,
    isSick: !!data.isSick, streak: data.streak || 1,
    activeTheme: data.activeTheme || 'classic', unlockedThemes: data.unlockedThemes || ['classic'],
    epicBossTask: data.epicBossTask || '30-min deep focus block 🧠', epicBossXP: data.epicBossXP ?? 35,
  };
}

export function canManageQuest(task: Pick<Task, 'ownerRole'>, role: string | null, linkedParents: string[]) {
  return role === 'parent' || (task.ownerRole === 'child') || (!task.ownerRole && linkedParents.length === 0);
}
