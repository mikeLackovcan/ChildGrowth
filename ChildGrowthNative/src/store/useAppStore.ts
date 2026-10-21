import { normalizeBrandState, normalizeAvatarId } from '../lib/brandMigration';
// App global state store
import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut, sendSignInLinkToEmail, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '../lib/projectStorage';
import i18n from '../i18n';
import { playSound } from '../lib/sound';
import { BackgroundKey, ThemeKey } from '../constants/theme';
import { calculateQuestReward } from '../lib/heroRewards';
import { freshTaskDay, isQuestDue, localDateKey } from '../lib/questSchedule';
import { cancelQuestNotification } from '../lib/notifications';
import {
  answerFamilyInvite,
  createFamilyInvite,
  findProfileByNickname,
  listFamilyInvites,
  loadLinkedChildren,
  loadOwnCloudData,
  saveCloudProfile,
  saveLinkedChildData,
  saveOwnCloudData,
  unlinkFamily,
} from '../lib/familyCloud';

// Production sync uses Firebase Auth UIDs and approved family invitations.
// The legacy nickname-keyed path stays disabled for migration safety.
const CLOUD_SYNC_ENABLED = true;
const LEGACY_NICKNAME_CLOUD_SYNC = false;

export type UserRole = 'parent' | 'child' | null;
export type AppLanguage = 'en' | 'cs' | 'es' | 'de';

export interface Task {
  id: string;
  name: string;
  diff: 'easy' | 'med' | 'hard';
  freq: 'daily' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'weekdays' | 'weekends';
  mystery: boolean;
  done: boolean;
  date: string;
  icon?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  reminderMode?: 'notification' | 'alarm';
  focusDurationMinutes?: number;
  activeFocusStartedAt?: string;
  focusNotificationId?: string;
  questMapGoal?: string;
  requiresApproval?: boolean;
  pendingApproval?: boolean;
  verificationNote?: string;
  rewardedXP?: number;
  rewardedCoins?: number;
}

export interface WonPrize {
  id: string;
  prize: string;
  date: string;
  redeemed: boolean;
}

export interface RewardGoal {
  id: string;
  title: string;
  target: number;
  startCoins: number;
  claimed?: boolean;
}

function rewardState(data: any, cloud = false) {
  const totalEarned = cloud ? data.total_earned : data.totalEarned;
  const ledger = cloud ? data.daily_earnings : data.dailyEarnings;
  const goal = cloud ? data.reward_goal : data.rewardGoal;
  const recordedToday = (Array.isArray(data.tasks) ? data.tasks : [])
    .filter((task: Task) => task.done && task.date === localDateKey())
    .reduce((sum: number, task: Task) => sum + (task.rewardedCoins || 0), 0);
  return {
    // Historical spending was not tracked. Preserve the confirmed wallet baseline.
    totalEarned: Number.isFinite(totalEarned) ? totalEarned : Math.max(0, data.coins || 0),
    dailyEarnings: ledger?.date === localDateKey() && Number.isFinite(ledger.coins)
      ? ledger : { date: localDateKey(), coins: recordedToday },
    rewardGoal: goal?.title && Number.isFinite(goal.target) && goal.target > 0 && Number.isFinite(goal.startCoins) ? goal as RewardGoal : null,
  };
}

export interface ChildProfile {
  id: string;
  name: string;
  nickname: string;
  level: number;
  xp: number;
  coins: number;
  tasks: Task[];
  wonPrizes: WonPrize[];
  unlockedAvatars: string[];
  currentAvatar: string;
  linkedParents: string[];
  isApproved: boolean;
  initiatedBy?: 'kid' | 'parent';
  epicBossTask?: string;
  epicBossXP?: number;
  totalEarned?: number;
  dailyEarnings?: { date: string; coins: number };
  rewardGoal?: RewardGoal | null;
}

interface AppState {
  userEmail: string | null;
  userId: string | null;
  fullName: string | null;
  nickname: string | null;
  role: UserRole;
  isSick: boolean;
  xp: number;
  level: number;
  tasks: Task[];
  prizes: string[];
  wonPrizes: WonPrize[];
  coins: number;
  totalEarned: number;
  dailyEarnings: { date: string; coins: number };
  rewardGoal: RewardGoal | null;
  setRewardGoal: (title: string, target: number) => void;
  claimRewardGoal: () => void;
  restoreTask: (task: Task) => void;
  undoTaskCompletion: (id: string) => boolean;
  unlockedAvatars: string[];
  currentAvatar: string;
  activeTheme: ThemeKey;
  unlockedThemes: ThemeKey[];
  activeBackground: BackgroundKey;
  unlockedBackgrounds: BackgroundKey[];
  lastSpinDate: string | null;
  parentEmail: string | null;
  linkedParents: string[];
  children: ChildProfile[];
  selectedChildId: string | null;
  approvalStatus: 'pending' | 'approved' | null;
  dailyMood: 'wiped' | 'thriving' | 'too_easy' | null;
  language: AppLanguage;
  lastActiveDate: string | null;
  epicBossTask: string;
  epicBossXP: number;
  
  logout: () => Promise<void>;
  setUser: (email: string | null, role: UserRole, fullName?: string, nickname?: string, id?: string) => void;
  continueAsGuest: () => Promise<void>;
  setSick: (sick: boolean) => void;
  addXP: (amount: number) => void;
  addTask: (task: Omit<Task, 'id' | 'done' | 'date'>) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  toggleTaskDone: (id: string) => void;
  completeTask: (id: string) => { completed: boolean; pendingApproval: boolean; reward?: { xp: number; coins: number; message?: string } };
  resetTasksForNewDay: () => void;
  deleteAllTasks: () => void;
  setPrizes: (prizes: string[]) => void;
  addWonPrize: (prize: string) => void;
  togglePrizeRedeemed: (prizeIdOrIndex: string | number) => void;
  setEpicBossTask: (taskName: string, xpReward?: number) => void;
  
  spendCoins: (amount: number) => boolean;
  unlockAvatar: (avatarId: string) => void;
  setCurrentAvatar: (avatarId: string) => void;
  unlockTheme: (themeKey: ThemeKey, price: number) => boolean;
  setActiveTheme: (themeKey: ThemeKey) => void;
  unlockBackground: (backgroundKey: BackgroundKey, price: number) => boolean;
  setActiveBackground: (backgroundKey: BackgroundKey) => void;
  claimDailyWheelPrize: () => string | null;
  submitTaskForApproval: (taskId: string, note?: string) => void;
  verifyChildTask: (childId: string, taskId: string, approved: boolean) => void;
  
  setParentEmail: (email: string) => void;
  setApprovalStatus: (status: 'pending' | 'approved' | null) => void;
  sendParentInvite: (parentEmail: string) => void;
  acceptParentInvite: (parentTag?: string) => void;
  denyParentInvite: (parentTag?: string) => void;
  approveChildByParent: (childId: string) => void;
  
  // Multi-Child & Multi-Parent Actions
  addChildByNickname: (nickname: string, name?: string) => void;
  removeChild: (childId: string) => void;
  removeParent: (parentNickname: string) => void;
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
  
