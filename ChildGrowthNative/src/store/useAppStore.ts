// App global state store
import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut, sendSignInLinkToEmail, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { playSound } from '../lib/sound';
import { ThemeKey } from '../constants/theme';
import { calculateQuestReward, getAvatarSkillConfig, QuestRewardCalculation } from '../utils/avatarSkills';

export const DEFAULT_STARTER_TASKS: Task[] = [
  { id: 'starter_1', name: 'Brush your teeth 🪥', icon: '🪥', done: false, diff: 'easy', freq: 'daily', mystery: false, date: new Date().toISOString().split('T')[0] },
  { id: 'starter_2', name: 'Make your bed 🛏️', icon: '🛏️', done: false, diff: 'easy', freq: 'daily', mystery: true, date: new Date().toISOString().split('T')[0] },
  { id: 'starter_3', name: '15m Reading or Homework 📚', icon: '📚', done: false, diff: 'med', freq: 'weekdays', mystery: false, date: new Date().toISOString().split('T')[0] },
];

export type UserRole = 'parent' | 'child' | null;

export interface Task {
  id: string;
  name: string;
  diff: 'easy' | 'med' | 'hard';
  freq: 'daily' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'weekdays' | 'weekends';
  mystery: boolean;
  done: boolean;
  date: string;
  icon?: string;
  requiresApproval?: boolean;
  pendingApproval?: boolean;
  verificationNote?: string;
}

export interface WonPrize {
  id: string;
  prize: string;
  date: string;
  redeemed: boolean;
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
  activeTheme: ThemeKey;
  unlockedThemes: ThemeKey[];
  lastSpinDate: string | null;
  parentEmail: string | null;
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
  continueAsGuest: () => Promise<void>;
  setSick: (sick: boolean) => void;
  addXP: (amount: number, coinAmount?: number) => void;
  addTask: (task: Omit<Task, 'id' | 'done' | 'date'>) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  toggleTaskDone: (id: string, forceCritical?: boolean) => QuestRewardCalculation | null;
  claimEpicBoss: () => QuestRewardCalculation | null;
  claimDailyLoginChest: () => { coins: number; xp: number } | null;
  setSuperchargedTask: (taskId: string | null) => void;
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
  claimDailySpin: (rewardType: 'coins' | 'xp', amount: number) => void;
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
  lastActiveDate: new Date().toISOString().split('T')[0],
  xp: 0,
  level: 1,
  streak: 1,
  epicClaimedDate: null,
  dailyChestClaimedDate: null,
  superchargedTaskId: null,
  tasks: [], // Kids start with 0 quests first time (auto-hydrates starter quests on interaction)
  prizes: ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
  wonPrizes: [],
  coins: 0,
  unlockedAvatars: ['default'],
  currentAvatar: 'default',
  activeTheme: 'classic',
  unlockedThemes: ['classic'],
  lastSpinDate: null,
  parentEmail: null,
  linkedParents: [],
  children: [],
  selectedChildId: null,
  approvalStatus: null,
  dailyMood: null,
  epicBossTask: '30-min deep focus block 🧠',
  epicBossXP: 35,
  
