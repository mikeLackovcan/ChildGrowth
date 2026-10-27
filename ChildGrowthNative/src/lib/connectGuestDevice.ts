import { useAppStore } from '../store/useAppStore';
import { useWorldStore } from '../store/useWorldStore';
import { pairDevice, releaseDeviceLink } from './devicePairing';
import storage from './projectStorage';
import { localDateKey } from './questSchedule';
import { normalizeActivity } from './weeklyProgress';

let connecting = false;
function guestSnapshot() {
  const state = useAppStore.getState();
  const world = useWorldStore.getState();
  return JSON.parse(JSON.stringify({
    tasks: state.tasks, prizes: state.prizes, won_prizes: state.wonPrizes,
    coins: state.coins, total_earned: state.totalEarned, daily_earnings: state.dailyEarnings,
    activity_history: state.activityHistory, reward_goal: state.rewardGoal,
    xp: state.xp, level: state.level, current_avatar: state.currentAvatar,
    unlocked_avatars: state.unlockedAvatars, active_theme: state.activeTheme,
    unlocked_themes: state.unlockedThemes, active_background: state.activeBackground,
    unlocked_backgrounds: state.unlockedBackgrounds, last_spin_date: state.lastSpinDate,
    last_active_date: state.lastActiveDate, epicBossTask: state.epicBossTask, epicBossXP: state.epicBossXP,
    world: { spentPower: world.spentPower, placements: world.placements, updatedAt: world.updatedAt },
  }));
}

/** Adopt only confirmed cloud results; never replace local data on a failed pairing. */
export async function connectGuestDevice(code: string): Promise<void> {
  if (connecting) throw new Error('pair_busy');
  const starting = useAppStore.getState();
  if ((starting.userId !== 'guest-local' && starting.deviceConnection !== 'local') || starting.role !== 'child' || !starting.userId) {
    throw new Error('pair_use_child_device');
  }
  connecting = true;
  try {
    const identity = useAppStore.getState().nickname;
    await useAppStore.getState().saveMockState();
    await useWorldStore.getState().hydrate(starting.userId);
    const guest = guestSnapshot();
    const baseline = starting.deviceConnection === 'local'
      ? await storage.getItem('device_reconnect_baseline_' + starting.userId) : null;
    const resume = starting.deviceConnection === 'local'
      ? { childUid: starting.userId, baseline: baseline ? JSON.parse(baseline) : null } : undefined;
    const { profile, data } = await pairDevice(code, guest, resume);
    if (useAppStore.getState().userId !== starting.userId || useAppStore.getState().nickname !== identity) {
      throw new Error('pair_session_changed');
    }
    if (JSON.stringify(guestSnapshot()) !== JSON.stringify(guest)) {
      // A notification may have completed a task while the network request ran.
      // Keep both histories instead of replacing the newer local state.
      await releaseDeviceLink();
      throw new Error('pair_progress_conflict');
    }
    const nickname = profile.nickname || profile.full_name || 'champ';
    // Save the world under its new owner before switching the in-memory identity.
    if (data.world) await storage.setItem('world_' + profile.uid, JSON.stringify(data.world));
    const adopted = {
      deviceConnection: 'linked' as const,
      userId: profile.uid, userEmail: profile.uid + '@device.local', nickname,
      fullName: profile.full_name, role: 'child' as const, selectedChildId: null, children: [],
      linkedParents: [profile.parent_uid], parentEmail: profile.parent_uid, approvalStatus: 'approved' as const,
      tasks: data.tasks || [], prizes: data.prizes || [], wonPrizes: data.won_prizes || [],
      coins: data.coins || 0, totalEarned: data.total_earned ?? data.coins ?? 0,
      dailyEarnings: data.daily_earnings || { date: localDateKey(), coins: 0 },
      activityHistory: normalizeActivity(data.activity_history), rewardGoal: data.reward_goal || null,
      xp: data.xp || 0, level: data.level || 1,
      currentAvatar: data.current_avatar || 'default', unlockedAvatars: data.unlocked_avatars || ['default'],
      activeTheme: data.active_theme || 'classic', unlockedThemes: data.unlocked_themes || ['classic'],
      activeBackground: data.active_background || 'clean', unlockedBackgrounds: data.unlocked_backgrounds || ['clean'],
      lastSpinDate: data.last_spin_date || null, lastActiveDate: data.last_active_date || localDateKey(),
      epicBossTask: data.epicBossTask || '', epicBossXP: data.epicBossXP ?? 35,
    };
    const saved = JSON.stringify({ ...useAppStore.getState(), ...adopted });
    // Unlike the normal best-effort saver, these writes must succeed before reporting a connection.
    await storage.setItem('mockState_' + nickname, saved);
    await storage.setItem('active_user_tag', nickname);
    await storage.setItem('mockState', saved);
    useAppStore.setState(adopted);
    await useAppStore.getState().saveMockState();
    if (useWorldStore.getState().ownerKey === profile.uid) useWorldStore.setState({ hydrated: false });
    await useWorldStore.getState().hydrate(profile.uid);
  } finally { connecting = false; }
}