  loadMockState: () => Promise<void>;
  saveMockState: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  userEmail: null,
  userId: null,
  fullName: null,
  nickname: null,
  role: null,
  isSick: false,
  language: 'en',
  lastActiveDate: localDateKey(),
  xp: 0,
  level: 1,
  tasks: [], // Kids start with 0 quests first time!
  prizes: ['Family surprise 🎁', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
  wonPrizes: [],
  coins: 0,
  totalEarned: 0,
  dailyEarnings: { date: localDateKey(), coins: 0 },
  rewardGoal: null,
  unlockedAvatars: ['default'],
  currentAvatar: 'default',
  activeTheme: 'classic',
  unlockedThemes: ['classic'],
  activeBackground: 'clean',
  unlockedBackgrounds: ['clean'],
  lastSpinDate: null,
  parentEmail: null,
  linkedParents: [],
  children: [],
  selectedChildId: null,
  approvalStatus: null,
  dailyMood: null,
  epicBossTask: '30-min deep focus block 🧠',
  epicBossXP: 35,

  setRewardGoal: (title, target) => {
    if (!title.trim() || !Number.isFinite(target) || target < 1) return;
    const rewardGoal: RewardGoal = {
      id: `goal_${Date.now()}`,
      title: title.trim().slice(0, 80),
      target: Math.floor(target),
      startCoins: get().totalEarned,
    };
    set(state => ({
      rewardGoal,
      children: state.children.map(child => child.id === state.selectedChildId ? { ...child, rewardGoal } : child),
    }));
    get().saveMockState();
  },
  claimRewardGoal: () => {
    const { rewardGoal, totalEarned } = get();
    if (!rewardGoal || rewardGoal.claimed || totalEarned - rewardGoal.startCoins < rewardGoal.target) return;
    const claimed = { ...rewardGoal, claimed: true };
    set(state => ({
      rewardGoal: claimed,
      children: state.children.map(child => child.id === state.selectedChildId ? { ...child, rewardGoal: claimed } : child),
    }));
    get().addWonPrize(rewardGoal.title);
  },
  restoreTask: (task) => {
    if (get().tasks.some(item => item.id === task.id)) return;
    const tasks = [...get().tasks, freshTaskDay(task)];
    set(state => ({
      tasks,
      children: state.children.map(child => child.id === state.selectedChildId ? { ...child, tasks } : child),
    }));
    get().saveMockState();
  },
  undoTaskCompletion: (id) => {
    const task = get().tasks.find(item => item.id === id);
    if (!task?.done || task.date !== localDateKey() || get().coins < (task.rewardedCoins || 0)) return false;
    const goal = get().rewardGoal;
    if (goal?.claimed && get().totalEarned - (task.rewardedCoins || 0) - goal.startCoins < goal.target) return false;
    const totalXp = Math.max(0, (get().level - 1) * 100 + get().xp - (task.rewardedXP || 0));
    const change = {
      tasks: get().tasks.map(item => item.id === id ? { ...item, done: false, rewardedXP: 0, rewardedCoins: 0 } : item),
      coins: get().coins - (task.rewardedCoins || 0),
      totalEarned: Math.max(0, get().totalEarned - (task.rewardedCoins || 0)),
      dailyEarnings: { date: localDateKey(), coins: Math.max(0, get().dailyEarnings.coins - (task.rewardedCoins || 0)) },
      xp: totalXp % 100,
      level: Math.floor(totalXp / 100) + 1,
    };
    set(state => ({
      ...change,
      children: state.children.map(child => child.id === state.selectedChildId ? { ...child, ...change } : child),
    }));
    get().saveMockState();
    return true;
  },
  
  logout: async () => {
    try {
      const userTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
      if (userTag) {
        const { isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, activeBackground, unlockedBackgrounds, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role } = get();
        const stateObj = { ...rewardState(get()), isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, activeBackground, unlockedBackgrounds, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role };
        await AsyncStorage.setItem(`mockState_${userTag}`, JSON.stringify(stateObj));
      }
    } catch (e) {}

    try {
      await signOut(auth);
    } catch (e) {}

    try {
      await AsyncStorage.removeItem('active_user_tag');
      await AsyncStorage.removeItem('mockState');
    } catch (e) {}

    const todayStr = localDateKey();
    set({
      userEmail: null,
      userId: null,
      fullName: null,
      nickname: null,
      role: null,
      isSick: false,
      xp: 0,
      level: 1,
      tasks: [],
      prizes: ['Family surprise 🎁', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
      wonPrizes: [],
      coins: 0,
      totalEarned: 0,
      dailyEarnings: { date: localDateKey(), coins: 0 },
      rewardGoal: null,
      unlockedAvatars: ['default'],
      currentAvatar: 'default',
      activeTheme: 'classic',
      unlockedThemes: ['classic'],
      activeBackground: 'clean',
      unlockedBackgrounds: ['clean'],
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
  setUser: (email, role, fullName, nickname, id) => {
    if (!email) {
      get().logout();
      return;
    }
    const cleanNick = (nickname || email.split('@')[0]).toLowerCase().replace(/^@/, '');
    set({ 
      userEmail: email, 
      role, 
      fullName: fullName || email.split('@')[0], 
      nickname: cleanNick, 
      userId: id || null 
    });
    get().loadMockState();
    get().saveMockState();
  },
  continueAsGuest: async () => {
    set({
      userEmail: 'guest@questhero.local',
      userId: 'guest-local',
      fullName: 'Guest Hero',
      nickname: 'guest',
      role: 'child',
    });
    await AsyncStorage.setItem('active_user_tag', 'guest');
    await get().loadMockState();
    await get().saveMockState();
  },
  setSick: (sick) => {
    set({ isSick: sick });
    get().saveMockState();
  },
  addXP: (amount) => {
    const totalXp = Math.max(0, ((get().level - 1) * 100) + get().xp + amount);
    const currentLevel = Math.floor(totalXp / 100) + 1;
    const currentXp = totalXp % 100;
    set({ xp: currentXp, level: currentLevel });
    
    // Also sync updates to active selected child profile if parent
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, xp: currentXp, level: currentLevel } : c)
      });
    }

    get().saveMockState();
  },
  addTask: (task) => {
    const todayStr = localDateKey();
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substring(7),
      done: false,
      date: todayStr,
    };
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
    void cancelQuestNotification(get().tasks.find(task => task.id === id)?.focusNotificationId);
    void cancelQuestNotification(`later-${id}`);
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, tasks: c.tasks.filter(t => t.id !== id) } : c)
      });
    }
    get().saveMockState();
  },
  updateTask: (id, updates) => {
    const original = get().tasks.find(task => task.id === id);
    if (original && Object.prototype.hasOwnProperty.call(updates, 'focusDurationMinutes')
      && original.focusDurationMinutes !== updates.focusDurationMinutes) {
      void cancelQuestNotification(original.focusNotificationId);
      updates = { ...updates, activeFocusStartedAt: undefined, focusNotificationId: undefined };
    }
    const updatedTasks = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    const { selectedChildId, children } = get();
    set({
      tasks: updatedTasks,
      children: selectedChildId
        ? children.map((child) => child.id === selectedChildId ? { ...child, tasks: updatedTasks } : child)
        : children,
    });
    get().saveMockState();
  },
  toggleTaskDone: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    if (!task.done) {
      get().completeTask(id);
      return;
    }

    get().undoTaskCompletion(id);
  },
  completeTask: (id) => {
    if (get().lastActiveDate !== localDateKey()) get().resetTasksForNewDay();
    const task = get().tasks.find((item) => item.id === id);
    if (!task || task.done || task.pendingApproval || !isQuestDue(task)) return { completed: false, pendingApproval: Boolean(task?.pendingApproval) };
    void cancelQuestNotification(task.focusNotificationId);
    void cancelQuestNotification(`later-${id}`);
    if (task.requiresApproval && get().linkedParents.length > 0 && get().role !== 'parent') {
      get().submitTaskForApproval(id);
      return { completed: false, pendingApproval: true };
    }

    const earnedToday = get().dailyEarnings.date === localDateKey() ? get().dailyEarnings.coins : 0;
    const reward = calculateQuestReward(task, get().tasks, get().currentAvatar, earnedToday);
    const updatedTasks = get().tasks.map((item) => item.id === id ? {
      ...item,
      done: true,
      date: localDateKey(),
      pendingApproval: false,
      activeFocusStartedAt: undefined,
      focusNotificationId: undefined,
      rewardedXP: reward.xp,
      rewardedCoins: reward.coins,
    } : item);
    set({ tasks: updatedTasks, coins: get().coins + reward.coins,
      totalEarned: get().totalEarned + reward.coins,
      dailyEarnings: { date: localDateKey(), coins: earnedToday + reward.coins } });
    get().addXP(reward.xp);
    const { selectedChildId, children } = get();
    if (selectedChildId) {
      set({
        children: children.map((child) => child.id === selectedChildId ? {
          ...child,
          tasks: updatedTasks,
          coins: get().coins,
          xp: get().xp,
          level: get().level,
          totalEarned: get().totalEarned,
          dailyEarnings: get().dailyEarnings,
        } : child),
      });
    }
    get().saveMockState();
    return { completed: true, pendingApproval: false, reward };
  },
  resetTasksForNewDay: () => {
    const todayStr = localDateKey();
    if (get().lastActiveDate === todayStr) return;
    const resetTasksList = get().tasks.map((t) => freshTaskDay(t, todayStr));
    
    set((state) => ({
      lastActiveDate: todayStr,
      dailyMood: null,
      tasks: resetTasksList,
      dailyEarnings: rewardState(state).dailyEarnings,
      children: state.children.map(child => ({
        ...child,
        tasks: child.tasks.map(t => freshTaskDay(t, todayStr)),
        dailyEarnings: rewardState(child).dailyEarnings,
      }))
    }));
    get().saveMockState();
  },
  deleteAllTasks: () => {
    for (const task of get().tasks) {
      void cancelQuestNotification(task.focusNotificationId);
      void cancelQuestNotification(`later-${task.id}`);
    }
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
    set({ prizes });
    get().saveMockState();
  },
  addWonPrize: (prize) => {
    const newWon: WonPrize = {
      id: Math.random().toString(36).substring(7),
      prize,
      date: new Date().toISOString(),
      redeemed: false,
    };
    const updatedWonPrizes = [newWon, ...get().wonPrizes];
    set({ wonPrizes: updatedWonPrizes });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, wonPrizes: updatedWonPrizes } : c)
      });
    }
    get().saveMockState();
  },
  togglePrizeRedeemed: (prizeIdOrIndex) => {
    const updatedWonPrizes = get().wonPrizes.map((p, idx) => {
      if (p.id === prizeIdOrIndex || idx === prizeIdOrIndex || String(idx) === String(prizeIdOrIndex)) {
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
    const cleanTitle = taskName.trim() || '30-min deep focus block 🧠';
    const cleanXP = xpReward && xpReward > 0 ? xpReward : 35;
    set({ epicBossTask: cleanTitle, epicBossXP: cleanXP });

    const { selectedChildId, children } = get();
    if (selectedChildId && children.length > 0) {
      set({
        children: children.map(c => c.id === selectedChildId ? { ...c, epicBossTask: cleanTitle, epicBossXP: cleanXP } : c)
      });
    }
    get().saveMockState();
  },
  
  spendCoins: (amount) => {
    const { coins } = get();
    if (Number.isFinite(amount) && amount >= 0 && coins >= amount) {
      set({ coins: coins - amount });
      get().saveMockState();
      return true;
    }
    return false;
  },
  unlockAvatar: (avatarId) => {
    set((state) => ({
      unlockedAvatars: [...new Set([...state.unlockedAvatars, normalizeAvatarId(avatarId)])]
    }));
    get().saveMockState();
  },
  setCurrentAvatar: (avatarId) => {
    set({ currentAvatar: normalizeAvatarId(avatarId) });
    playSound('spin');
    get().saveMockState();
  },
  unlockTheme: (themeKey: ThemeKey, price: number) => {
    const { unlockedThemes, coins } = get();
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
  setActiveTheme: (themeKey: ThemeKey) => {
    if (get().unlockedThemes.includes(themeKey)) {
      set({ activeTheme: themeKey });
      playSound('spin');
      get().saveMockState();
    }
  },
  unlockBackground: (backgroundKey: BackgroundKey, price: number) => {
    const { unlockedBackgrounds, coins } = get();
    if (unlockedBackgrounds.includes(backgroundKey)) {
      set({ activeBackground: backgroundKey });
      get().saveMockState();
      return true;
    }
    if (coins < price) return false;
    set({
      coins: coins - price,
      unlockedBackgrounds: [...unlockedBackgrounds, backgroundKey],
      activeBackground: backgroundKey,
    });
    playSound('unlock');
    get().saveMockState();
    return true;
  },
  setActiveBackground: (backgroundKey: BackgroundKey) => {
    if (!get().unlockedBackgrounds.includes(backgroundKey)) return;
    set({ activeBackground: backgroundKey });
    playSound('spin');
    get().saveMockState();
  },
  claimDailyWheelPrize: () => {
    const todayStr = localDateKey();
    const due = get().tasks.filter(task => isQuestDue(task));
    if (!due.length || due.some(task => !task.done) || get().lastSpinDate === todayStr) return null;
    const choices = get().prizes.map(prize => prize.trim()).filter(Boolean);
    const prize = (choices.length ? choices : ['Family surprise 🎁'])[Math.floor(Math.random() * Math.max(1, choices.length))];
    const won: WonPrize = { id: `wheel_${Date.now()}`, prize, date: new Date().toISOString(), redeemed: false };
    const wonPrizes = [won, ...get().wonPrizes];
    set(state => ({
      lastSpinDate: todayStr,
      wonPrizes,
      children: state.children.map(child => child.id === state.selectedChildId ? { ...child, wonPrizes } : child),
    }));
    playSound('spin');
    get().saveMockState();
    return prize;
  },
  submitTaskForApproval: (taskId: string, note?: string) => {
    const updatedTasks = get().tasks.map(t => t.id === taskId ? { ...t, pendingApproval: true, activeFocusStartedAt: undefined, focusNotificationId: undefined, verificationNote: note || 'Completed! Waiting for parent review 📸' } : t);
    set({ tasks: updatedTasks });
    playSound('spin');
    
    const userTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const { linkedParents } = get();
    if (linkedParents && linkedParents.length > 0) {
      for (const pTag of linkedParents) {
        const cleanPTag = pTag.toLowerCase().replace(/^@/, '');
        AsyncStorage.getItem(`mockState_${cleanPTag}`).then(str => {
          if (str) {
            try {
              const pData = normalizeBrandState(JSON.parse(str));
              if (Array.isArray(pData.children)) {
                pData.children = pData.children.map((c: any) => c.nickname?.toLowerCase() === userTag ? { ...c, tasks: updatedTasks } : c);
                AsyncStorage.setItem(`mockState_${cleanPTag}`, JSON.stringify(pData));
              }
            } catch(e){}
          }
        });
      }
    }
    get().saveMockState();
  },
  verifyChildTask: (childId: string, taskId: string, approved: boolean) => {
    const { children } = get();
    const updatedChildren = children.map(c => {
      if (c.id === childId) {
        const targetTask = c.tasks.find(t => t.id === taskId);
        if (!targetTask || targetTask.done || !targetTask.pendingApproval) return c;
        const economy = rewardState(c);
        const reward = calculateQuestReward(targetTask, c.tasks, c.currentAvatar, economy.dailyEarnings.coins);
        const updatedTasks = c.tasks.map(t => {
          if (t.id === taskId) {
            if (approved) {
              return { ...t, done: true, date: localDateKey(), pendingApproval: false, rewardedXP: reward.xp, rewardedCoins: reward.coins };
            } else {
              return { ...t, done: false, pendingApproval: false, rewardedXP: 0, rewardedCoins: 0 };
            }
          }
          return t;
        });
        
        const bonusXP = approved && !targetTask?.done ? reward.xp : 0;
        const bonusCoins = approved && !targetTask?.done ? reward.coins : 0;

        const totalChildXp = Math.max(0, ((c.level - 1) * 100) + c.xp + bonusXP);
        return {
          ...c,
          tasks: updatedTasks,
          xp: totalChildXp % 100,
          coins: Math.max(0, c.coins + bonusCoins),
          totalEarned: economy.totalEarned + bonusCoins,
          dailyEarnings: { date: localDateKey(), coins: economy.dailyEarnings.coins + bonusCoins },
          level: Math.floor(totalChildXp / 100) + 1,
        };
      }
      return c;
    });

    const selected = updatedChildren.find((child) => child.id === get().selectedChildId);
    set({
      children: updatedChildren,
      ...(selected ? {
        tasks: selected.tasks,
        coins: selected.coins,
        xp: selected.xp,
        level: selected.level,
        ...rewardState(selected),
      } : {}),
    });
    if (approved) {
      playSound('levelup');
    }
    get().saveMockState();
  },
  
  setParentEmail: (email) => {
    set({ parentEmail: email, approvalStatus: 'pending' });
    get().saveMockState();
  },
  setApprovalStatus: (status) => {
    set({ approvalStatus: status });
    get().saveMockState();
  },
  sendParentInvite: (parentEmail) => {
    const cleanParentTag = parentEmail.replace(/^@/, '').trim().toLowerCase();
    if (!cleanParentTag) return;

    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || 'kid_hero').toLowerCase().replace(/^@/, '');
    const currentKidName = get().fullName || currentKidTag;
    const existing = get().children.find(c => c.nickname.toLowerCase() === cleanParentTag);

    let updatedChildren = [...get().children];
    if (existing) {
      const updatedLinked = Array.from(new Set([...(existing.linkedParents || []), cleanParentTag]));
      updatedChildren = updatedChildren.map(c => c.id === existing.id ? { ...c, linkedParents: updatedLinked, isApproved: false, initiatedBy: 'kid' } : c);
    } else {
      const newChild: ChildProfile = {
        id: 'usr_' + currentKidTag,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };
      updatedChildren.push(newChild);
    }

    set({
      parentEmail: cleanParentTag,
      approvalStatus: 'pending',
      linkedParents: Array.from(new Set([...get().linkedParents, cleanParentTag])),
      children: updatedChildren
    });
    get().saveMockState();
    if (CLOUD_SYNC_ENABLED && auth.currentUser) {
      createFamilyInvite(cleanParentTag, 'child').catch((error) => console.warn('Could not send family invite:', error));
    }
    
    // Cross-user local mock sync (Kid -> Parent)
    AsyncStorage.getItem(`mockState_${cleanParentTag}`).then(async str => {
      let parentData: any = {};
      if (str) {
        try { parentData = normalizeBrandState(JSON.parse(str)); } catch(e){}
      } else {
        const pEmail = await AsyncStorage.getItem(`user_email_${cleanParentTag}`) || `${cleanParentTag}@growth.app`;
        parentData = {
          userEmail: pEmail,
          nickname: cleanParentTag,
          fullName: cleanParentTag,
          role: 'parent',
          children: [],
          linkedParents: [],
          tasks: [],
          prizes: ['Family surprise 🎁', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑']
        };
      }

      const childExists = parentData.children?.find((c: any) => c.nickname.toLowerCase() === currentKidTag);
      const kidItem = {
        id: 'usr_' + currentKidTag,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };
      if (childExists) {
        parentData.children = parentData.children.map((c: any) => c.nickname.toLowerCase() === currentKidTag ? { ...c, isApproved: false, initiatedBy: 'kid' } : c);
      } else {
        parentData.children = parentData.children || [];
        parentData.children.push(kidItem);
      }
      await AsyncStorage.setItem(`mockState_${cleanParentTag}`, JSON.stringify(parentData));
    });

    // Retained only for migration from pre-UID development builds.
    if (LEGACY_NICKNAME_CLOUD_SYNC) try {
      const kidDocId = `usr_${currentKidTag}`;
      const parentDocId = `usr_${cleanParentTag}`;

      // 1. Update Kid's user_data document in Firestore
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: 'pending',
        parent_email: cleanParentTag,
        linked_parents: Array.from(new Set([...get().linkedParents, cleanParentTag])),
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid doc update notice:', e));

      // 2. Direct write & query Parent in Firestore
      const kidItem = {
        id: kidDocId,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };

      const syncParentDoc = async (pDocId: string) => {
        try {
          const parentDocSnap = await getDoc(doc(db, 'user_data', pDocId));
          let parentChildren: any[] = [];
          if (parentDocSnap.exists()) {
            parentChildren = parentDocSnap.data()?.children || [];
          }
          const idx = parentChildren.findIndex((c: any) => (c.nickname || '').toLowerCase() === currentKidTag);
          if (idx >= 0) {
            parentChildren[idx] = { ...parentChildren[idx], ...kidItem };
          } else {
            parentChildren.push(kidItem);
          }
          await setDoc(doc(db, 'user_data', pDocId), {
            children: parentChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(`✅ Firestore: Linked Kid @${currentKidTag} pending to Parent @${cleanParentTag} (doc: ${pDocId})`);
        } catch (err) {
          console.warn('Firestore sync parent error:', err);
        }
      };

      syncParentDoc(parentDocId);

      const pQuery = query(collection(db, 'profiles'), where('nickname', '==', cleanParentTag));
      getDocs(pQuery).then(snap => {
        if (!snap.empty) {
          const customDocId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (customDocId !== parentDocId) {
            syncParentDoc(customDocId);
          }
        }
      }).catch(e => console.warn('Firestore parent lookup notice:', e));
    } catch(e) {}
  },
  approveChildByParent: (childId: string) => {
    const updatedChildren = get().children.map(c => c.id === childId ? { ...c, isApproved: true } : c);
    const approvedChild = updatedChildren.find(c => c.id === childId);
    
    set({
      children: updatedChildren,
      selectedChildId: childId,
      approvalStatus: 'approved',
      tasks: approvedChild?.tasks || [],
      coins: approvedChild?.coins || 0,
      xp: approvedChild?.xp || 0,
      level: approvedChild?.level || 1
    });
    get().saveMockState();

    const parentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = `usr_${parentTag}`;

    if (approvedChild) {
      const kidTag = (approvedChild.nickname || '').toLowerCase().replace(/^@/, '');
      const kidDocId = `usr_${kidTag}`;
      if (CLOUD_SYNC_ENABLED && auth.currentUser) {
        listFamilyInvites()
          .then((invites) => invites.find((invite) => invite.child_uid === approvedChild.id || invite.child_nickname === kidTag))
          .then((invite) => invite ? answerFamilyInvite(invite.id, true) : Promise.reject(new Error('Invite not found.')))
          .catch((error) => console.warn('Could not approve family invite:', error));
      }

      // Cross-user local mock sync (Parent approves -> Kid)
      AsyncStorage.getItem(`mockState_${kidTag}`).then(str => {
        if (str) {
          try {
            const kidData = normalizeBrandState(JSON.parse(str));
            kidData.approvalStatus = 'approved';
            kidData.parentEmail = parentTag;
            kidData.linkedParents = Array.from(new Set([...(kidData.linkedParents || []), parentTag]));
            if (kidData.children && kidData.children.length > 0) {
              kidData.children = kidData.children.map((c: any) => ({ ...c, isApproved: true, linkedParents: kidData.linkedParents }));
            }
            AsyncStorage.setItem(`mockState_${kidTag}`, JSON.stringify(kidData));
          } catch(e){}
        }
      });

      // Retained only for migration from pre-UID development builds.
      if (LEGACY_NICKNAME_CLOUD_SYNC) try {
        // 1. Update Parent's own Firestore user_data document
        setDoc(doc(db, 'user_data', parentDocId), {
          children: updatedChildren,
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(e => console.warn('Firestore parent children update notice:', e));

        // 2. Update Kid's Firestore user_data document
        const syncKidApproval = async (kDocId: string) => {
          try {
            const kidSnap = await getDoc(doc(db, 'user_data', kDocId));
            const existingParents = kidSnap.exists() ? (kidSnap.data()?.linked_parents || []) : [];
            const existingChildren = kidSnap.exists() ? (kidSnap.data()?.children || []) : [];
            const updatedChildren = existingChildren.map((c: any) => ({ ...c, isApproved: true, linkedParents: Array.from(new Set([...(c.linkedParents || []), parentTag])) }));
            await setDoc(doc(db, 'user_data', kDocId), {
              approval_status: 'approved',
              parent_email: parentTag,
              linked_parents: Array.from(new Set([...existingParents, parentTag])),
              children: updatedChildren,
              updated_at: new Date().toISOString()
            }, { merge: true });
            console.log(`✅ Firestore: Parent @${parentTag} approved Kid @${kidTag} (doc: ${kDocId})`);
          } catch (e) {
            console.warn('Firestore kid approve update notice:', e);
          }
        };

        syncKidApproval(kidDocId);

        const kQuery = query(collection(db, 'profiles'), where('nickname', '==', kidTag));
        getDocs(kQuery).then(snap => {
          if (!snap.empty) {
            const customKidId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (customKidId !== kidDocId) {
              syncKidApproval(customKidId);
            }
          }
        }).catch(e => console.warn('Firestore kid lookup notice:', e));
      } catch(e) {}
    }
  },

  acceptParentInvite: (parentTag?: string) => {
    const currentParentTag = (parentTag || get().parentEmail || 'parent_boss').toLowerCase().replace(/^@/, '');
    const updatedLinked = Array.from(new Set([...get().linkedParents, currentParentTag]));
    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const kidDocId = `usr_${currentKidTag}`;
    const parentDocId = `usr_${currentParentTag}`;
    
    // Mark matching child (or unapproved child) as approved in children list
    const updatedChildren = get().children.map(c => {
      const isMatch = !currentKidTag || c.nickname.toLowerCase() === currentKidTag || c.isApproved === false;
      if (isMatch) {
        return {
          ...c,
          isApproved: true,
          linkedParents: Array.from(new Set([...(c.linkedParents || []), currentParentTag]))
        };
      }
      return c;
    });

    set({
      approvalStatus: 'approved',
      parentEmail: currentParentTag,
      linkedParents: updatedLinked,
      children: updatedChildren
    });
    get().saveMockState();
    if (CLOUD_SYNC_ENABLED && auth.currentUser) {
      listFamilyInvites()
        .then((invites) => invites.find((invite) => invite.parent_nickname === currentParentTag && invite.status === 'pending'))
        .then((invite) => invite ? answerFamilyInvite(invite.id, true) : Promise.reject(new Error('Invite not found.')))
        .catch((error) => console.warn('Could not accept family invite:', error));
    }
    
    // Cross-user local mock sync (Kid accepts -> Parent)
    AsyncStorage.getItem(`mockState_${currentParentTag}`).then(str => {
      if (str) {
        try {
          const parentData = normalizeBrandState(JSON.parse(str));
          if (parentData.children) {
            parentData.children = parentData.children.map((c: any) => c.nickname.toLowerCase() === currentKidTag ? { ...c, isApproved: true } : c);
            AsyncStorage.setItem(`mockState_${currentParentTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Retained only for migration from pre-UID development builds.
    if (LEGACY_NICKNAME_CLOUD_SYNC) try {
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: 'approved',
        parent_email: currentParentTag,
        linked_parents: updatedLinked,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid accept notice:', e));

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.map((c: any) => (c.nickname || '').toLowerCase() === currentKidTag ? { ...c, isApproved: true } : c);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(`✅ Firestore: Kid @${currentKidTag} accepted Parent @${currentParentTag}`);
        }
      }).catch(e => console.warn('Firestore parent accept update notice:', e));
    } catch(e) {}
  },

  denyParentInvite: (parentTag?: string) => {
    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const pTag = (parentTag || get().parentEmail || 'parent_boss').toLowerCase().replace(/^@/, '');
    const kidDocId = `usr_${currentKidTag}`;
    const parentDocId = `usr_${pTag}`;

    const updatedChildren = get().children.filter(c => {
      if (!c.isApproved && (!currentKidTag || c.nickname.toLowerCase() === currentKidTag)) {
        return false;
      }
      return true;
    });
    set({ parentEmail: null, approvalStatus: null, children: updatedChildren });
    get().saveMockState();
    if (CLOUD_SYNC_ENABLED && auth.currentUser) {
      listFamilyInvites()
        .then((invites) => invites.find((invite) => invite.parent_nickname === pTag && invite.status === 'pending'))
        .then((invite) => invite ? answerFamilyInvite(invite.id, false) : undefined)
        .catch((error) => console.warn('Could not decline family invite:', error));
    }
    
    // Cross-user local mock sync (Kid denies -> Parent)
    AsyncStorage.getItem(`mockState_${pTag}`).then(str => {
      if (str) {
        try {
          const parentData = normalizeBrandState(JSON.parse(str));
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== currentKidTag);
            AsyncStorage.setItem(`mockState_${pTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Retained only for migration from pre-UID development builds.
    if (LEGACY_NICKNAME_CLOUD_SYNC) try {
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: null,
        parent_email: null,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid deny notice:', e));

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.filter((c: any) => (c.nickname || '').toLowerCase() !== currentKidTag);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }).catch(e => console.warn('Firestore parent deny update notice:', e));
    } catch(e) {}
  },

  // Multi-Child & Multi-Parent Actions Implementation
  addChildByNickname: (rawNickname: string, name?: string) => {
    const cleanTag = rawNickname.replace(/^@/, '').trim().toLowerCase();
    if (!cleanTag) return;
    
    const existing = get().children.find(c => c.nickname.toLowerCase() === cleanTag);
    const currentParentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = `usr_${currentParentTag}`;

    let updatedChildren = [...get().children];
    if (existing) {
      const updatedLinked = Array.from(new Set([...(existing.linkedParents || []), currentParentTag]));
      updatedChildren = updatedChildren.map(c => c.id === existing.id ? { ...c, linkedParents: updatedLinked, isApproved: false, initiatedBy: ('parent' as const) } : c);
      set({ children: updatedChildren });
    } else {
      const newChild: ChildProfile = {
        id: 'usr_' + cleanTag,
        name: name || cleanTag,
        nickname: cleanTag,
        level: 1,
        xp: 0,
        coins: 0,
        tasks: [],
        wonPrizes: [],
        unlockedAvatars: ['default'],
        currentAvatar: 'default',
        linkedParents: [currentParentTag],
        isApproved: false,
        initiatedBy: 'parent'
      };
      updatedChildren = [...get().children, newChild];
      set({ children: updatedChildren });
    }
    get().saveMockState();
    if (CLOUD_SYNC_ENABLED && auth.currentUser) {
      createFamilyInvite(cleanTag, 'parent')
        .then((invite) => set((state) => ({
          children: state.children.map((child) => child.nickname === cleanTag ? { ...child, id: invite.child_uid } : child),
        })))
        .catch((error) => console.warn('Could not add child account:', error));
    }
    
    // Cross-user local mock sync (Parent -> Kid)
    AsyncStorage.getItem(`mockState_${cleanTag}`).then(async str => {
      let kidData: any = {};
      if (str) {
        try { kidData = normalizeBrandState(JSON.parse(str)); } catch(e){}
      } else {
        const kEmail = await AsyncStorage.getItem(`user_email_${cleanTag}`) || `${cleanTag}@growth.app`;
        kidData = {
          userEmail: kEmail,
          nickname: cleanTag,
          fullName: name || cleanTag,
          role: 'child',
          children: [],
          linkedParents: [currentParentTag],
          approvalStatus: 'pending',
          parentEmail: currentParentTag
        };
      }
      kidData.approvalStatus = 'pending';
      kidData.parentEmail = currentParentTag;
      kidData.linkedParents = Array.from(new Set([...(kidData.linkedParents || []), currentParentTag]));
      if (kidData.children && kidData.children.length > 0) {
        kidData.children = kidData.children.map((c: any) => ({ ...c, isApproved: false, initiatedBy: 'parent', linkedParents: kidData.linkedParents }));
      } else {
        kidData.children = [{
          id: 'usr_' + cleanTag,
          name: kidData.fullName || cleanTag,
          nickname: cleanTag,
          level: 1, xp: 0, coins: 0, tasks: [], wonPrizes: [], unlockedAvatars: ['default'], currentAvatar: 'default',
          linkedParents: kidData.linkedParents,
          isApproved: false,
          initiatedBy: 'parent'
        }];
      }
      await AsyncStorage.setItem(`mockState_${cleanTag}`, JSON.stringify(kidData));
    });

    // Retained only for migration from pre-UID development builds.
    if (LEGACY_NICKNAME_CLOUD_SYNC) try {
      // 1. Save updated children in Parent's Firestore user_data
      setDoc(doc(db, 'user_data', parentDocId), {
        children: updatedChildren,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore parent add child notice:', e));

      // 2. Direct write & query Kid's Firestore user_data
      const kidDocId = `usr_${cleanTag}`;
      const syncKidPending = async (kDocId: string) => {
        try {
          const kidSnap = await getDoc(doc(db, 'user_data', kDocId));
          const existingParents = kidSnap.exists() ? (kidSnap.data()?.linked_parents || []) : [];
          await setDoc(doc(db, 'user_data', kDocId), {
            approval_status: 'pending',
            parent_email: currentParentTag,
            linked_parents: Array.from(new Set([...existingParents, currentParentTag])),
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(`✅ Firestore: Parent @${currentParentTag} added Kid @${cleanTag} (doc: ${kDocId})`);
        } catch (err) {
          console.warn('Firestore kid pending sync error:', err);
        }
      };

      syncKidPending(kidDocId);

      const kQuery = query(collection(db, 'profiles'), where('nickname', '==', cleanTag));
      getDocs(kQuery).then(snap => {
        if (!snap.empty) {
          const customDocId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (customDocId !== kidDocId) {
            syncKidPending(customDocId);
          }
        }
      }).catch(e => console.warn('Firestore kid add lookup notice:', e));
    } catch(e) {}
  },

  removeChild: (childId: string) => {
    const childToRemove = get().children.find(c => c.id === childId);
    const filtered = get().children.filter(c => c.id !== childId);
    const newSelected = filtered.length > 0 ? filtered[0].id : null;
    const newTasks = filtered.length > 0 ? filtered[0].tasks : [];
    set({ children: filtered, selectedChildId: newSelected, tasks: newTasks });
    get().saveMockState();
    
    const parentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = `usr_${parentTag}`;

    // Cross-user local mock sync (Parent removes -> Kid)
    if (childToRemove) {
      const kidTag = childToRemove.nickname.toLowerCase().replace(/^@/, '');
      const kidDocId = `usr_${kidTag}`;
      if (CLOUD_SYNC_ENABLED && auth.currentUser) {
        findProfileByNickname(kidTag)
          .then((profile) => profile ? unlinkFamily(profile.uid, auth.currentUser!.uid, parentTag) : undefined)
          .catch((error) => console.warn('Could not unlink child:', error));
      }

      AsyncStorage.getItem(`mockState_${kidTag}`).then(str => {
        if (str) {
          try {
            const kidData = normalizeBrandState(JSON.parse(str));
            kidData.linkedParents = (kidData.linkedParents || []).filter((p: string) => p !== parentTag);
            if (kidData.parentEmail === parentTag) kidData.parentEmail = kidData.linkedParents[0] || null;
            if (kidData.linkedParents.length === 0) kidData.approvalStatus = null;
            AsyncStorage.setItem(`mockState_${kidTag}`, JSON.stringify(kidData));
          } catch(e){}
        }
      });

      // Retained only for migration from pre-UID development builds.
      if (LEGACY_NICKNAME_CLOUD_SYNC) try {
        setDoc(doc(db, 'user_data', parentDocId), {
          children: filtered,
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        getDoc(doc(db, 'user_data', kidDocId)).then(async snap => {
          if (snap.exists()) {
            const kData = normalizeBrandState(snap.data());
            const parents = (kData.linked_parents || []).filter((p: string) => p !== parentTag);
            await setDoc(doc(db, 'user_data', kidDocId), {
              linked_parents: parents,
              parent_email: parents[0] || null,
              approval_status: parents.length > 0 ? kData.approval_status : null,
              updated_at: new Date().toISOString()
            }, { merge: true });
          }
        }).catch(() => {});
      } catch(e) {}
    }
  },

  removeParent: (parentNickname: string) => {
    const cleanPTag = parentNickname.toLowerCase().replace(/^@/, '');
    const filtered = get().linkedParents.filter(p => p.toLowerCase().replace(/^@/, '') !== cleanPTag);
    set({ linkedParents: filtered, parentEmail: filtered.length > 0 ? filtered[0] : null });
    get().saveMockState();
    
    const kidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const kidDocId = `usr_${kidTag}`;
    const parentDocId = `usr_${cleanPTag}`;
    if (CLOUD_SYNC_ENABLED && auth.currentUser) {
      findProfileByNickname(cleanPTag)
        .then((profile) => profile ? unlinkFamily(auth.currentUser!.uid, profile.uid, cleanPTag) : undefined)
        .catch((error) => console.warn('Could not unlink parent:', error));
    }

    // Local AsyncStorage
    AsyncStorage.getItem(`mockState_${cleanPTag}`).then(str => {
      if (str) {
        try {
          const parentData = normalizeBrandState(JSON.parse(str));
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== kidTag);
            AsyncStorage.setItem(`mockState_${cleanPTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Retained only for migration from pre-UID development builds.
    if (LEGACY_NICKNAME_CLOUD_SYNC) try {
      setDoc(doc(db, 'user_data', kidDocId), {
        linked_parents: filtered,
        parent_email: filtered[0] || null,
        approval_status: filtered.length > 0 ? get().approvalStatus : null,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(() => {});

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.filter((c: any) => (c.nickname || '').toLowerCase() !== kidTag);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }).catch(() => {});
    } catch(e) {}
  },

  selectChild: (childId: string) => {
    const child = get().children.find(c => c.id === childId);
    if (child) {
      set({
        selectedChildId: childId,
        tasks: child.tasks || [],
        wonPrizes: child.wonPrizes || [],
        coins: child.coins || 0,
        ...rewardState(child),
        level: child.level || 1,
        xp: child.xp || 0,
        currentAvatar: child.currentAvatar || 'default',
        unlockedAvatars: child.unlockedAvatars || ['default'],
        epicBossTask: child.epicBossTask || get().epicBossTask || '30-min deep focus block 🧠',
        epicBossXP: child.epicBossXP || get().epicBossXP || 35,
      });
    }
  },
  setDailyMood: (mood) => {
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
    const cleanNick = (nickname || '').trim().toLowerCase().replace(/^@/, '');
    let cleanEmail = email.trim().toLowerCase();
    
    // Auto-complete email format if user entered plain text like "tako"
    if (cleanEmail && !cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@questhero.app`;
    }

    if (!cleanNick || !password || !cleanEmail) {
      return { success: false, message: i18n.t('fill_all_fields', 'Please fill in Name, Nickname, Email, and Password!') };
    }

    // 1. Check local storage for nickname uniqueness
    try {
      const existingOwner = await AsyncStorage.getItem(`nickname_owner_${cleanNick}`);
      if (existingOwner && existingOwner.toLowerCase() !== cleanEmail) {
        return {
          success: false,
          message: i18n.t('nickname_taken', `?? Nickname @${cleanNick} is already taken by another account!`, { nickname: cleanNick })
        };
      }
    } catch (e) {}

    // Remote nickname checks resume with the secure server-owned profile model.
    if (CLOUD_SYNC_ENABLED) try {
      const q = query(collection(db, 'profiles'), where('nickname', '==', cleanNick));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingProfiles = querySnapshot.docs.map(d => d.data());
        const otherUser = existingProfiles.find(p => p.email && p.email.toLowerCase() !== cleanEmail);
        if (otherUser) {
          return {
            success: false,
            message: i18n.t('nickname_taken', `?? Nickname @${cleanNick} is already taken by another account!`, { nickname: cleanNick })
          };
        }
      }
    } catch (e) {}

    let firebaseUid: string | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
      firebaseUid = userCredential.user.uid;
    } catch (firebaseAuthErr: any) {
      console.warn('Firebase Auth registration failed:', firebaseAuthErr?.message || firebaseAuthErr);
      return { success: false, message: firebaseAuthErr?.message || 'Registration failed. Please try again.' };
    }

    const chosenRole = role || 'child';
    const finalUserId = firebaseUid as string;
    set({
      userEmail: cleanEmail,
      fullName,
      nickname: cleanNick,
      role: chosenRole,
      userId: finalUserId
    });

    await AsyncStorage.setItem(`nickname_owner_${cleanNick}`, cleanEmail);
    await AsyncStorage.setItem(`user_email_${cleanNick}`, cleanEmail);
    await AsyncStorage.setItem(`user_name_${cleanNick}`, fullName);
    await AsyncStorage.setItem(`user_role_${cleanNick}`, chosenRole);

    // Initial cloud profile creation resumes with the secure server model.
    if (CLOUD_SYNC_ENABLED) try {
      await saveCloudProfile({ full_name: fullName, nickname: cleanNick, role: chosenRole });
      await saveOwnCloudData({
        tasks: get().tasks || [],
        prizes: get().prizes || [],
        won_prizes: get().wonPrizes || [],
        unlocked_avatars: get().unlockedAvatars || ['default'],
        linked_parent_nicknames: get().linkedParents || [],
        coins: get().coins || 0,
        xp: get().xp || 0,
        level: get().level || 1,
        current_avatar: get().currentAvatar || 'default',
      });
    } catch (e) {
      console.warn('Firestore initial sync note:', e);
    }

    await get().saveMockState();
    return { success: true, message: 'Registration successful! Welcome to Quest Champ!' };
  },

  loginWithEmail: async (email, password) => {
    const cleanInput = email.trim().toLowerCase().replace(/^@/, '');
    
    if (!cleanInput || !password) {
      return { success: false, message: i18n.t('fill_all_fields', 'Please enter Email/Nickname and Password!') };
    }

    const cleanEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@questhero.app`;
    const userTag = cleanInput.split('@')[0];

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      const meta = user.displayName ? { full_name: user.displayName, nickname: user.displayName } : {};
      let restoredRole: UserRole = get().role || 'child';
      
      try {
        const savedRole = await AsyncStorage.getItem(`user_role_${userTag}`);
        if (savedRole === 'parent' || savedRole === 'child') {
          restoredRole = savedRole as UserRole;
        }
      } catch (e) {}

      set({
        userEmail: user.email || cleanEmail,
        userId: user.uid,
        fullName: meta.full_name || userTag,
        nickname: meta.nickname || userTag,
        role: restoredRole
      });

      await AsyncStorage.setItem('active_user_tag', userTag);
      await get().loadMockState();
      return { success: true, message: 'Signed in. Your progress can now sync securely across devices.' };
    } catch (err: any) {
      console.warn('Firebase Auth login failed:', err?.message || err);
      return { success: false, message: err?.message || 'Login failed. Please check your credentials.' };
    }
  },

  signInWithGoogle: async (idToken, accessToken, role) => {
    if (!idToken) {
      return { success: false, message: 'Google did not return an ID token.' };
    }

    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      const email = user.email || '';
      const fallbackNickname = (email.split('@')[0] || 'hero').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const chosenRole: UserRole = role || 'child';

      set({
        userEmail: email,
        userId: user.uid,
        fullName: user.displayName || fallbackNickname,
        nickname: fallbackNickname,
        role: chosenRole,
      });

      await AsyncStorage.setItem(`user_role_${fallbackNickname}`, chosenRole || 'child');
      await AsyncStorage.setItem('active_user_tag', fallbackNickname);
      if (CLOUD_SYNC_ENABLED) {
        await saveCloudProfile({
          full_name: user.displayName || fallbackNickname,
          nickname: fallbackNickname,
          role: chosenRole || 'child',
        });
        await saveOwnCloudData({});
      }
      await get().saveMockState();
      return { success: true, message: 'Signed in. Your progress can now sync securely across devices.' };
    } catch (err: any) {
      console.warn('Firebase Google sign-in failed:', err?.message || err);
      return { success: false, message: err?.message || 'Google sign-in failed.' };
    }
  },

  sendMagicLink: async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://quest-hero-dab6b.firebaseapp.com';
      await sendSignInLinkToEmail(auth, email, {
        url: redirectUrl,
        handleCodeInApp: true
      });
      return { success: true, message: `Magic link sent to ${email}! Check your inbox.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Could not send the magic link.' };
    }
  },

  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: `Password reset instructions sent to ${email}!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Could not send the password reset email.' };
    }
  },

  syncToServer: async () => {
    if (!CLOUD_SYNC_ENABLED) return;
    try {
      const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
      const { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP } = get();
      if (!userEmail || userId === 'guest-local') return;

      const profileData = { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP };
      await AsyncStorage.setItem(`user_profile_${userEmail}`, JSON.stringify(profileData));

      if (isOnline) {
        const userTag = (nickname || userEmail.split('@')[0] || '').toLowerCase().replace(/^@/, '');
        if (role === 'parent' || role === 'child') {
          await saveCloudProfile({ full_name: fullName || userTag, nickname: userTag, role });
        }
        await saveOwnCloudData({
          tasks: tasks,
          prizes: prizes,
          won_prizes: wonPrizes,
          unlocked_avatars: unlockedAvatars,
          linked_parent_nicknames: linkedParents,
          epicBossTask: epicBossTask,
          epicBossXP: epicBossXP,
          coins,
          xp,
          level,
          current_avatar: currentAvatar,
          active_theme: get().activeTheme,
          unlocked_themes: get().unlockedThemes,
          active_background: get().activeBackground,
          unlocked_backgrounds: get().unlockedBackgrounds,
          last_spin_date: get().lastSpinDate,
          total_earned: get().totalEarned,
          daily_earnings: get().dailyEarnings,
          reward_goal: get().rewardGoal,
          last_active_date: get().lastActiveDate,
          approval_status: get().approvalStatus,
        });
        if (role === 'parent' && get().selectedChildId) {
          const selectedChild = children.find((child) => child.id === get().selectedChildId);
          if (selectedChild && !selectedChild.id.startsWith('usr_')) {
            await saveLinkedChildData(selectedChild.id, {
              tasks: selectedChild.tasks,
              won_prizes: selectedChild.wonPrizes,
              coins: selectedChild.coins,
              xp: selectedChild.xp,
              level: selectedChild.level,
              current_avatar: selectedChild.currentAvatar,
              epicBossTask: selectedChild.epicBossTask,
              epicBossXP: selectedChild.epicBossXP,
              total_earned: rewardState(selectedChild).totalEarned,
              daily_earnings: rewardState(selectedChild).dailyEarnings,
              reward_goal: selectedChild.rewardGoal || null,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Offline mode active - server sync deferred until online:', err);
    }
  },
  
  loadMockState: async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user_language');
      const activeTag = await AsyncStorage.getItem('active_user_tag');
      const currentNick = (get().nickname || get().userEmail?.split('@')[0] || activeTag || '').toLowerCase().replace(/^@/, '');
      
      let lang: AppLanguage = 'en';
      if (savedLang === 'cs' || savedLang === 'en' || savedLang === 'es' || savedLang === 'de') {
        lang = savedLang as AppLanguage;
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
        const todayStr = localDateKey();

        if (data) {
          const parsed = normalizeBrandState(JSON.parse(data));
          if (parsed && typeof parsed === 'object') {
            if (!parsed.userEmail) {
              set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
              return;
            }
            if (!savedLang && (parsed.language === 'cs' || parsed.language === 'en' || parsed.language === 'es' || parsed.language === 'de')) {
              lang = parsed.language as AppLanguage;
            }
            const rawTasks: Task[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
            const storedLastDate = parsed.lastActiveDate || null;
            const isNewDay = storedLastDate !== todayStr;

            const validTasks = isNewDay
              ? rawTasks.map((t) => freshTaskDay(t, todayStr))
              : rawTasks;

            const rawChildren: ChildProfile[] = Array.isArray(parsed.children) ? parsed.children : [];
            const validChildren: ChildProfile[] = isNewDay
              ? rawChildren.map((c: any) => ({ ...c, ...rewardState(c), tasks: c.tasks?.map((t: Task) => freshTaskDay(t, todayStr)) } as ChildProfile))
              : rawChildren;

            const rawWonPrizes = Array.isArray(parsed.wonPrizes) ? parsed.wonPrizes : [];
            const normalizedWonPrizes: WonPrize[] = rawWonPrizes.map((wp: any, idx: number) => ({
              id: wp.id || `won_${idx}_${Date.now()}`,
              prize: typeof wp === 'string' ? wp : (wp.prize || 'Prize 🎁'),
              date: wp.date || new Date().toISOString(),
              redeemed: Boolean(wp.redeemed),
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
              tasks: validTasks,
              children: validChildren,
              selectedChildId: parsed.selectedChildId || (validChildren[0]?.id || null),
              linkedParents: Array.isArray(parsed.linkedParents) ? parsed.linkedParents : [],
              approvalStatus: parsed.approvalStatus || null,
              lastActiveDate: todayStr,
              prizes: Array.isArray(parsed.prizes) && parsed.prizes.length > 0 ? parsed.prizes : ['Family surprise 🎁', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
              wonPrizes: normalizedWonPrizes,
              coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
              ...rewardState(parsed),
              unlockedAvatars: Array.isArray(parsed.unlockedAvatars) && parsed.unlockedAvatars.length > 0 ? parsed.unlockedAvatars : ['default'],
              currentAvatar: parsed.currentAvatar || 'default',
              activeTheme: parsed.activeTheme || 'classic',
              unlockedThemes: Array.isArray(parsed.unlockedThemes) && parsed.unlockedThemes.length > 0 ? parsed.unlockedThemes : ['classic'],
              activeBackground: parsed.activeBackground || 'clean',
              unlockedBackgrounds: Array.isArray(parsed.unlockedBackgrounds) && parsed.unlockedBackgrounds.length > 0 ? parsed.unlockedBackgrounds : ['clean'],
              lastSpinDate: parsed.lastSpinDate || null,
              dailyMood: isNewDay ? null : (parsed.dailyMood || null),
              language: lang,
              epicBossTask: parsed.epicBossTask || '30-min deep focus block 🧠',
              epicBossXP: typeof parsed.epicBossXP === 'number' ? parsed.epicBossXP : 35,
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

      // Cross-device Firestore refresh. Local state remains the offline fallback.
      const effectiveTag = (get().nickname || get().userEmail?.split('@')[0] || currentNick || activeTag || '').toLowerCase().replace(/^@/, '');
      if (CLOUD_SYNC_ENABLED && effectiveTag && auth.currentUser) {
        try {
          const cloudRaw = await loadOwnCloudData();
          if (cloudRaw) {
            const cloudData = normalizeBrandState(cloudRaw);
            const currentRole = get().role;

            if (currentRole === 'parent') {
              const [linkedRows, invites] = await Promise.all([loadLinkedChildren(), listFamilyInvites()]);
              const cloudChildren: ChildProfile[] = linkedRows.map(({ profile, data }) => ({
                id: profile.uid,
                name: profile.full_name || profile.nickname,
                nickname: profile.nickname,
                level: typeof data.level === 'number' ? data.level : 1,
                xp: typeof data.xp === 'number' ? data.xp : 0,
                coins: typeof data.coins === 'number' ? data.coins : 0,
                ...rewardState(data, true),
                tasks: Array.isArray(data.tasks) ? data.tasks.map((task: Task) => freshTaskDay(task)) : [],
                wonPrizes: Array.isArray(data.won_prizes) ? data.won_prizes : [],
                unlockedAvatars: Array.isArray(data.unlocked_avatars) ? data.unlocked_avatars : ['default'],
                currentAvatar: data.current_avatar || 'default',
                linkedParents: Array.isArray(data.linked_parent_nicknames) ? data.linked_parent_nicknames : [effectiveTag],
                isApproved: true,
                epicBossTask: data.epicBossTask,
                epicBossXP: data.epicBossXP,
              }));
              for (const invite of invites.filter((item) => item.parent_uid === auth.currentUser?.uid && item.status === 'pending')) {
                if (!cloudChildren.some((child) => child.id === invite.child_uid)) {
                  cloudChildren.push({
                    id: invite.child_uid,
                    name: invite.child_nickname,
                    nickname: invite.child_nickname,
                    level: 1,
                    xp: 0,
                    coins: 0,
                    tasks: [],
                    wonPrizes: [],
                    unlockedAvatars: ['default'],
                    currentAvatar: 'default',
                    linkedParents: [effectiveTag],
                    isApproved: false,
                    initiatedBy: invite.created_by === invite.parent_uid ? 'parent' : 'kid',
                  });
                }
              }
              if (cloudChildren.length > 0) {
                const activeSelected = get().selectedChildId || (cloudChildren[0]?.id || null);
                const activeChild = cloudChildren.find(c => c.id === activeSelected) || cloudChildren[0];
                
                set({
                  children: cloudChildren,
                  selectedChildId: activeChild.id,
                  tasks: activeChild?.tasks || get().tasks,
                  coins: activeChild.coins,
                  xp: activeChild.xp,
                  level: activeChild.level,
                  wonPrizes: activeChild.wonPrizes,
                  currentAvatar: activeChild.currentAvatar,
                  unlockedAvatars: activeChild.unlockedAvatars,
                  ...rewardState(activeChild),
                  epicBossTask: activeChild?.epicBossTask || cloudData.epicBossTask || get().epicBossTask,
                  epicBossXP: typeof activeChild?.epicBossXP === 'number' ? activeChild.epicBossXP : (typeof cloudData.epicBossXP === 'number' ? cloudData.epicBossXP : get().epicBossXP)
                });

                const stateObj = { ...get(), children: cloudChildren };
                AsyncStorage.setItem(`mockState_${effectiveTag}`, JSON.stringify(stateObj)).catch(() => {});
              }
            } else {
              // Child Role Sync
              const updates: any = {};
              if (cloudData.approval_status !== undefined && cloudData.approval_status !== get().approvalStatus) {
                updates.approvalStatus = cloudData.approval_status;
              }
              if (Array.isArray(cloudData.linked_parent_nicknames)) {
                const mergedParents = Array.from(new Set([...(get().linkedParents || []), ...cloudData.linked_parent_nicknames]));
                updates.linkedParents = mergedParents;
                updates.parentEmail = mergedParents[0] || null;
                if (mergedParents.length > 0) updates.approvalStatus = 'approved';
              }
              if (Array.isArray(cloudData.tasks)) {
                updates.tasks = cloudData.tasks.map((task: Task) => freshTaskDay(task));
              }
              if (typeof cloudData.coins === 'number') updates.coins = cloudData.coins;
              Object.assign(updates, rewardState(cloudData, true));
              if (Array.isArray(cloudData.won_prizes)) updates.wonPrizes = cloudData.won_prizes;
              if (typeof cloudData.xp === 'number') updates.xp = cloudData.xp;
              if (typeof cloudData.level === 'number') updates.level = cloudData.level;
              if (typeof cloudData.current_avatar === 'string') updates.currentAvatar = cloudData.current_avatar;
              if (typeof cloudData.active_background === 'string') updates.activeBackground = cloudData.active_background;
              if (Array.isArray(cloudData.unlocked_backgrounds)) updates.unlockedBackgrounds = cloudData.unlocked_backgrounds;
              if (cloudData.epicBossTask) {
                updates.epicBossTask = cloudData.epicBossTask;
                if (typeof cloudData.epicBossXP === 'number') {
                  updates.epicBossXP = cloudData.epicBossXP;
                }
              }
              const pendingInvite = (await listFamilyInvites()).find((invite) => invite.child_uid === auth.currentUser?.uid && invite.status === 'pending');
              if (pendingInvite && !updates.parentEmail) {
                updates.parentEmail = pendingInvite.parent_nickname;
                updates.approvalStatus = 'pending';
              }
              if (Object.keys(updates).length > 0) {
                set(updates);
                const stateObj = { ...get(), ...updates };
                AsyncStorage.setItem(`mockState_${effectiveTag}`, JSON.stringify(stateObj)).catch(() => {});
              }
            }
          }
        } catch (cloudErr) {
          // Resilient fallback for offline
        }
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  },
  clearAllData: async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('Failed to clear async storage:', e);
    }
    const todayStr = localDateKey();
    set({
      userEmail: null,
      userId: null,
      fullName: null,
      nickname: null,
      role: null,
      isSick: false,
      xp: 0,
      level: 1,
      tasks: [], // 0 quests for kids starting first time!
      prizes: ['Family surprise 🎁', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
      wonPrizes: [],
      coins: 0,
      totalEarned: 0,
      dailyEarnings: { date: localDateKey(), coins: 0 },
      rewardGoal: null,
      unlockedAvatars: ['default'],
      currentAvatar: 'default',
      activeTheme: 'classic',
      unlockedThemes: ['classic'],
      activeBackground: 'clean',
      unlockedBackgrounds: ['clean'],
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
      const { isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, activeBackground, unlockedBackgrounds, lastSpinDate, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role } = get();
      if (!userEmail) {
        await AsyncStorage.removeItem('active_user_tag');
        await AsyncStorage.removeItem('mockState');
        return;
      }
      const userTag = (nickname || userEmail.split('@')[0]).toLowerCase().replace(/^@/, '');
      const stateObj = { ...rewardState(get()), isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, activeBackground, unlockedBackgrounds, lastSpinDate, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role };
      
      await AsyncStorage.setItem('active_user_tag', userTag);
      await AsyncStorage.setItem('mockState', JSON.stringify(stateObj));
      if (userTag) {
        await AsyncStorage.setItem(`mockState_${userTag}`, JSON.stringify(stateObj));
      }
      get().syncToServer();
    } catch (e) {
      console.error('Failed to save state', e);
    }
  },
}));