  logout: async () => {
    try {
      const userTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
      if (userTag) {
        const { isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role } = get();
        const stateObj = { isSick, xp, level, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role };
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

    const todayStr = new Date().toISOString().split('T')[0];
    set({
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
      dailyChestClaimedDate: null,
      superchargedTaskId: null,
      prizes: ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
      wonPrizes: [],
      coins: 0,
      unlockedAvatars: ['default'],
      currentAvatar: 'default',
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
      userEmail: 'guest@questblox.local',
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
    const todayStr = new Date().toISOString().split('T')[0];
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
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    get().saveMockState();
  },
  toggleTaskDone: (id, forceCritical) => {
    let currentTasks = get().tasks;
    // Auto-hydrate starter tasks if child taps a starter task while tasks is empty (fixes cold-start UX)
    if (currentTasks.length === 0 && DEFAULT_STARTER_TASKS.some(st => st.id === id)) {
      const todayStr = new Date().toISOString().split('T')[0];
      currentTasks = DEFAULT_STARTER_TASKS.map(st => ({ ...st, date: todayStr }));
    }

    const task = currentTasks.find((t) => t.id === id);
    if (!task) return null;
    
    const isNowDone = !task.done;
    
    let baseXp = 10;
    if (task.diff === 'med') baseXp = 20;
    if (task.diff === 'hard') baseXp = 35;
    if (task.mystery) baseXp += 10;

    const completedCount = currentTasks.filter(t => t.done && t.id !== id).length;
    const isSupercharged = get().superchargedTaskId === id;

    const reward = calculateQuestReward(
      baseXp,
      task.diff,
      get().currentAvatar,
      isNowDone ? forceCritical : false,
      isNowDone ? completedCount : 0,
      isSupercharged
    );
    
    const updatedTasks = currentTasks.map((t) => (t.id === id ? { ...t, done: isNowDone } : t));
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
  claimEpicBoss: () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (get().epicClaimedDate === todayStr) {
      return null;
    }
    const baseBossXp = get().epicBossXP || 35;
    const completedTasksCount = get().tasks.filter(t => t.done).length;
    const reward = calculateQuestReward(baseBossXp, 'boss', get().currentAvatar, false, completedTasksCount);
    set({ epicClaimedDate: todayStr });
    get().addXP(reward.xpGain, reward.coinGain);
    return reward;
  },
  claimDailyLoginChest: () => {
    const todayStr = new Date().toISOString().split('T')[0];
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
    set({ superchargedTaskId: taskId });
    get().saveMockState();
  },
  resetTasksForNewDay: () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const prevTasks = get().tasks;
    const hadCompletedYesterday = prevTasks.some((t) => t.done) || Boolean(get().epicClaimedDate);
    const hasShield = Boolean(getAvatarSkillConfig(get().currentAvatar).hasStreakShield) || get().isSick;
    const nextStreak = hadCompletedYesterday ? get().streak + 1 : (hasShield ? Math.max(1, get().streak) : 1);

    const resetTasksList = prevTasks.map((t) => ({ ...t, done: false, date: todayStr }));
    
    set((state) => ({
      lastActiveDate: todayStr,
      dailyMood: null,
      epicClaimedDate: null,
      streak: nextStreak,
      tasks: resetTasksList,
      children: state.children.map(child => ({
        ...child,
        tasks: child.tasks.map(t => ({ ...t, done: false, date: todayStr }))
      }))
    }));
    get().saveMockState();
  },
  deleteAllTasks: () => {
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
    if (coins >= amount) {
      set({ coins: coins - amount });
      get().saveMockState();
      return true;
    }
    return false;
  },
  unlockAvatar: (avatarId) => {
    set((state) => ({
      unlockedAvatars: [...state.unlockedAvatars, avatarId]
    }));
    get().saveMockState();
  },
  setCurrentAvatar: (avatarId) => {
    set({ currentAvatar: avatarId });
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
  claimDailySpin: (rewardType: 'coins' | 'xp', amount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (rewardType === 'coins') {
      set({ coins: get().coins + amount, lastSpinDate: todayStr });
      playSound('coin');
    } else {
      get().addXP(amount);
      set({ lastSpinDate: todayStr });
      playSound('levelup');
    }
    get().saveMockState();
  },
  submitTaskForApproval: (taskId: string, note?: string) => {
    const updatedTasks = get().tasks.map(t => t.id === taskId ? { ...t, pendingApproval: true, verificationNote: note || 'Completed! Waiting for parent review 📸' } : t);
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
              const pData = JSON.parse(str);
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
        const updatedTasks = c.tasks.map(t => {
          if (t.id === taskId) {
            if (approved) {
              return { ...t, done: true, pendingApproval: false };
            } else {
              return { ...t, done: false, pendingApproval: false };
            }
          }
          return t;
        });
        
        let bonusXP = 0;
        let bonusCoins = 0;
        if (approved) {
          const targetTask = c.tasks.find(t => t.id === taskId);
          bonusXP = targetTask?.diff === 'hard' ? 35 : (targetTask?.diff === 'med' ? 20 : 10);
          bonusCoins = bonusXP;
        }

        return {
          ...c,
          tasks: updatedTasks,
          xp: Math.max(0, c.xp + bonusXP),
          coins: Math.max(0, c.coins + bonusCoins),
          level: Math.floor((c.xp + bonusXP) / 100) + 1
        };
      }
      return c;
    });

    set({ children: updatedChildren });
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
    
    // Cross-user local mock sync (Kid -> Parent)
    AsyncStorage.getItem(`mockState_${cleanParentTag}`).then(async str => {
      let parentData: any = {};
      if (str) {
        try { parentData = JSON.parse(str); } catch(e){}
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
          prizes: ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑']
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

    // Cross-Device FIRESTORE Cloud Sync (Kid -> Parent)
    try {
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

      // Cross-user local mock sync (Parent approves -> Kid)
      AsyncStorage.getItem(`mockState_${kidTag}`).then(str => {
        if (str) {
          try {
            const kidData = JSON.parse(str);
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

      // Cross-Device FIRESTORE Cloud Sync (Parent approves -> Kid)
      try {
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
    
    // Cross-user local mock sync (Kid accepts -> Parent)
    AsyncStorage.getItem(`mockState_${currentParentTag}`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.map((c: any) => c.nickname.toLowerCase() === currentKidTag ? { ...c, isApproved: true } : c);
            AsyncStorage.setItem(`mockState_${currentParentTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Cross-Device FIRESTORE Cloud Sync
    try {
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
    
    // Cross-user local mock sync (Kid denies -> Parent)
    AsyncStorage.getItem(`mockState_${pTag}`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== currentKidTag);
            AsyncStorage.setItem(`mockState_${pTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Cross-Device FIRESTORE Cloud Sync
    try {
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
    
    // Cross-user local mock sync (Parent -> Kid)
    AsyncStorage.getItem(`mockState_${cleanTag}`).then(async str => {
      let kidData: any = {};
      if (str) {
        try { kidData = JSON.parse(str); } catch(e){}
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

    // Cross-Device FIRESTORE Cloud Sync (Parent adds Kid)
    try {
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

      AsyncStorage.getItem(`mockState_${kidTag}`).then(str => {
        if (str) {
          try {
            const kidData = JSON.parse(str);
            kidData.linkedParents = (kidData.linkedParents || []).filter((p: string) => p !== parentTag);
            if (kidData.parentEmail === parentTag) kidData.parentEmail = kidData.linkedParents[0] || null;
            if (kidData.linkedParents.length === 0) kidData.approvalStatus = null;
            AsyncStorage.setItem(`mockState_${kidTag}`, JSON.stringify(kidData));
          } catch(e){}
        }
      });

      // Firestore Cloud Sync
      try {
        setDoc(doc(db, 'user_data', parentDocId), {
          children: filtered,
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        getDoc(doc(db, 'user_data', kidDocId)).then(async snap => {
          if (snap.exists()) {
            const kData = snap.data();
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

    // Local AsyncStorage
    AsyncStorage.getItem(`mockState_${cleanPTag}`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== kidTag);
            AsyncStorage.setItem(`mockState_${cleanPTag}`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Firestore Cloud Sync
    try {
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
        level: child.level || 1,
        xp: child.xp || 0,
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
      cleanEmail = `${cleanEmail}@questblox.app`;
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

    // 2. Check Firestore for nickname uniqueness
    try {
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
    const docId = finalUserId.replace(/[^a-zA-Z0-9_-]/g, '_');

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

    // Sync immediately to Firestore
    try {
      await setDoc(doc(db, 'profiles', docId), {
        email: cleanEmail,
        full_name: fullName,
        nickname: cleanNick,
        role: chosenRole,
        coins: get().coins || 0,
        xp: get().xp || 0,
        level: get().level || 1,
        current_avatar: get().currentAvatar || 'default',
        updated_at: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'user_data', docId), {
        tasks: get().tasks || [],
        prizes: get().prizes || [],
        won_prizes: get().wonPrizes || [],
        unlocked_avatars: get().unlockedAvatars || ['default'],
        children: get().children || [],
        linked_parents: get().linkedParents || [],
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore initial sync note:', e);
    }

    await get().saveMockState();
    return { success: true, message: 'Registration successful! Welcome to QuestBlox ??' };
  },

  loginWithEmail: async (email, password) => {
    const cleanInput = email.trim().toLowerCase().replace(/^@/, '');
    
    if (!cleanInput || !password) {
      return { success: false, message: i18n.t('fill_all_fields', 'Please enter Email/Nickname and Password!') };
    }

    const cleanEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@questblox.app`;
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
      return { success: true, message: 'Welcome back! Synced with server.' };
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
      const docId = user.uid.replace(/[^a-zA-Z0-9_-]/g, '_');

      let chosenRole: UserRole = role || 'child';
      try {
        const existingProfile = await getDoc(doc(db, 'profiles', docId));
        const existingRole = existingProfile.data()?.role;
        if (existingRole === 'parent' || existingRole === 'child') chosenRole = existingRole;
      } catch (profileError) {
        console.warn('Google profile lookup note:', profileError);
      }

      set({
        userEmail: email,
        userId: user.uid,
        fullName: user.displayName || fallbackNickname,
        nickname: fallbackNickname,
        role: chosenRole,
      });

      await setDoc(doc(db, 'profiles', docId), {
        email,
        full_name: user.displayName || fallbackNickname,
        nickname: fallbackNickname,
        role: chosenRole,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      await AsyncStorage.setItem(`user_role_${fallbackNickname}`, chosenRole || 'child');
      await AsyncStorage.setItem('active_user_tag', fallbackNickname);
      await get().saveMockState();
      return { success: true, message: 'Welcome to QuestBlox!' };
    } catch (err: any) {
      console.warn('Firebase Google sign-in failed:', err?.message || err);
      return { success: false, message: err?.message || 'Google sign-in failed.' };
    }
  },

  sendMagicLink: async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://questblox-10c14.firebaseapp.com';
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
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://questblox-10c14.firebaseapp.com';
      await sendPasswordResetEmail(auth, email, {
        url: redirectUrl
      });
      return { success: true, message: `Password reset instructions sent to ${email}!` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Could not send the password reset email.' };
    }
  },

  syncToServer: async () => {
    try {
      const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
      const { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP } = get();
      if (!userEmail || userId === 'guest-local') return;

      const profileData = { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP };
      await AsyncStorage.setItem(`user_profile_${userEmail}`, JSON.stringify(profileData));

      if (isOnline) {
        const userTag = (nickname || userEmail.split('@')[0] || '').toLowerCase().replace(/^@/, '');
        const docId = (userId || `usr_${userTag}`).replace(/[^a-zA-Z0-9_-]/g, '_');

        await setDoc(doc(db, 'profiles', docId), {
          email: userEmail,
          full_name: fullName,
          nickname: nickname,
          role: role,
          coins: coins,
          xp: xp,
          level: level,
          current_avatar: currentAvatar,
          updated_at: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'user_data', docId), {
          tasks: tasks,
          prizes: prizes,
          won_prizes: wonPrizes,
          unlocked_avatars: unlockedAvatars,
          children: children,
          linked_parents: linkedParents,
          epicBossTask: epicBossTask,
          epicBossXP: epicBossXP,
          updated_at: new Date().toISOString()
        }, { merge: true });

        // If Parent: Also sync assigned tasks and epic boss to each child's own user_data doc
        if (role === 'parent' && Array.isArray(children)) {
          for (const child of children) {
            if (child.nickname) {
              const childTag = child.nickname.toLowerCase().replace(/^@/, '');
              const childDocId = `usr_${childTag}`;
              setDoc(doc(db, 'user_data', childDocId), {
                tasks: child.tasks || [],
                epicBossTask: child.epicBossTask || epicBossTask,
                epicBossXP: typeof child.epicBossXP === 'number' ? child.epicBossXP : epicBossXP,
                updated_at: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          }
        }

        // If Child: Sync quest completion and XP up to each linked parent's user_data doc
        if (role === 'child' && Array.isArray(linkedParents) && linkedParents.length > 0) {
          for (const parentTag of linkedParents) {
            const cleanPTag = parentTag.toLowerCase().replace(/^@/, '');
            const pDocId = `usr_${cleanPTag}`;
            getDoc(doc(db, 'user_data', pDocId)).then(async pSnap => {
              if (pSnap.exists()) {
                const pData = pSnap.data();
                const pChildren = Array.isArray(pData.children) ? pData.children : [];
                const idx = pChildren.findIndex((c: any) => (c.nickname || '').toLowerCase() === userTag);
                if (idx >= 0) {
                  pChildren[idx] = {
                    ...pChildren[idx],
                    xp,
                    level,
                    coins,
                    tasks,
                    wonPrizes,
                    currentAvatar,
                    updated_at: new Date().toISOString()
                  };
                  await setDoc(doc(db, 'user_data', pDocId), { children: pChildren }, { merge: true });
                }
              }
            }).catch(() => {});
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
      
      let lang: 'en' | 'cs' = 'en';
      if (savedLang === 'cs' || savedLang === 'en') {
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
        const todayStr = new Date().toISOString().split('T')[0];

        if (data) {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.userEmail) {
              set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
              return;
            }
            if (!savedLang && (parsed.language === 'cs' || parsed.language === 'en')) {
              lang = parsed.language;
            }
            const rawTasks: Task[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
            const storedLastDate = parsed.lastActiveDate || null;
            const isNewDay = storedLastDate !== todayStr;

            const validTasks = isNewDay
              ? rawTasks.map((t) => ({ ...t, done: false, date: todayStr }))
              : rawTasks;

            const rawChildren: ChildProfile[] = Array.isArray(parsed.children) ? parsed.children : [];
            const validChildren: ChildProfile[] = isNewDay
              ? rawChildren.map((c: any) => ({ ...c, tasks: c.tasks?.map((t: any) => ({ ...t, done: false, date: todayStr })) } as ChildProfile))
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

            const prevStreak = typeof parsed.streak === 'number' && parsed.streak > 0 ? parsed.streak : 1;
            const hadCompletedYesterday = rawTasks.some((t: any) => t?.done) || Boolean(parsed.epicClaimedDate);
            const hasShield = Boolean(getAvatarSkillConfig(parsed.currentAvatar).hasStreakShield) || Boolean(parsed.isSick);
            const restoredStreak = isNewDay
              ? (hadCompletedYesterday ? prevStreak + 1 : (hasShield ? prevStreak : 1))
              : prevStreak;

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
              prizes: Array.isArray(parsed.prizes) && parsed.prizes.length > 0 ? parsed.prizes : ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
              wonPrizes: normalizedWonPrizes,
              coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
              unlockedAvatars: Array.isArray(parsed.unlockedAvatars) && parsed.unlockedAvatars.length > 0 ? parsed.unlockedAvatars : ['default'],
              currentAvatar: parsed.currentAvatar || 'default',
              activeTheme: parsed.activeTheme || 'classic',
              unlockedThemes: Array.isArray(parsed.unlockedThemes) && parsed.unlockedThemes.length > 0 ? parsed.unlockedThemes : ['classic'],
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
        } else if (savedLang === 'cs' || savedLang === 'en') {
          i18n.changeLanguage(savedLang);
          set({ language: savedLang });
        }
      }

      // Cross-Device FIRESTORE Real-Time Sync
      const effectiveTag = (get().nickname || get().userEmail?.split('@')[0] || currentNick || activeTag || '').toLowerCase().replace(/^@/, '');
      if (effectiveTag) {
        try {
          const docId = `usr_${effectiveTag}`;
          const userDocSnap = await getDoc(doc(db, 'user_data', docId));
          if (userDocSnap.exists()) {
            const cloudData = userDocSnap.data();
            const currentRole = get().role;

            if (currentRole === 'parent') {
              if (Array.isArray(cloudData.children)) {
                const cloudChildren: ChildProfile[] = cloudData.children;
                const activeSelected = get().selectedChildId || (cloudChildren[0]?.id || null);
                const activeChild = cloudChildren.find(c => c.id === activeSelected) || cloudChildren[0];
                
                set({
                  children: cloudChildren,
                  selectedChildId: activeSelected,
                  tasks: activeChild?.tasks || get().tasks,
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
              if (cloudData.parent_email && cloudData.parent_email !== get().parentEmail) {
                updates.parentEmail = cloudData.parent_email;
              }
              if (Array.isArray(cloudData.linked_parents) && cloudData.linked_parents.length > 0) {
                const mergedParents = Array.from(new Set([...(get().linkedParents || []), ...cloudData.linked_parents]));
                updates.linkedParents = mergedParents;
              }
              if (Array.isArray(cloudData.tasks) && cloudData.tasks.length > 0) {
                updates.tasks = cloudData.tasks;
              }
              if (cloudData.epicBossTask) {
                updates.epicBossTask = cloudData.epicBossTask;
                if (typeof cloudData.epicBossXP === 'number') {
                  updates.epicBossXP = cloudData.epicBossXP;
                }
              }
              if (cloudData.approval_status === 'approved') {
                updates.approvalStatus = 'approved';
                const currentKids = get().children;
                if (currentKids.length > 0) {
                  updates.children = currentKids.map(c => ({ ...c, isApproved: true }));
                }
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
    const todayStr = new Date().toISOString().split('T')[0];
    set({
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
      prizes: ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
      wonPrizes: [],
      coins: 0,
      unlockedAvatars: ['default'],
      currentAvatar: 'default',
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
      const { isSick, xp, level, streak, epicClaimedDate, dailyChestClaimedDate, superchargedTaskId, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, lastSpinDate, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role } = get();
      if (!userEmail) {
        await AsyncStorage.removeItem('active_user_tag');
        await AsyncStorage.removeItem('mockState');
        return;
      }
      const userTag = (nickname || userEmail.split('@')[0]).toLowerCase().replace(/^@/, '');
      const stateObj = { isSick, xp, level, streak, epicClaimedDate, dailyChestClaimedDate, superchargedTaskId, tasks, prizes, wonPrizes, coins, unlockedAvatars, currentAvatar, activeTheme, unlockedThemes, lastSpinDate, parentEmail, approvalStatus, dailyMood, language, lastActiveDate, fullName, nickname, userId, userEmail, children, selectedChildId, linkedParents, epicBossTask, epicBossXP, role };
      
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
