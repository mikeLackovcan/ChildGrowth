import { normalizeOutfits, validOutfit, FighterOutfits } from '../utils/fighterOutfits';
import { preserveFamilyCache } from '../lib/progressRecovery';
import { familyCacheState } from '../utils/familyCache';
import type { RecoveryClaim, RecoveryRequest } from '../types/recovery';
import { enqueueProgress, flushProgress, hasQueuedProgress, progressBusy, progressGeneration, takeProgressResult, readProgressIssues, ProgressFlush, ProgressOperation } from '../lib/progressQueue';
import { progressSnapshot } from '../utils/progressSnapshot';
import { familyAction, readFamilyStatus } from '../lib/familyAccounts';
import { readCloudState, hasSavedCloudEdits } from '../lib/cloudState';
import { restoreAuthenticatedAccount, accountDocumentId } from '../lib/accountSession';
import { changeAccountNickname } from '../lib/accountProfile';
import { canManageQuest } from '../utils/accountState';
// App global state store
import { create, UseBoundStore, StoreApi } from 'zustand';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut, sendSignInLinkToEmail, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { playSound } from '../lib/sound';
import { ThemeKey, WORLD_THEMES } from '../constants/theme';
import { calculateQuestReward, getAvatarSkillConfig, AVATAR_SKILL_CONFIGS, QuestRewardCalculation } from '../utils/avatarSkills';
import { DEFAULT_PRIZES, restorePrizePool } from '../constants/prizes';
export { DEFAULT_PRIZES } from '../constants/prizes';

import { localDay, tasksForDay, canSpin, taskBaseReward, questOnDay, reviewedQuest } from '../utils/questDay';

export const DEFAULT_STARTER_TASKS: Task[] = [
  { id: 'starter_1', name: 'habit_brush_teeth', icon: '🪥', done: false, diff: 'easy', freq: 'daily', mystery: false, date: localDay() },
  { id: 'starter_2', name: 'habit_cleaning', icon: '🧹', done: false, diff: 'easy', freq: 'daily', mystery: true, date: localDay(), isRolling: true, canPostpone: true },
  { id: 'starter_3', name: 'habit_reading', icon: '📚', done: false, diff: 'med', freq: 'weekdays', mystery: false, date: localDay(), canPostpone: true },
];


export type UserRole = 'parent' | 'child' | null;

import type { Task, WonPrize, ChildProfile } from '../types/progress';
export type { Task, WonPrize, ChildProfile } from '../types/progress';

interface AppState {
  familyReconnectTags: string[];
  familyVerifiedUid: string | null;
  syncIssueCount: number;
  recoveryRequests: RecoveryRequest[];
  requestProgressRecovery: (sourceId: string, claim: RecoveryClaim, targetUid?: string) => Promise<boolean>;
  requestQuestRecovery: (operation: ProgressOperation) => Promise<boolean>;
  reviewProgressRecovery: (childId: string, id: string, approved: boolean) => Promise<boolean>;
  syncError: string | null;
  userEmail: string | null;
  userId: string | null;
  fullName: string | null;
  nickname: string | null;
  role: UserRole;
  isSick: boolean;
  xp: number;
  level: number;
  streak: number;
  epicClaimedDate: string | null;
  dailyChestClaimedDate: string | null;
  superchargedTaskId: string | null;
  tasks: Task[];
  prizes: string[];
  wonPrizes: WonPrize[];
  coins: number;
  unlockedAvatars: string[];
  currentAvatar: string;
  fighterOutfits: FighterOutfits;
  setFighterOutfit: (fighter: string, outfit: string) => Promise<boolean>;
  activeTheme: ThemeKey;
  unlockedThemes: ThemeKey[];
  lastSpinDate: string | null;
  parentEmail: string | null;
  pendingInvitation: { name: string; nickname: string; sentByMe: boolean } | null;
  linkedParents: string[];
  children: ChildProfile[];
  selectedChildId: string | null;
  approvalStatus: 'pending' | 'approved' | null;
  dailyMood: 'wiped' | 'thriving' | 'too_easy' | null;
  language: 'en' | 'cs' | 'es' | 'de';
  lastActiveDate: string | null;
  epicBossTask: string;
  epicBossXP: number;
  
