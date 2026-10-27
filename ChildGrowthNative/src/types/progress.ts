import type { QuestRewardCalculation } from '../utils/avatarSkills';

export interface Task {
  revision?: string | number; // Server-owned definition version; legacy quests start at zero.
  id: string;
  name: string;
  shortName?: string;
  ownerRole?: 'child' | 'parent';
  helpRequested?: boolean;
  diff: 'easy' | 'med' | 'hard';
  freq: 'daily' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'weekdays' | 'weekends';
  mystery: boolean;
  done: boolean;
  date: string;
  icon?: string;
  startedAt?: string;
  reminderMode?: 'notification' | 'alarm';
  reminderTime?: string; // Local HH:mm, 07:00–19:59; empty uses device default.
  requiresApproval?: boolean;
  pendingApproval?: boolean;
  pendingSubmissionId?: string;
  pendingReward?: QuestRewardCalculation;
  lastReview?: { day: string; approved: boolean; at: number };
  verificationNote?: string;
  awardedReward?: QuestRewardCalculation;
  isRolling?: boolean;          // Rolls over / persists across days until finished
  canPostpone?: boolean;        // Allows kid/parent to postpone quest to next days
  postponedUntil?: string;      // YYYY-MM-DD target date if postponed
  originalDate?: string;        // Date when quest was originally scheduled
}

export interface WonPrize {
  id: string;
  prize: string;
  date: string;
  redeemed: boolean;
  pool?: string[];
  status?: 'requested' | 'approved';
}

export interface ChildProfile {
  recoveryRequests?: import('./recovery').RecoveryRequest[];
  id: string;
  name: string;
  nickname: string;
  level: number;
  xp: number;
  coins: number;
  tasks: Task[];
  wonPrizes: WonPrize[];
  prizes?: string[];
  unlockedAvatars: string[];
  currentAvatar: string;
  fighterOutfits?: import('../utils/fighterOutfits').FighterOutfits;
  linkedParents: string[];
  isApproved: boolean;
  isSick?: boolean;
  streak?: number;
  lastActiveDate?: string;
  lastSpinDate?: string | null;
  epicClaimedDate?: string | null;
  dailyChestClaimedDate?: string | null;
  superchargedTaskId?: string | null;
  dailyMood?: 'wiped' | 'thriving' | 'too_easy' | null;
  activeTheme?: import('../constants/theme').ThemeKey;
  unlockedThemes?: import('../constants/theme').ThemeKey[];
  initiatedBy?: 'kid' | 'parent';
  epicBossTask?: string;
  epicBossXP?: number;
}