  logout: () => Promise<void>;
  setUser: (email: string | null, role: UserRole, fullName?: string, nickname?: string, id?: string) => void;
  updateAccountNickname: (nickname: string) => Promise<{ success: boolean; message?: string }>;
  continueAsGuest: () => Promise<void>;
  setSick: (sick: boolean) => void;
  addXP: (amount: number, coinAmount?: number) => void;
  addTask: (task: Omit<Task, 'id' | 'done' | 'date'>) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>, expectedRevision?: string | number) => boolean;
  startQuest: (id: string) => void;
  requestQuestHelp: (id: string) => void;
  toggleTaskDone: (id: string, forceCritical?: boolean) => QuestRewardCalculation | null;
  postponeTask: (taskId: string, targetDateStr?: string) => void;
  unpostponeTask: (taskId: string) => void;
  claimEpicBoss: () => QuestRewardCalculation | null;
  claimDailyLoginChest: () => Promise<{ coins: number; xp: number } | null>;
  setSuperchargedTask: (taskId: string | null) => void;
  resetTasksForNewDay: () => void;
  deleteAllTasks: () => void;
  setPrizes: (prizes: string[]) => void;
  addWonPrize: (prize: string) => void;
  spinPrize: () => Promise<WonPrize | null>;
  requestPrize: (id: string) => void;
  approvePrize: (childId: string, id: string) => void;
  togglePrizeRedeemed: (prizeIdOrIndex: string | number) => void;
  setEpicBossTask: (taskName: string, xpReward?: number) => void;
  
  buyAvatar: (avatarId: string) => Promise<boolean>;
  setCurrentAvatar: (avatarId: string) => Promise<boolean>;
  unlockTheme: (themeKey: ThemeKey, price: number) => Promise<boolean>;
  setActiveTheme: (themeKey: ThemeKey) => Promise<boolean>;
  submitTaskForApproval: (taskId: string, note?: string) => void;
  verifyChildTask: (childId: string, taskId: string, approved: boolean) => Promise<boolean>;
  
  setParentEmail: (email: string) => void;
  setApprovalStatus: (status: 'pending' | 'approved' | null) => void;
  sendParentInvite: (parentEmail: string) => Promise<boolean>;
  acceptParentInvite: (parentTag?: string) => Promise<boolean>;
  denyParentInvite: (parentTag?: string) => Promise<boolean>;
  approveChildByParent: (childId: string) => Promise<boolean>;
  
  // Multi-Child & Multi-Parent Actions
  addChildByNickname: (nickname: string, name?: string) => Promise<boolean>;
  removeChild: (childId: string) => Promise<boolean>;
  removeParent: (parentNickname: string) => Promise<boolean>;
  selectChild: (childId: string) => void;

  setDailyMood: (mood: 'wiped' | 'thriving' | 'too_easy' | null) => void;
  setLanguage: (lang: 'en' | 'cs' | 'es' | 'de') => void;
  
  // Auth & Server Persistence
  registerWithEmail: (email: string, pass: string, fullName: string, nickname: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  signInWithGoogle: (idToken: string, accessToken: string | undefined, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; message?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  syncToServer: () => Promise<void>;
  retryFamilySync: () => Promise<void>;
  
  loadMockState: () => Promise<void>;
  saveMockState: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

function progressTarget(state: AppState) {
  return state.role === 'parent' && state.selectedChildId ? state.selectedChildId : state.userId;
}
function recordProgress(action: string, payload: Record<string, unknown> = {}, target?: string): boolean {
  const state = useAppStore.getState();
  if (!state.userId || state.userId === 'guest-local') return true;
  const uid = state.userId, targetUid = target || progressTarget(state);
  if (auth.currentUser?.uid !== uid || !targetUid) {
    useAppStore.setState({ syncError: 'auth_retry' }); return false;
  }
  void enqueueProgress(uid, targetUid, action, payload).catch(() => {
    if (useAppStore.getState().userId === uid) useAppStore.setState({ syncError: 'progress_storage_retry' });
  });
  return true;
}
function reconcileProgress(uid: string, flushed: ProgressFlush) {
  const state = useAppStore.getState();
  if (state.userId !== uid || auth.currentUser?.uid !== uid || progressGeneration(uid) !== flushed.generation) return;
  const own = flushed.snapshots[uid];
  const children = state.children.map(child => {
    const snapshot = flushed.snapshots[child.id];
    return snapshot ? { ...child, ...progressSnapshot(snapshot.profile, snapshot.data) } : child;
  });
  const selected = state.role === 'parent' && state.selectedChildId ? flushed.snapshots[state.selectedChildId] : own;
  useAppStore.setState({ children, ...(selected ? progressSnapshot(selected.profile, selected.data) : {}), syncError: null });
}
async function serverReward(action: string, payload: Record<string, unknown> = {}, target?: string): Promise<any | null> {
  const state = useAppStore.getState(), uid = state.userId, targetUid = target || progressTarget(state);
  if (!uid || !targetUid || auth.currentUser?.uid !== uid) return null;
  try {
    const operation = await enqueueProgress(uid, targetUid, action, payload);
    await useAppStore.getState().syncToServer();
    if (useAppStore.getState().userId !== uid || auth.currentUser?.uid !== uid || (!target && progressTarget(useAppStore.getState()) !== targetUid)) return null;
    if (useAppStore.getState().syncError) return null;
    return takeProgressResult(uid, operation.requestId) ?? null;
  } catch {
    if (useAppStore.getState().userId === uid) useAppStore.setState({ syncError: 'family_sync_retry' });
    return null;
  }
}

export const useAppStore: UseBoundStore<StoreApi<AppState>> = create<AppState>((set, get) => ({
  fighterOutfits: {},
  familyVerifiedUid: null, familyReconnectTags: [], syncIssueCount: 0,
  recoveryRequests: [],
  requestProgressRecovery: async (sourceId, claim, targetUid) => !!await serverReward('recovery.request', { sourceId, claim }, targetUid),
  requestQuestRecovery: async operation => !!await serverReward('recovery.quest', { original: operation }, operation.targetUid),
  reviewProgressRecovery: async (childId, id, approved) => !!await serverReward('recovery.review', { id, approved }, childId),
  syncError: null,
  userEmail: null,
  userId: null,
  fullName: null,
  nickname: null,
  role: null,
  isSick: false,
  language: 'en',
  lastActiveDate: localDay(),
  xp: 0,
  level: 1,
  streak: 1,
  epicClaimedDate: null,
  dailyChestClaimedDate: null,
  superchargedTaskId: null,
  tasks: [], // Kids start with 0 quests first time (auto-hydrates starter quests on interaction)
  prizes: [...DEFAULT_PRIZES],
  wonPrizes: [],
  coins: 0,
  unlockedAvatars: ['roblox_noob'],
  currentAvatar: 'roblox_noob',
  activeTheme: 'classic',
  unlockedThemes: ['classic'],
  lastSpinDate: null,
  parentEmail: null,
  pendingInvitation: null,
  linkedParents: [],
  children: [],
  selectedChildId: null,
  approvalStatus: null,
  dailyMood: null,
  epicBossTask: '30-min deep focus block 🧠',
  epicBossXP: 35,
  
  logout: async () => {
    const state = get(), language = state.language;
    const tag = (state.nickname || state.userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    if (tag) {
      try { await AsyncStorage.setItem(`mockState_${tag}`, JSON.stringify(state)); } catch { /* Outbox remains separate. */ }
    }
    try { await (await import('../lib/pushDevices')).retireFamilyPushDevice(); } catch { /* Offline logout remains possible. */ }
    try { await signOut(auth); } catch { set({ syncError: 'auth_retry' }); return; }
    await AsyncStorage.removeItem('active_user_tag');
    await AsyncStorage.removeItem('mockState');
    set({ ...useAppStore.getInitialState(), language });
  },
  setUser: (email, role, fullName, nickname, id) => {
    if (!email) { void get().logout(); return; }
    const cleanNick = (nickname || email.split('@')[0]).toLowerCase().replace(/^@/, '');
    set({ userEmail: email, role, fullName: fullName || email.split('@')[0], nickname: cleanNick, userId: id || null });
    void get().loadMockState();
    void get().saveMockState();
  },
  updateAccountNickname: async (nickname) => {
    const cleanNick = nickname.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_-]{3,24}$/.test(cleanNick) || cleanNick.startsWith('hero_')) {
      return { success: false, message: i18n.t('nickname_invalid_short') };
    }
    try {
      const updated = await changeAccountNickname(cleanNick);
      set({ nickname: updated });
      await get().saveMockState();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: i18n.t(error?.message?.includes('NICKNAME_TAKEN') ? 'auth_taken' : 'settings_failed') };
    }
  },
  continueAsGuest: async () => {
    // Restore before setting identity: loadMockState only hydrates a signed-out store.
    await AsyncStorage.setItem('active_user_tag', 'guest');
    set({ userEmail: null, nickname: null, userId: 'guest-local', role: null });
    await get().loadMockState();
    if (get().userEmail === 'guest@questblox.local') return;
    set({
      userEmail: 'guest@questblox.local', userId: 'guest-local',
      fullName: 'Guest Hero', nickname: 'guest', role: 'child',
      tasks: DEFAULT_STARTER_TASKS.map(task => ({ ...task, date: localDay() })),
    });
    await get().saveMockState();
  },
  setSick: (sick) => {
    if (!recordProgress('rest.set', { enabled: sick })) return;
    set({ isSick: sick });
    get().saveMockState();
  },
  addXP: (amount, coinAmount) => {
    const coinsDelta = typeof coinAmount === 'number' ? coinAmount : amount;
    let currentXp = get().xp + amount;
    let currentLevel = get().level;
    const initialLevel = currentLevel;
    let currentCoins = get().coins + coinsDelta; 
    while (currentXp >= 100) {
      currentLevel++;
      currentXp -= 100;
    }
    while (currentXp < 0 && currentLevel > 1) {
      currentLevel--;
      currentXp += 100;
    }
    if (currentLevel > initialLevel) {
      playSound('levelup');
    }
    set({ xp: Math.max(0, currentXp), level: currentLevel, coins: Math.max(0, currentCoins) });
    
    // Also sync updates to active selected child profile if parent
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, xp: Math.max(0, currentXp), level: currentLevel, coins: Math.max(0, currentCoins) } : c)
      });
    }

    get().saveMockState();
  },
  addTask: (task) => {
    const todayStr = localDay();
    const newTask: Task = {
      ...task,
      ownerRole: get().role === 'parent' ? 'parent' : 'child',
      ...(get().role === 'child' && get().linkedParents.length ? { requiresApproval: true, diff: 'easy' as const } : {}),
      id: Math.random().toString(36).substring(7),
      done: false,
      date: todayStr,
    };
    if (!recordProgress('task.create', newTask as unknown as Record<string, unknown>)) return;
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: [...c.tasks, newTask] } : c)
      });
    }
    
    get().saveMockState();
  },
  removeTask: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || !canManageQuest(task, get().role, get().linkedParents)) return;
    if (task.pendingApproval) return;
    if (!recordProgress('task.delete', { id, expectedRevision: task.revision ?? 0 })) return;
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: c.tasks.filter(t => t.id !== id) } : c)
      });
    }
    get().saveMockState();
  },
  updateTask: (id, updates, expectedRevision) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || !canManageQuest(task, get().role, get().linkedParents)) return false;
    if (expectedRevision !== undefined && expectedRevision !== (task.revision ?? 0)) return false;
    const revision = `edit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    if (get().role !== 'parent') {
      const { name, shortName, icon, reminderTime, reminderMode } = updates;
      updates = Object.fromEntries(Object.entries({ name, shortName, icon, reminderTime, reminderMode }).filter(([, value]) => value !== undefined));
    }
    if (!recordProgress('task.update', { id, changes: updates, nextRevision: revision, expectedRevision: task.revision ?? 0 })) return false;
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, revision, ...(state.role === 'parent' ? { ownerRole: 'parent' as const } : {}) } : t),
      children: state.role === 'parent' ? state.children.map(child => child.id === state.selectedChildId
        ? { ...child, tasks: child.tasks.map(t => t.id === id ? { ...t, ...updates, revision } : t) } : child) : state.children,
    }));
    get().saveMockState();
    return true;
  },
  startQuest: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || task.done || task.pendingApproval || get().isSick) return;
    if (!recordProgress('task.start', { id })) return;
    set({ tasks: get().tasks.map(t => t.id === id ? { ...t, startedAt: new Date().toISOString() } : t) });
    get().saveMockState();
  },
  requestQuestHelp: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || task.done) return;
    if (!recordProgress('task.help', { id })) return;
    set({ tasks: get().tasks.map(t => t.id === id ? { ...t, helpRequested: true } : t) });
    get().saveMockState();
  },
  toggleTaskDone: (id, forceCritical) => {
    const currentTasks = get().tasks;
    const task = currentTasks.find(t => t.id === id);
    if (!task || task.pendingApproval || get().isSick) return null;
    if (!tasksForDay(currentTasks).some(t => t.id === id)) return null;
    if (!task.done && task.requiresApproval && get().role !== 'parent') {
      get().submitTaskForApproval(id);
      return null;
    }
    // Completed quests stay completed; corrections belong in parent management.
    if (task.done && get().role !== 'parent') return null;
    const isNowDone = !task.done;
    if (!recordProgress(isNowDone ? 'task.complete' : 'task.undo', { id, expectedRevision: task.revision ?? 0 })) return null;

    // After spinning the prize wheel, kids cannot undo chores themselves
    const todayStr = localDay();
    const hasSpunToday = get().lastSpinDate === todayStr;
    const isParent = get().role === 'parent';
    if (task.done && !isNowDone && hasSpunToday && !isParent) {
      console.warn('🔒 Chores are locked after spinning: kids cannot undo chores');
      return null;
    }
    
    let baseXp = 10;
    if (task.diff === 'med') baseXp = 20;
    if (task.diff === 'hard') baseXp = 35;
    if (task.mystery) baseXp += 10;

    const completedCount = tasksForDay(currentTasks).filter(t => t.done && t.id !== id).length;
    const isSupercharged = get().superchargedTaskId === id;

    const reward = (!isNowDone && task.awardedReward) || calculateQuestReward(
      baseXp,
      task.diff,
      get().currentAvatar,
      isNowDone ? Boolean(task.mystery) : false,
      isNowDone ? completedCount : 0,
      isSupercharged
    );
    
    const updatedTasks = currentTasks.map((t) => (t.id === id ? { ...t, done: isNowDone, awardedReward: isNowDone ? reward : undefined } : t));
    set({ tasks: updatedTasks });
    
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: updatedTasks } : c)
      });
    }
    
    if (isNowDone) {
      get().addXP(reward.xpGain, reward.coinGain);
      return reward;
    } else {
      get().addXP(-reward.xpGain, -reward.coinGain);
      return null;
    }
  },
  postponeTask: (taskId: string, targetDateStr?: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const targetDate = targetDateStr || localDay(tomorrow);

    const currentTasks = get().tasks;
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || (get().role !== 'parent' && !task.canPostpone)) return;
    if (!recordProgress('task.postpone', { id: taskId, day: targetDate })) return;

    const updatedTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          postponedUntil: targetDate,
          originalDate: t.originalDate || t.date || localDay(),
        };
      }
      return t;
    });

    set({ tasks: updatedTasks });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: updatedTasks } : c)
      });
    }

    playSound('spin');
    get().saveMockState();
  },
  unpostponeTask: (taskId: string) => {
    const currentTasks = get().tasks;
    const task = currentTasks.find(task => task.id === taskId);
    if (!task || (get().role !== 'parent' && !task.canPostpone)) return;
    if (!recordProgress('task.restore', { id: taskId })) return;
    const updatedTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          postponedUntil: undefined,
        };
      }
      return t;
    });

    set({ tasks: updatedTasks });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: updatedTasks } : c)
      });
    }

    get().saveMockState();
  },
  claimEpicBoss: () => {
    const todayStr = localDay();
    if (get().epicClaimedDate === todayStr || get().isSick || !tasksForDay(get().tasks).every(t => t.done && !t.pendingApproval)) {
      return null;
    }
    if (!recordProgress('epic.claim')) return null;
    const baseBossXp = get().epicBossXP || 35;
    const completedTasksCount = tasksForDay(get().tasks).filter(t => t.done).length;
    const reward = calculateQuestReward(baseBossXp, 'boss', get().currentAvatar, false, completedTasksCount);
    set({ epicClaimedDate: todayStr });
    get().addXP(reward.xpGain, reward.coinGain);
    return reward;
  },
  claimDailyLoginChest: async () => {
    if (get().userId && get().userId !== 'guest-local') {
      const reward = await serverReward('chest.claim');
      if (!reward || typeof reward.coins !== 'number' || typeof reward.xp !== 'number') return null;
      playSound('coin'); return reward;
    }
    const todayStr = localDay();
    if (get().dailyChestClaimedDate === todayStr) {
      return null;
    }
    const currentStreak = get().streak || 1;
    // Base 25 coins + streak bonus + random mystery loot (Weinschenk #32 + Nahai Reciprocity)
    const randomBonus = Math.floor(Math.random() * 15);
    const coinsEarned = 25 + Math.min(40, currentStreak * 5) + randomBonus;
    const xpEarned = 20 + Math.min(20, currentStreak * 2);

    get().addXP(xpEarned, coinsEarned);
    set({ dailyChestClaimedDate: todayStr });
    playSound('coin');
    get().saveMockState();
    return { coins: coinsEarned, xp: xpEarned };
  },
  setSuperchargedTask: (taskId) => {
    if (!taskId || (get().superchargedTaskId && get().superchargedTaskId !== taskId)) return;
    if (!recordProgress('supercharge.set', { id: taskId })) return;
    set({ superchargedTaskId: taskId });
    get().saveMockState();
  },
  resetTasksForNewDay: () => {
    const todayStr = localDay();
    if (get().lastActiveDate === todayStr) return;
    if (!recordProgress('day.refresh')) return;
    const prevTasks = get().tasks;
    const hadCompletedYesterday = prevTasks.some((t) => t.done) || Boolean(get().epicClaimedDate);
    const hasShield = Boolean(getAvatarSkillConfig(get().currentAvatar).hasStreakShield) || get().isSick;
    const nextStreak = hadCompletedYesterday ? get().streak + 1 : (hasShield ? Math.max(1, get().streak) : 1);

    const resetTasksList = prevTasks.map(task => questOnDay(task, todayStr));
    
    set((state) => ({
      lastActiveDate: todayStr,
      dailyMood: null,
      epicClaimedDate: null,
      streak: nextStreak,
      tasks: resetTasksList,
      children: state.children.map(child => ({
        ...child,
        tasks: child.tasks.map(task => questOnDay(task, todayStr))
      }))
    }));
    get().saveMockState();
  },
  deleteAllTasks: () => {
    if (get().role !== 'parent' && get().linkedParents.length) return;
    if (get().tasks.some(task => task.pendingApproval)) return;
    if (!recordProgress('tasks.clear', { expectedTasks: get().tasks.map(task => ({ id: task.id, revision: task.revision ?? 0 })) })) return;
    set({ tasks: [] });
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: [] } : c)
      });
    }
    get().saveMockState();
  },
  setPrizes: (prizes) => {
    if (get().role !== 'parent' && get().linkedParents.length) return;
    if (!recordProgress('prizes.configure', { prizes })) return;
    set({ prizes, children: get().role === 'parent' ? get().children.map(c => c.id === get().selectedChildId ? { ...c, prizes } : c) : get().children });
    get().saveMockState();
  },
  spinPrize: async () => {
    if (get().userId && get().userId !== 'guest-local') return serverReward('prize.spin');
    const state = get();
    const pool = state.prizes.filter(p => p.trim());
    if (state.isSick || !pool.length || !canSpin(state.tasks, state.epicClaimedDate, state.lastSpinDate)) return null;
    get().addWonPrize(pool[Math.floor(Math.random() * pool.length)]);
    return get().wonPrizes[0];
  },
  addWonPrize: (prize) => {
    if (get().userId && get().userId !== 'guest-local') return; // Signed-in spins are server-owned.
    if (get().lastSpinDate === localDay()) return;
    const newWon: WonPrize = {
      id: Math.random().toString(36).substring(7),
      prize,
      date: new Date().toISOString(),
      redeemed: false,
    };
    const todayStr = localDay();
    const updatedWonPrizes = [newWon, ...get().wonPrizes];
    set({ wonPrizes: updatedWonPrizes, lastSpinDate: todayStr });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, wonPrizes: updatedWonPrizes } : c)
      });
    }
    get().saveMockState();
  },
  requestPrize: (id) => {
    if (!get().wonPrizes.some(prize => prize.id === id && !prize.redeemed && !prize.status)) return;
    if (!recordProgress('prize.request', { id })) return;
    set({ wonPrizes: get().wonPrizes.map(prize => prize.id === id && !prize.redeemed && !prize.status ? { ...prize, status: 'requested' } : prize) });
    get().saveMockState();
  },
  approvePrize: (childId, id) => {
    if (get().role !== 'parent') return;
    const child = get().children.find(c => c.id === childId && c.isApproved);
    if (!child || !child.wonPrizes.some(prize => prize.id === id && prize.status === 'requested')) return;
    if (!recordProgress('prize.approve', { id }, childId)) return;
    const wonPrizes = child.wonPrizes.map(prize => prize.id === id && prize.status === 'requested' ? { ...prize, status: 'approved' as const } : prize);
    set({ children: get().children.map(c => c.id === childId ? { ...c, wonPrizes } : c),
      ...(get().selectedChildId === childId ? { wonPrizes } : {}) });
    get().saveMockState();
  },
  togglePrizeRedeemed: (prizeIdOrIndex) => {
    const updatedWonPrizes = get().wonPrizes.map((p, idx) => {
      if (p.id === prizeIdOrIndex || idx === prizeIdOrIndex || String(idx) === String(prizeIdOrIndex)) {
        if (get().role !== 'parent' && get().linkedParents.length && p.status !== 'approved') return p;
        if (!recordProgress('prize.redeem', { id: p.id, redeemed: !p.redeemed })) return p;
        return { ...p, redeemed: !p.redeemed };
      }
      return p;
    });
    set({ wonPrizes: updatedWonPrizes });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, wonPrizes: updatedWonPrizes } : c)
      });
    }
    get().saveMockState();
  },
  
  setEpicBossTask: (taskName, xpReward) => {
    if (get().role !== 'parent' && get().linkedParents.length) return;
    const cleanTitle = taskName.trim() || '30-min deep focus block 🧠';
    const cleanXP = xpReward && xpReward > 0 ? xpReward : 35;
    if (!recordProgress('epic.configure', { name: cleanTitle, xp: cleanXP })) return;
    set({ epicBossTask: cleanTitle, epicBossXP: cleanXP });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, epicBossTask: cleanTitle, epicBossXP: cleanXP } : c)
      });
    }
    get().saveMockState();
  },
  
  setFighterOutfit: async (fighter, outfit) => {
    if (!validOutfit(fighter, outfit) || (fighter !== 'roblox_noob' && !get().unlockedAvatars.includes(fighter))) return false;
    if (get().userId && get().userId !== 'guest-local') return !!(await serverReward('outfit.equip', { fighter, outfit }))?.ok;
    set({ fighterOutfits: normalizeOutfits({ ...get().fighterOutfits, [fighter]: outfit }) });
    await get().saveMockState(); return true;
  },
  buyAvatar: async (avatarId) => {
    if (get().userId && get().userId !== 'guest-local') return !!(await serverReward('fighter.buy', { id: avatarId }))?.ok;
    const fighter = AVATAR_SKILL_CONFIGS.find(fighter => fighter.id === avatarId);
    if (!fighter) return false;
    const owned = get().unlockedAvatars.includes(avatarId);
    if (!owned && get().coins < fighter.price) return false;
    if (!recordProgress('fighter.buy', { id: avatarId })) return false;
    set({ coins: get().coins - (owned ? 0 : fighter.price),
      unlockedAvatars: owned ? get().unlockedAvatars : [...get().unlockedAvatars, avatarId], currentAvatar: avatarId });
    get().saveMockState(); return true;
  },
  setCurrentAvatar: async (avatarId) => {
    if (get().userId && get().userId !== 'guest-local') return !!(await serverReward('fighter.equip', { id: avatarId }))?.ok;
    if (!get().unlockedAvatars.includes(avatarId)) return false;
    if (!recordProgress('fighter.equip', { id: avatarId })) return false;
    set({ currentAvatar: avatarId });
    playSound('spin');
    get().saveMockState(); return true;
  },
  unlockTheme: async (themeKey: ThemeKey, price: number) => {
    if (get().userId && get().userId !== 'guest-local') return !!(await serverReward('theme.buy', { id: themeKey }))?.ok;
    const { unlockedThemes, coins } = get();
    const theme = WORLD_THEMES[themeKey];
    if (!theme) return false;
    price = theme.price;
    if (!unlockedThemes.includes(themeKey) && coins < price) return false;
    if (!recordProgress('theme.buy', { id: themeKey })) return false;
    if (unlockedThemes.includes(themeKey)) {
      set({ activeTheme: themeKey });
      get().saveMockState();
      return true;
    }
    if (coins >= price) {
      const updated = [...unlockedThemes, themeKey];
      set({ coins: coins - price, unlockedThemes: updated, activeTheme: themeKey });
      playSound('unlock');
      get().saveMockState();
      return true;
    }
    return false;
  },
  setActiveTheme: async (themeKey: ThemeKey) => {
    if (get().userId && get().userId !== 'guest-local') return !!(await serverReward('theme.equip', { id: themeKey }))?.ok;
    if (get().unlockedThemes.includes(themeKey)) {
      if (!recordProgress('theme.equip', { id: themeKey })) return false;
      set({ activeTheme: themeKey });
      playSound('spin');
      get().saveMockState(); return true;
    }
    return false;
  },
  submitTaskForApproval: (taskId: string, note?: string) => {
    const target = get().tasks.find(t => t.id === taskId);
    if (!target || target.done || target.pendingApproval) return;
    const pendingSubmissionId = `submission-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    if (!recordProgress('task.submit', { id: taskId, expectedRevision: target.revision ?? 0, submissionId: pendingSubmissionId, ...(note ? { note } : {}) })) return;
    const pendingReward = calculateQuestReward(taskBaseReward(target), target.diff, get().currentAvatar,
      Boolean(target.mystery), tasksForDay(get().tasks).filter(t => t.done).length, get().superchargedTaskId === taskId);
    const updatedTasks = get().tasks.map(t => t.id === taskId ? { ...t, pendingApproval: true, pendingReward, pendingSubmissionId, lastReview: undefined, verificationNote: note || undefined } : t);
    set({ tasks: updatedTasks });
    playSound('spin');
    
    get().saveMockState();
  },
  verifyChildTask: async (childId: string, taskId: string, approved: boolean) => {
    const uid = get().userId;
    if (get().role !== 'parent') return false;
    const child = get().children.find(c => c.id === childId);
    const task = child?.tasks.find(t => t.id === taskId);
    if (!child || !task || task.done || !task.pendingApproval) return false;
    if (!recordProgress('task.review', { id: taskId, approved, ...(task.pendingSubmissionId ? { submissionId: task.pendingSubmissionId } : {}) }, childId)) return false;
    const reward = task.pendingReward || calculateQuestReward(taskBaseReward(task), task.diff, child.currentAvatar,
      Boolean(task.mystery), tasksForDay(child.tasks).filter(t => t.done).length);
    const totalXP = child.xp + (approved ? reward.xpGain : 0);
    const updated = {
      ...child,
      tasks: child.tasks.map(t => t.id === taskId ? reviewedQuest(t, approved, reward, localDay()) : t),
      xp: totalXP % 100,
      level: child.level + Math.floor(totalXP / 100),
      coins: child.coins + (approved ? reward.coinGain : 0),
    };
    set({ children: get().children.map(c => c.id === childId ? updated : c),
      ...(get().selectedChildId === childId ? { tasks: updated.tasks, xp: updated.xp, level: updated.level, coins: updated.coins } : {}) });
    await get().saveMockState();
    return get().userId === uid && !get().syncError;
  },
  
  setParentEmail: (email) => {
    set({ parentEmail: email, approvalStatus: 'pending' });
    get().saveMockState();
  },
  setApprovalStatus: (status) => {
    set({ approvalStatus: status });
    get().saveMockState();
  },
  sendParentInvite: async (parentEmail) => {
    try {
      await familyAction(parentEmail, 'invite');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  acceptParentInvite: async (parentTag) => {
    try {
      await familyAction(parentTag || get().parentEmail || '', 'accept');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  denyParentInvite: async (parentTag) => {
    try {
      await familyAction(parentTag || get().parentEmail || '', 'decline');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  approveChildByParent: async (childId) => {
    try {
      await familyAction(get().children.find(c => c.id === childId)?.nickname || '', 'accept');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  addChildByNickname: async (nickname) => {
    try {
      await familyAction(nickname, 'invite');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  removeChild: async (childId) => {
    try {
      await familyAction(get().children.find(c => c.id === childId)?.nickname || '', 'unlink');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },
  removeParent: async (parentNickname) => {
    try {
      await familyAction(parentNickname, 'unlink');
      set({ syncError: null });
      await get().loadMockState();
      return true;
    } catch { set({ syncError: 'family_link_error' }); return false; }
  },

  selectChild: (childId: string) => {
    const child = get().children.find(c => c.id === childId);
    if (child) {
      set({
        selectedChildId: childId,
        recoveryRequests: child.recoveryRequests || [],
        currentAvatar: child.currentAvatar || 'roblox_noob',
        unlockedAvatars: child.unlockedAvatars || ['roblox_noob'],
        isSick: child.isSick || false, streak: child.streak || 1,
        lastActiveDate: child.lastActiveDate || localDay(), lastSpinDate: child.lastSpinDate || null,
        epicClaimedDate: child.epicClaimedDate || null, dailyChestClaimedDate: child.dailyChestClaimedDate || null,
        superchargedTaskId: child.superchargedTaskId || null, dailyMood: child.dailyMood || null,
        fighterOutfits: normalizeOutfits(child.fighterOutfits), activeTheme: child.activeTheme || 'classic', unlockedThemes: child.unlockedThemes || ['classic'],
        tasks: child.tasks || [],
        wonPrizes: child.wonPrizes || [],
        prizes: child.prizes || [],
        coins: child.coins || 0,
        level: child.level || 1,
        xp: child.xp || 0,
        epicBossTask: child.epicBossTask || get().epicBossTask || '30-min deep focus block 🧠',
        epicBossXP: child.epicBossXP || get().epicBossXP || 35,
      });
    }
  },
  setDailyMood: (mood) => {
    if (!recordProgress('mood.set', { mood })) return;
    set({ dailyMood: mood });
    get().saveMockState();
  },
  setLanguage: (lang) => {
    set({ language: lang });
    i18n.changeLanguage(lang);
    AsyncStorage.setItem('user_language', lang).catch((e) => console.warn('Failed to save user_language', e));
    get().saveMockState();
  },

  // Auth & Server Methods
  registerWithEmail: async (email, password, fullName, nickname, role) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = nickname.trim().toLowerCase().replace(/^@/, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !/^[a-z0-9_-]{3,24}$/.test(cleanNick)) {
      return { success: false, message: i18n.t('auth_invalid_fields') };
    }
    try {
      const credential = auth.currentUser?.email?.toLowerCase() === cleanEmail
        ? { user: auth.currentUser } : await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(credential.user, { displayName: fullName.trim() });
      const restored = await restoreAuthenticatedAccount(credential.user, role || 'child', cleanNick);
      set(restored);
      await get().saveMockState();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: i18n.t(error?.message === 'NICKNAME_TAKEN' ? 'auth_taken' : 'auth_register_retry') };
    }
  },

  loginWithEmail: async (email, password) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // Restore all progress before exposing identity to routing or writing anything.
      const restored = await restoreAuthenticatedAccount(credential.user);
      set(restored);
      if (restored.role === 'parent' && restored.children.length) get().selectChild(restored.children[0].id);
      await get().saveMockState();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error?.code === 'auth/invalid-credential' ? i18n.t('auth_credentials') : i18n.t('auth_retry') };
    }
  },

  signInWithGoogle: async (idToken, accessToken, role) => {
    if (!idToken) return { success: false, message: i18n.t('auth_retry') };
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      const restored = await restoreAuthenticatedAccount(result.user, role || 'child');
      if (role && restored.role !== role) {
        await signOut(auth);
        return {
          success: false,
          message: i18n.t(role === 'parent' ? 'auth_google_is_child' : 'auth_google_is_parent'),
        };
      }
      set(restored);
      if (restored.role === 'parent' && restored.children.length) get().selectChild(restored.children[0].id);
      await get().saveMockState();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: i18n.t('auth_retry') };
    }
  },

  sendMagicLink: async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://questblox-10c14.firebaseapp.com';
      await sendSignInLinkToEmail(auth, email, {
        url: redirectUrl,
        handleCodeInApp: true
      });
      return { success: true, message: i18n.t('auth_email_sent') };
    } catch (err: any) {
      return { success: false, message: i18n.t('auth_email_retry') };
    }
  },

  sendPasswordReset: async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://questblox-10c14.firebaseapp.com';
      await sendPasswordResetEmail(auth, email, {
        url: redirectUrl
      });
      return { success: true, message: i18n.t('auth_reset_sent') };
    } catch (err: any) {
      return { success: false, message: i18n.t('auth_email_retry') };
    }
  },

  retryFamilySync: async () => {
    set({ syncError: null });
    await get().syncToServer();
    if (!get().syncError) await get().loadMockState();
  },
  syncToServer: async () => {
    const { userId: uid } = get();
    if (!uid || uid === 'guest-local' || auth.currentUser?.uid !== uid) return;
    try {
      // Old snapshot saves cannot be replayed as trusted currency operations.
      // Keep their local backup intact until explicit recovery is resolved.
      const pendingReviews = await readProgressIssues(uid);
      if (get().userId !== uid || auth.currentUser?.uid !== uid) return;
      set({ syncIssueCount: pendingReviews.filter(issue => !issue.archivedAt).length });
      if (await hasSavedCloudEdits(uid)) {
        if (get().userId === uid) set({ syncError: 'progress_legacy_pending' });
        return;
      }
      const flushed = await flushProgress(uid);
      reconcileProgress(uid, flushed);
      const issues = await readProgressIssues(uid);
      if (get().userId !== uid || auth.currentUser?.uid !== uid) return;
      set({ syncIssueCount: issues.filter(issue => !issue.archivedAt).length });
      if (flushed.needsRefresh && progressGeneration(uid) === flushed.generation) await get().loadMockState();
      if (get().userId !== uid || auth.currentUser?.uid !== uid) return;
      const state = get(), tag = (state.nickname || state.userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
      if (tag) await AsyncStorage.setItem(`mockState_${tag}`, JSON.stringify(state));
    } catch (error: any) {
      if (get().userId === uid && auth.currentUser?.uid === uid) set({ syncError: String(error?.message).includes('PROGRESS_DAY_CHANGED') ? 'progress_day_changed' : 'family_sync_retry' });
    }
  },

  loadMockState: async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user_language');
      const activeTag = await AsyncStorage.getItem('active_user_tag');
      const currentNick = (get().nickname || get().userEmail?.split('@')[0] || activeTag || '').toLowerCase().replace(/^@/, '');
      
      let lang: 'en' | 'cs' | 'es' | 'de' = 'en';
      if (savedLang === 'cs' || savedLang === 'en' || savedLang === 'es' || savedLang === 'de') {
        lang = savedLang;
      }

      if (!currentNick && !activeTag && !get().userEmail) {
        i18n.changeLanguage(lang);
        set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
        return;
      }

      // ONLY read from AsyncStorage on initial boot/mount when user is not loaded in memory!
      // This prevents 1.5s polling intervals from constantly resetting memory state with stale serialized disk data!
      const isInitialMount = !get().userEmail && !get().nickname;
      if (isInitialMount) {
        let data = currentNick ? await AsyncStorage.getItem(`mockState_${currentNick}`) : null;
        if (!data && activeTag) {
          data = await AsyncStorage.getItem(`mockState_${activeTag}`);
        }
        if (!data) {
          data = await AsyncStorage.getItem('mockState');
        }
        const todayStr = localDay();

        if (data) {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.userEmail) {
              set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
              return;
            }
            if (!savedLang && (parsed.language === 'cs' || parsed.language === 'en' || parsed.language === 'es' || parsed.language === 'de')) {
              lang = parsed.language;
            }
            if (parsed.userId !== 'guest-local') {
              await auth.authStateReady();
              if (!auth.currentUser || auth.currentUser.uid !== parsed.userId) {
                set({ userEmail: null, userId: null, nickname: null, fullName: null, role: null });
                return;
              }
            }
            if (parsed.userId !== 'guest-local') {
              try { await Promise.all([readCloudState('profiles', parsed.userId), readCloudState('user_data', parsed.userId)]); } catch { set({ syncError: 'family_sync_retry' }); }
              if (await hasSavedCloudEdits(parsed.userId) || await hasQueuedProgress(parsed.userId)) set({ syncError: 'family_sync_retry' });
            }
            let familyCache: ReturnType<typeof familyCacheState> | null = null;
            if (parsed.userId !== 'guest-local') {
              if (parsed.familyVerifiedUid !== parsed.userId && ((parsed.children?.length || 0) > 0 || (parsed.linkedParents?.length || 0) > 0 || parsed.parentEmail)) {
                await preserveFamilyCache(parsed.userId, parsed);
              }
              if (auth.currentUser?.uid !== parsed.userId) throw Error('ACCOUNT_CHANGED');
              familyCache = familyCacheState(parsed, parsed.userId);
            }
            const rawTasks: Task[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
            const storedLastDate = parsed.lastActiveDate || null;
            const isNewDay = storedLastDate !== todayStr;

            const validTasks = isNewDay
              ? rawTasks.map(task => questOnDay(task, todayStr))
              : rawTasks;

            const rawChildren: ChildProfile[] = Array.isArray(parsed.children) ? parsed.children : [];
            const validChildren: ChildProfile[] = isNewDay
              ? rawChildren.map((c: any) => ({ ...c, tasks: c.tasks?.map((task: Task) => questOnDay(task, todayStr)) } as ChildProfile))
              : rawChildren;

            const rawWonPrizes = Array.isArray(parsed.wonPrizes) ? parsed.wonPrizes : [];
            const normalizedWonPrizes: WonPrize[] = rawWonPrizes.map((wp: any, idx: number) => ({
              id: wp.id || `won_${idx}_${Date.now()}`,
              prize: typeof wp === 'string' ? wp : (wp.prize || 'Prize 🎁'),
              date: wp.date || new Date().toISOString(),
              redeemed: Boolean(wp.redeemed),
              status: wp.status === 'requested' || wp.status === 'approved' ? wp.status : undefined,
            }));

            const userTag = (parsed.nickname || parsed.userEmail?.split('@')[0] || currentNick).toLowerCase();
            let restoredRole: UserRole = parsed.role || null;
            if (userTag) {
              try {
                const savedRole = await AsyncStorage.getItem(`user_role_${userTag}`);
                if (savedRole === 'parent' || savedRole === 'child') {
                  restoredRole = savedRole as UserRole;
                }
              } catch (e) {}
            }

            const prevStreak = typeof parsed.streak === 'number' && parsed.streak > 0 ? parsed.streak : 1;
            const hadCompletedYesterday = rawTasks.some((t: any) => t?.done) || Boolean(parsed.epicClaimedDate);
            const hasShield = Boolean(getAvatarSkillConfig(parsed.currentAvatar).hasStreakShield) || Boolean(parsed.isSick);
            const restoredStreak = isNewDay
              ? (hadCompletedYesterday ? prevStreak + 1 : (hasShield ? prevStreak : 1))
              : prevStreak;

            // Another bootstrap or sign-in may have finished while storage was
            // loading. Never replace that live session with an older cache.
            if (get().userEmail || get().nickname) return;
            if (parsed.userId !== 'guest-local' && auth.currentUser?.uid !== parsed.userId) return;
            i18n.changeLanguage(lang);
            set({
              fullName: parsed.fullName || null,
              nickname: parsed.nickname || null,
              userId: parsed.userId || null,
              userEmail: parsed.userEmail || null,
              role: restoredRole,
              isSick: Boolean(parsed.isSick),
              xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
              level: typeof parsed.level === 'number' ? parsed.level : 1,
              streak: restoredStreak,
              epicClaimedDate: isNewDay ? null : (parsed.epicClaimedDate || null),
              dailyChestClaimedDate: isNewDay ? null : (parsed.dailyChestClaimedDate || null),
              superchargedTaskId: isNewDay ? null : (parsed.superchargedTaskId || null),
              tasks: validTasks,
              children: validChildren,
              selectedChildId: parsed.selectedChildId || (validChildren[0]?.id || null),
              linkedParents: Array.isArray(parsed.linkedParents) ? parsed.linkedParents : [],
              approvalStatus: parsed.approvalStatus || null,
              lastActiveDate: todayStr,
              prizes: restorePrizePool(parsed.prizes),
              wonPrizes: normalizedWonPrizes,
              coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
              unlockedAvatars: Array.isArray(parsed.unlockedAvatars) && parsed.unlockedAvatars.length > 0 
                ? Array.from(new Set(parsed.unlockedAvatars.map((a: string) => (a === 'default' || a === 'questblox_hero') ? 'roblox_noob' : a).concat(['roblox_noob'])))
                : ['roblox_noob'],
              currentAvatar: (!parsed.currentAvatar || parsed.currentAvatar === 'default' || parsed.currentAvatar === 'questblox_hero') ? 'roblox_noob' : parsed.currentAvatar,
              fighterOutfits: normalizeOutfits(parsed.fighterOutfits),
              activeTheme: parsed.activeTheme || 'classic',
              unlockedThemes: Array.isArray(parsed.unlockedThemes) && parsed.unlockedThemes.length > 0 ? parsed.unlockedThemes : ['classic'],
              lastSpinDate: parsed.lastSpinDate || null,
              dailyMood: isNewDay ? null : (parsed.dailyMood || null),
              language: lang,
              epicBossTask: parsed.epicBossTask || '30-min deep focus block 🧠',
              epicBossXP: typeof parsed.epicBossXP === 'number' ? parsed.epicBossXP : 35,
              ...(familyCache ? { ...familyCache, children: familyCache.familyVerifiedUid ? validChildren : [] } : {}),
            });

            if (isNewDay) {
              get().saveMockState();
            }
          }
        } else if (savedLang === 'cs' || savedLang === 'en' || savedLang === 'es' || savedLang === 'de') {
          i18n.changeLanguage(savedLang);
          set({ language: savedLang });
        }
      }

      if (progressBusy() || get().syncError || (get().userId && await hasQueuedProgress(get().userId!))) return;
      // Read-only cross-device refresh. A new operation or account switch while
      // these reads are in flight invalidates the snapshot, not the local edit.
      const uid = get().userId;
      if (uid && uid !== 'guest-local' && auth.currentUser?.uid === uid) {
        const generation = progressGeneration(uid);
        const [dataSnap, profileSnap] = await Promise.all([readCloudState('user_data', uid), readCloudState('profiles', uid)]);
        if (!dataSnap.exists() || !profileSnap.exists()) return;
        const family = await readFamilyStatus();
        const data = { ...(dataSnap.data() || {}), ...family }, profile = profileSnap.data() || {};
        const children: ChildProfile[] = get().role === 'parent' ? await Promise.all((data.children || []).map(async (child: ChildProfile) => {
          if (!child.isApproved) return child;
          const childUid = await accountDocumentId(child.nickname);
          const [p, d] = await Promise.all([readCloudState('profiles', childUid), readCloudState('user_data', childUid)]);
          return { ...child, id: childUid, ...progressSnapshot(p.data() || {}, d.data() || {}) };
        })) : family.children;
        if (get().userId !== uid || auth.currentUser?.uid !== uid || generation !== progressGeneration(uid) || progressBusy()) return;
        const selected = children.find(child => child.id === get().selectedChildId) || children.find(child => child.isApproved);
        const own = progressSnapshot(profile, data);
        set({ ...own, children, familyVerifiedUid: uid, familyReconnectTags: family.familyReconnectTags, linkedParents: data.linked_parents || [],
          parentEmail: data.parent_email || null, approvalStatus: data.approval_status || null,
          pendingInvitation: data.pending_invitation || null,
          selectedChildId: selected?.id || null });
        if (selected) get().selectChild(selected.id);
        const tag = (get().nickname || '').toLowerCase().replace(/^@/, '');
        if (tag) await AsyncStorage.setItem(`mockState_${tag}`, JSON.stringify(get()));
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  },
  clearAllData: async () => {
    try {
      const uid = get().userId;
      if (uid && uid !== 'guest-local') { await get().logout(); return; }
      await AsyncStorage.removeItem('mockState_guest');
      await AsyncStorage.removeItem('mockState');
      await AsyncStorage.removeItem('active_user_tag');
    } catch (e) {
      console.warn('Failed to clear async storage:', e);
    }
    const todayStr = localDay();
    set({
      syncError: null, familyVerifiedUid: null, familyReconnectTags: [], pendingInvitation: null,
      userEmail: null,
      userId: null,
      fullName: null,
      nickname: null,
      role: null,
      isSick: false,
      xp: 0,
      level: 1,
      streak: 1,
      epicClaimedDate: null,
      tasks: [], // 0 quests for kids starting first time!
      prizes: [...DEFAULT_PRIZES],
      wonPrizes: [],
      coins: 0,
      unlockedAvatars: ['roblox_noob'],
      currentAvatar: 'roblox_noob', fighterOutfits: {},
      parentEmail: null,
      linkedParents: [],
      children: [],
      selectedChildId: null,
      approvalStatus: null,
      dailyMood: null,
      lastActiveDate: todayStr,
      epicBossTask: '30-min deep focus block 🧠',
      epicBossXP: 35,
    });
  },
  saveMockState: async () => {
    try {
      const { isSick, xp, level, streak, epicClaimedDate, dailyChestClaimedDate, superchargedTaskId, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, fighterOutfits, activeTheme, unlockedThemes, lastSpinDate, parentEmail, pendingInvitation, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role } = get();
      if (!userEmail) {
        await AsyncStorage.removeItem('active_user_tag');
        await AsyncStorage.removeItem('mockState');
        return;
      }
      const userTag = (nickname || userEmail.split('@')[0]).toLowerCase().replace(/^@/, '');
      const stateObj = { isSick, xp, level, streak, epicClaimedDate, dailyChestClaimedDate, superchargedTaskId, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, fighterOutfits, activeTheme, unlockedThemes, lastSpinDate, parentEmail, pendingInvitation, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role };
      
      await AsyncStorage.setItem('active_user_tag', userTag);
      await AsyncStorage.setItem('mockState', JSON.stringify(stateObj));
      if (userTag) {
        await AsyncStorage.setItem(`mockState_${userTag}`, JSON.stringify(stateObj));
      }
      await get().syncToServer();
    } catch (e) {
      console.error('Failed to save state', e);
    }
  },
}));
