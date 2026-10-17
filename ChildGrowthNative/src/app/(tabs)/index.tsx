import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, getThemeColors, WORLD_THEMES } from '../../constants/theme';
import { useAppStore, DEFAULT_STARTER_TASKS } from '../../store/useAppStore';
import { LogOut, Thermometer, Moon, CheckCircle2, Star, Trophy, Gamepad2, Sun, Calendar, ScrollText, Settings, Sparkles, Shield, Zap, Gift, Flame, Crosshair, Lock, Crown } from 'lucide-react-native';
import HoldToClaim from '../../components/HoldToClaim';
import PrizeWheelModal from '../../components/PrizeWheelModal';
import BouncingButton from '../../components/BouncingButton';
import { playSuccessChime } from '../../utils/audio';
import LottieConfetti from '../../components/LottieConfetti';
import DancingBananaModal from '../../components/DancingBananaModal';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import SlideToComplete from '../../components/SlideToComplete';
import SettingsModal from '../../components/SettingsModal';
import { getAvatarSkillConfig, getNextLockedAvatar, QuestRewardCalculation, getComboMultiplier, getHeroCompanionMessage } from '../../utils/avatarSkills';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TrackerScreen() {
  const { t } = useTranslation();
  const logout = useAppStore((state) => state.logout);
  const setUser = useAppStore((state) => state.setUser);
  const role = useAppStore((state) => state.role);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
  const isSick = useAppStore((state) => state.isSick);
  const setSick = useAppStore((state) => state.setSick);
  const rawTasks = useAppStore((state) => state.tasks);
  const tasks = (rawTasks && rawTasks.length > 0) ? rawTasks : DEFAULT_STARTER_TASKS;
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const claimEpicBoss = useAppStore((state) => state.claimEpicBoss);
  const epicClaimedDate = useAppStore((state) => state.epicClaimedDate);
  const dailyChestClaimedDate = useAppStore((state) => state.dailyChestClaimedDate);
  const superchargedTaskId = useAppStore((state) => state.superchargedTaskId);
  const claimDailyLoginChest = useAppStore((state) => state.claimDailyLoginChest);
  const setSuperchargedTask = useAppStore((state) => state.setSuperchargedTask);
  const streak = useAppStore((state) => state.streak);
  const level = useAppStore((state) => state.level);
  const xp = useAppStore((state) => state.xp);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const unlockedAvatars = useAppStore((state) => state.unlockedAvatars);
  const prizes = useAppStore((state) => state.prizes);
  const addWonPrize = useAppStore((state) => state.addWonPrize);
  const coins = useAppStore((state) => state.coins);
  const currentAvatar = useAppStore((state) => state.currentAvatar);
  const dailyMood = useAppStore((state) => state.dailyMood);
  const setDailyMood = useAppStore((state) => state.setDailyMood);
  const parentEmail = useAppStore((state) => state.parentEmail);
  const approvalStatus = useAppStore((state) => state.approvalStatus);
  const linkedParents = useAppStore((state) => state.linkedParents);
  const children = useAppStore((state) => state.children);
  const epicBossTask = useAppStore((state) => state.epicBossTask);
  const epicBossXP = useAppStore((state) => state.epicBossXP);
  const acceptParentInvite = useAppStore((state) => state.acceptParentInvite);
  const denyParentInvite = useAppStore((state) => state.denyParentInvite);
  const userEmail = useAppStore((state) => state.userEmail);
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);

  const [showPrizeWheel, setShowPrizeWheel] = useState(false);
  const [wonPrize, setWonPrize] = useState('');
  const [playConfetti, setPlayConfetti] = useState(false);
  const [showDancingBanana, setShowDancingBanana] = useState(false);
  const [pendingWheelSpin, setPendingWheelSpin] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lastRewardToast, setLastRewardToast] = useState<(QuestRewardCalculation & { questTitle: string }) | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const alreadySpunToday = lastSpinDate === todayStr;
  const epicClaimed = epicClaimedDate === todayStr;
  const avatarSkill = getAvatarSkillConfig(currentAvatar);
  const nextUnlock = getNextLockedAvatar(unlockedAvatars, coins);
  const themeColors = getThemeColors(activeTheme);
  const worldInfo = WORLD_THEMES[activeTheme] || WORLD_THEMES.classic;

  const getDisplayTaskName = (rawName: string) => {
    if (!rawName) return '';
    const legacyMap: Record<string, string> = {
      'Brush your teeth 🪥': 'habit_brush_teeth',
      'Make your bed 🛏️': 'habit_cleaning',
      '15m Reading or Homework 📚': 'habit_reading',
    };
    const key = legacyMap[rawName] || rawName;
    return t(key, rawName);
  };

  const triggerRewardToast = (reward: QuestRewardCalculation, questTitle: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setLastRewardToast({ ...reward, questTitle: getDisplayTaskName(questTitle) });
    toastTimeoutRef.current = setTimeout(() => {
      setLastRewardToast(null);
    }, 3800);
  };

  React.useEffect(() => {
    if (!userEmail) {
      router.replace('/');
    } else if (role === 'parent') {
      router.replace('/parent-dashboard');
    }
  }, [userEmail, role]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      useAppStore.getState().loadMockState();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!userEmail) {
    return null;
  }

  const completedCount = tasks.filter(t => t.done).length + (epicClaimed ? 1 : 0);
  const totalCount = tasks.length + 1;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const currentStreak = Math.max(streak || 0, completedCount > 0 ? 1 : 0);
  const currentLevel = level || 1;

  const completedToday = tasks.filter(t => t.done).length;
  const comboInfo = getComboMultiplier(completedToday);
  const regularTasksCount = tasks.length;
  const regularDoneCount = tasks.filter(t => t.done).length;
  const bossShieldPct = regularTasksCount > 0 ? Math.max(0, Math.round(100 - (regularDoneCount / regularTasksCount) * 100)) : 0;
  const isBossVulnerable = bossShieldPct === 0;

  const hasUnclaimedDailyChest = dailyChestClaimedDate !== todayStr;
  const companionMessage = getHeroCompanionMessage(currentAvatar, {
    progressPct,
    hasUnclaimedChest: hasUnclaimedDailyChest,
    comboCount: completedToday,
    isBossVulnerable,
    streak: currentStreak,
  });

  // Loss Aversion: Pending Vault Calculations (Harry Brignull + Eva de Lera)
  const remainingTasks = tasks.filter(t => !t.done);
  const pendingVaultCoins = remainingTasks.length * 15 + (epicClaimed ? 0 : 35);
  const pendingVaultXP = remainingTasks.length * 15 + (epicClaimed ? 0 : (epicBossXP || 35));

  const handleOpenSupplyCrate = () => {
    const result = claimDailyLoginChest();
    if (result) {
      playSuccessChime();
      triggerRewardToast({
        xpGain: result.xp,
        coinGain: result.coins,
        skillLabel: `🎁 ${currentStreak}-Day Streak Login Crate!`,
        isCritical: true,
      }, "Daily Mystery Supply Drop");
    }
  };

  const handleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // After spinning the prize wheel, kids cannot undo chores themselves
    if (task.done && alreadySpunToday) {
      alert(t('chores_locked_after_spin', '🔒 Quests are locked for today! You already spun the Prize Wheel.'));
      return;
    }

    const isNowDone = !task.done;
    const reward = toggleTaskDone(taskId, Boolean(task.mystery));

    if (isNowDone) {
      playSuccessChime();

      if (reward) {
        triggerRewardToast(reward, task.name);
      }

      // Check if ALL daily tasks are now completed (Peak-End Climax)
      const remainingUndone = tasks.filter(t => t.id !== taskId && !t.done);
      const isAllDailyQuestsDone = remainingUndone.length === 0;

      // Only award prize wheel spin if ALL quests are done AND not already spun today (1 spin per day)
      if (isAllDailyQuestsDone && !alreadySpunToday) {
        console.log('🎉 ALL daily quests completed! Awarding prize wheel spin.');
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)] || 'Extra Roblox Coins!';
        setWonPrize(randomPrize);
        addWonPrize(randomPrize);
        setPendingWheelSpin(true);
        setShowDancingBanana(true);
      }
    }
  };

  const handleEpicClaim = () => {
    if (epicClaimed) return;
    const reward = claimEpicBoss();
    playSuccessChime();
    if (reward) {
      triggerRewardToast(reward, epicBossTask || t('epic_boss_task'));
    }
    
    // Spinning wheel is unlocked ONLY when all daily quests are completed AND not already spun today
    const isAllDailyQuestsDone = tasks.length > 0 && tasks.every(t => t.done);
    if (isAllDailyQuestsDone && !alreadySpunToday) {
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)] || 'Extra Roblox Coins!';
      setWonPrize(randomPrize);
      addWonPrize(randomPrize);
      setPendingWheelSpin(true);
      setShowDancingBanana(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const getFormatDate = () => {
    const d = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

      const getAvatarDisplay = () => {
      const map: Record<string, { image?: any; emoji?: string }> = {
        'questblox_hero': { image: require('../../assets/images/questblox_hero.png') },
        'roblox_noob': { image: require('../../assets/images/roblox_noob.png') },
        'roblox_bacon_hair': { image: require('../../assets/images/roblox_bacon_hair.png') },
        'roblox_guest': { image: require('../../assets/images/roblox_guest.png') },
        'roblox_builderman': { image: require('../../assets/images/roblox_builderman.png') },
        'roblox_flamingo': { image: require('../../assets/images/roblox_flamingo.png') },
        'roblox_ninja': { image: require('../../assets/images/roblox_ninja.png') },
        'roblox_dominus': { image: require('../../assets/images/roblox_dominus.png') },
        'roblox_wizard': { image: require('../../assets/images/roblox_wizard.png') },
        'roblox_cyber': { image: require('../../assets/images/roblox_cyber.png') },
        'roblox_unicorn': { image: require('../../assets/images/roblox_unicorn.png') },
        'roblox_dragon': { image: require('../../assets/images/roblox_dragon.png') },
        'roblox_bloxy': { image: require('../../assets/images/roblox_bloxy.png') },
      };
      return map[currentAvatar] || { image: require('../../assets/images/questblox_hero.png') };
    };

  const getFreqBadge = (freq?: string) => {
    const map: Record<string, string> = {
      daily: 'freq_daily',
      monday: 'freq_monday',
      tuesday: 'freq_tuesday',
      wednesday: 'freq_wednesday',
      thursday: 'freq_thursday',
      friday: 'freq_friday',
      saturday: 'freq_saturday',
      sunday: 'freq_sunday',
      weekdays: 'freq_weekdays',
      weekends: 'freq_weekends',
    };
    const translationKey = map[freq || 'daily'] || 'freq_daily';
    return t(translationKey);
  };

  const getDiffBadge = (freq?: string) => {
    if (freq === 'sunday' || freq === 'saturday') return { label: t('diff_hard'), color: Colors.red, bg: Colors.redDim };
    if (freq === 'weekdays' || freq === 'weekends') return { label: t('diff_med'), color: Colors.blue, bg: Colors.blueDim };
    return { label: t('diff_easy'), color: Colors.green, bg: Colors.greenDim };
  };

  // Task frequency matcher for calendar days
  const isTaskScheduledForDay = (task: typeof tasks[0], dayKey: string, isWeekend: boolean) => {
    const freq = (task.freq || 'daily').toLowerCase();
    if (freq === 'daily') return true;
    if (freq === 'weekdays') return !isWeekend;
    if (freq === 'weekends') return isWeekend;
    return freq === dayKey.toLowerCase();
  };

  // Generate 7-day week dates starting from Monday
  const getWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const mondayOffset = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);

    const week = [];
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      week.push({
        dayName: dayNames[i],
        dayKey: dayKeys[i],
        dateNum: d.getDate(),
        monthName: months[d.getMonth()],
        formattedDate: `${months[d.getMonth()]} ${d.getDate()}`,
        dateStr,
        isToday,
        isPast: dateStr < todayStr,
        isFuture: dateStr > todayStr,
        isWeekend: i >= 5,
      });
    }
    return week;
  };

  const weekDates = getWeekDates();
  const isViewingToday = selectedDate === todayStr;
  const selectedDayInfo = weekDates.find(d => d.dateStr === selectedDate) || weekDates.find(d => d.isToday) || weekDates[0];
  const displayedTasks = isViewingToday 
    ? tasks 
    : tasks.filter(t => isTaskScheduledForDay(t, selectedDayInfo.dayKey, selectedDayInfo.isWeekend));

  // History Log dataset (only active when user has completed quests)
  const historyLog = completedCount > 0 ? [
    { date: getFormatDate(), pct: progressPct, tasks: completedCount, ill: isSick }
  ] : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Top Micro Utility Row: Language Switcher & Settings */}
        <View style={styles.topMicroBar}>
          <LanguageSwitcher />
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} 
            style={styles.cleanSettingBtn} 
            onPress={() => setSettingsVisible(true)}
          >
            <Settings size={16} color={Colors.amber} />
          </TouchableOpacity>
        </View>

        {/* Clean Hero Player Card */}
        <View style={styles.cleanHeader}>
          <View style={styles.cleanPlayerRow}>
            {/* Left: Avatar + Name + Level */}
            <View style={[styles.cleanAvatarFrame, { borderColor: themeColors.accent }]}>
              {getAvatarDisplay().image ? (
                <Image source={getAvatarDisplay().image} style={styles.cleanAvatarImg} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: 24 }}>{getAvatarDisplay().emoji || '⭐'}</Text>
              )}
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cleanAppTitle} numberOfLines={1}>{fullName || nickname || 'Kid Hero'}</Text>
                <View style={styles.cleanLvlPill}>
                  <Trophy size={10} color="#FFD700" />
                  <Text style={styles.cleanLvlPillText}>LVL {currentLevel}</Text>
                </View>
              </View>
              <Text style={styles.cleanCompanionText} numberOfLines={1}>
                💬 {companionMessage}
              </Text>
            </View>

            {/* Right: Streak & Coins */}
            <View style={styles.cleanStatsCluster}>
              <View style={styles.streakPill}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.streakText}>{currentStreak}</Text>
              </View>
              <View style={styles.coinPill}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.coinText}>{coins}</Text>
              </View>
            </View>
          </View>

          {/* Clean Progress & Candy XP Track */}
          <View style={styles.cleanProgressLine}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={styles.cleanProgressText}>⭐ {completedCount} of {totalCount} Done</Text>
              
              {hasUnclaimedDailyChest ? (
                <TouchableOpacity 
                  style={styles.giftClaimPill}
                  onPress={handleOpenSupplyCrate}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13 }}>🎁</Text>
                  <Text style={styles.giftClaimPillText}>CLAIM +{25 + currentStreak * 5} 💰</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.cleanXpText}>{xp}/100 XP · {avatarSkill.shortBuff}</Text>
              )}
            </View>
            <View style={styles.cleanXpTrack}>
              <View style={[styles.cleanXpFill, { width: `${progressPct}%`, backgroundColor: themeColors.accent }]} />
            </View>
          </View>
        </View>

        {/* Top Weekly Interactive Calendar Strip */}
        <View style={styles.topCalendarStrip}>
          {weekDates.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            const scheduledTasks = tasks.filter(t => isTaskScheduledForDay(t, item.dayKey, item.isWeekend));
            const count = scheduledTasks.length;
            
            return (
              <TouchableOpacity
                key={item.dateStr}
                style={[
                  styles.calendarDayCell,
                  item.isToday && styles.calendarDayToday,
                  isSelected && styles.calendarDaySelected,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.calendarDayName,
                  item.isToday && styles.calendarDayNameToday,
                  isSelected && styles.calendarDayNameSelected,
                ]}>
                  {item.dayName}
                </Text>
                
                <View style={[
                  styles.calendarDateCircle,
                  item.isToday && styles.calendarDateCircleToday,
                  isSelected && styles.calendarDateCircleSelected,
                ]}>
                  <Text style={[
                    styles.calendarDateNum,
                    item.isToday && styles.calendarDateNumToday,
                    isSelected && styles.calendarDateNumSelected,
                  ]}>
                    {item.dateNum}
                  </Text>
                </View>

                {/* Micro indicators: Checkmark if today complete, count if tasks exist, or dot */}
                {item.isToday && completedCount === totalCount && totalCount > 0 ? (
                  <View style={styles.calCheckDot}>
                    <CheckCircle2 size={10} color="#00E676" />
                  </View>
                ) : count > 0 ? (
                  <View style={[styles.calCountDot, isSelected && { backgroundColor: Colors.amber }]}>
                    <Text style={[styles.calCountDotText, isSelected && { color: '#121212' }]}>
                      {count}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.calEmptyDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Compact 1-Line Parent Approval Pending Action Banner (If applicable) */}
        {(() => {
          const currentKidNick = (nickname || '').toLowerCase();
          const matchingChild = children.find(c => (currentKidNick && c.nickname.toLowerCase() === currentKidNick) || children.length === 1);
          const validParentTags = Array.from(new Set([
            ...(matchingChild?.linkedParents || []),
            ...(linkedParents || []),
            ...(parentEmail ? [parentEmail] : [])
          ])).filter(Boolean).map(p => p.replace(/^@/, '')).filter(p => p.toLowerCase() !== currentKidNick);

          const isApproved = approvalStatus === 'approved' || (validParentTags.length > 0 && approvalStatus !== 'pending' && matchingChild?.isApproved === true);
          const pendingInviteChild = !isApproved ? children.find(c => c.isApproved === false && c.linkedParents && c.linkedParents.length > 0) : null;
          const hasPendingInvitation = !isApproved && (approvalStatus === 'pending' || Boolean(pendingInviteChild));
          const pendingParentTag = pendingInviteChild?.linkedParents[0] || parentEmail || validParentTags[0] || 'parent_boss';

          if (hasPendingInvitation) {
            const isKidInitiated = pendingInviteChild?.initiatedBy === 'kid' || approvalStatus === 'pending' || !pendingInviteChild?.initiatedBy;
            return (
              <View style={styles.compactBanner}>
                <Text style={{ fontSize: 16 }}>⏳</Text>
                <Text style={styles.compactBannerText} numberOfLines={1}>
                  {isKidInitiated ? `@${pendingParentTag} pending approval` : `Invite from @${pendingParentTag}`}
                </Text>
                {!isKidInitiated && (
                  <TouchableOpacity 
                    style={styles.compactActionBtn} 
                    onPress={() => { acceptParentInvite(pendingParentTag); alert('🎉 Linked!'); }}
                  >
                    <Text style={styles.compactActionText}>ACCEPT ✅</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }
          return null;
        })()}

        {/* Rest Day Glowing Banner (If active) */}
        {isSick && (
          <TouchableOpacity 
            style={styles.restDayBanner}
            onPress={() => setSick(false)}
            activeOpacity={0.8}
          >
            <Moon size={18} color={Colors.blue} />
            <Text style={styles.restDayText}>REST DAY ACTIVE · STREAK SAFE 🛡️</Text>
          </TouchableOpacity>
        )}

        {/* TODAY'S QUEST BOARD (Visual-First & Tactile) */}
        <View style={styles.section}>
          {/* Preview Mode Notification Banner when looking at another day */}
          {!isViewingToday && (
            <View style={styles.previewModeBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Calendar size={20} color="#FFB800" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewModeTitle}>
                    {selectedDayInfo.dayName}'S EXPECTED QUESTS 📅
                  </Text>
                  <Text style={styles.previewModeSub}>
                    {selectedDayInfo.formattedDate} · {displayedTasks.length} quests scheduled
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.backToTodayBtn}
                onPress={() => setSelectedDate(todayStr)}
                activeOpacity={0.8}
              >
                <Text style={styles.backToTodayBtnText}>TODAY 📍</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Gamepad2 size={20} color="#ab47bc" />
              <Text style={styles.secTitle}>
                {isViewingToday ? "TODAY'S QUESTS ⚔️" : `${selectedDayInfo.dayName}'S SCHEDULE 📅`}
              </Text>
              {isViewingToday && comboInfo.multiplier > 1.0 && (
                <View style={[styles.comboPill, { borderColor: comboInfo.color }]}>
                  <Text style={[styles.comboPillText, { color: comboInfo.color }]}>
                    {comboInfo.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.secCount}>
              {isViewingToday ? `${completedCount}/${totalCount} DONE` : `${displayedTasks.length} SCHEDULED`}
            </Text>
          </View>

          {/* Unified Clean Quest Board */}
          <View style={styles.questBoard}>
            {displayedTasks.length === 0 ? (
              <View style={styles.noQuestsCard}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>🏖️</Text>
                <Text style={styles.noQuestsTitle}>No Quests for {selectedDayInfo.dayName}!</Text>
                <Text style={styles.noQuestsSub}>Enjoy your free time champion!</Text>
              </View>
            ) : (
              displayedTasks.map((task, idx) => {
                const isSupercharged = isViewingToday && superchargedTaskId === task.id;
                const baseRewardCoins = task.diff === 'hard' ? 35 : (task.diff === 'med' ? 20 : 10) + (task.mystery ? 10 : 0);
                const boostedCoins = isSupercharged ? baseRewardCoins * 2 : baseRewardCoins;
                const taskDisplayName = getDisplayTaskName(task.name);
                const isLast = idx === displayedTasks.length - 1;

                return (
                  <BouncingButton 
                    key={task.id} 
                    style={[
                      styles.questRow, 
                      !isLast && styles.questRowDivider,
                      isViewingToday && task.done && styles.questRowDone,
                      isSupercharged && styles.questRowSupercharged
                    ]}
                    onPress={() => {
                      if (!isViewingToday) {
                        alert(`📅 This quest is scheduled for ${selectedDayInfo.dayName} (${selectedDayInfo.formattedDate}). Return to Today to complete active quests!`);
                        return;
                      }
                      handleTaskCompletion(task.id);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      {/* Big Visual Chore Halo */}
                      <View style={[styles.choreHalo, isViewingToday && task.done && styles.choreHaloDone]}>
                        <Text style={styles.choreEmoji}>{task.icon || '⭐'}</Text>
                      </View>

                      {/* Quest Title & Reward */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.questTitle, isViewingToday && task.done && styles.questTitleDone]} numberOfLines={2}>
                          {taskDisplayName}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Text style={[styles.coinRewardText, isViewingToday && task.done && { color: Colors.textMuted }]}>
                            +{boostedCoins} 💰
                          </Text>
                          {task.mystery && (!isViewingToday || !task.done) && (
                            <View style={styles.mysteryBadge}>
                              <Text style={styles.mysteryBadgeText}>🎁 BONUS</Text>
                            </View>
                          )}
                          {isSupercharged && !task.done && (
                            <View style={styles.superchargedBadge}>
                              <Text style={styles.superchargedBadgeText}>⚡ 2X</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Supercharge icon & Chunky Checkbox / Scheduled Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {!isViewingToday ? (
                          <View style={styles.scheduledPill}>
                            <Text style={styles.scheduledPillText}>SCHEDULED 📅</Text>
                          </View>
                        ) : (
                          <>
                            {!task.done && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setSuperchargedTask(isSupercharged ? null : task.id);
                                }}
                                style={[styles.zapBtn, isSupercharged && styles.zapBtnActive]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Zap size={16} color={isSupercharged ? '#121212' : Colors.amber} />
                              </TouchableOpacity>
                            )}
                            
                            <View style={[styles.checkCircle, task.done && styles.checkCircleDone]}>
                              {task.done ? (
                                <CheckCircle2 size={24} color="#121212" />
                              ) : (
                                <Star size={20} color={Colors.textMuted} />
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {isViewingToday && task.done && (
                      <View style={[styles.completedStamp, alreadySpunToday && styles.completedStampLocked]}>
                        <Text style={[styles.completedStampText, alreadySpunToday && styles.completedStampTextLocked]}>
                          {alreadySpunToday ? '🔒 LOCKED' : t('completed_stamp')}
                        </Text>
                      </View>
                    )}
                  </BouncingButton>
                );
              })
            )}

            {/* Featured Daily Boss Climax Quest */}
            {isViewingToday && (
              <View style={[styles.epicBossCard, isBossVulnerable && styles.epicBossCardVulnerable]}>
                <View style={styles.epicHeaderRow}>
                  <Crown size={17} color={Colors.amber} />
                  <Text style={styles.epicTitleText}>BOSS FIGHT 👑</Text>
                  <Text style={[styles.bossShieldBadge, isBossVulnerable && { color: Colors.green }]}>
                    {isBossVulnerable ? '💥 SHIELD BROKEN!' : `🛡️ SHIELD: ${bossShieldPct}%`}
                  </Text>
                </View>
                
                <Text style={styles.epicQuestName}>
                  {epicBossTask || t('epic_boss_task')}
                </Text>

                <View style={styles.shieldTrack}>
                  <View style={[styles.shieldFill, { width: `${bossShieldPct}%`, backgroundColor: isBossVulnerable ? Colors.green : Colors.red }]} />
                </View>
                
                <HoldToClaim 
                  isClaimed={epicClaimed} 
                  onClaim={handleEpicClaim}
                  title={t('hold_to_claim_xp', { xp: (epicBossXP || 35) + (avatarSkill.bossBonusXP || 0) + (isBossVulnerable ? 25 : 0) })}
                  claimedTitle={t('claimed_banner_xp', { xp: (epicBossXP || 35) + (avatarSkill.bossBonusXP || 0) + (isBossVulnerable ? 25 : 0) })}
                  durationMs={avatarSkill.bossHoldDurationMs || 1500}
                  fastChargeLabel={avatarSkill.bossHoldDurationMs ? `⚡ 2x Speed!` : undefined}
                />
              </View>
            )}
          </View>
        </View>

        {/* 4. ALL QUESTS DONE CELEBRATION (Auto Spin Wheel) */}
        {completedCount === totalCount && totalCount > 0 && (
          alreadySpunToday ? (
            <View style={styles.allDoneBannerSpun}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.allDoneTitle}>ALL QUESTS COMPLETE! 🎉</Text>
                <Text style={styles.allDoneSub}>DAILY SPIN CLAIMED ✅ (1 SPIN PER DAY)</Text>
              </View>
              <View style={styles.spunPill}>
                <CheckCircle2 size={18} color="#00E676" />
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.allDoneBanner}
              onPress={() => setShowPrizeWheel(true)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.allDoneTitle}>ALL QUESTS COMPLETE! 🎉</Text>
                <Text style={styles.allDoneSub}>TAP TO SPIN PRIZE WHEEL 🎡</Text>
              </View>
              <View style={styles.spinBtn}>
                <Text style={styles.spinBtnText}>SPIN! 🎡</Text>
              </View>
            </TouchableOpacity>
          )
        )}

        {/* 5. QUICK 1-TAP MOOD SELECTOR */}
        <View style={styles.moodSection}>
          <Text style={styles.moodSectionTitle}>HOW ARE YOU TODAY? 😄</Text>
          <View style={styles.moodButtonsRow}>
            <TouchableOpacity 
              style={[styles.moodPill, dailyMood === 'wiped' && styles.moodPillActive]} 
              onPress={() => setDailyMood('wiped')}
            >
              <Text style={styles.moodPillEmoji}>😴</Text>
              <Text style={[styles.moodPillText, dailyMood === 'wiped' && styles.moodPillTextActive]}>TIRED</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodPill, dailyMood === 'thriving' && styles.moodPillActive]} 
              onPress={() => setDailyMood('thriving')}
            >
              <Text style={styles.moodPillEmoji}>😄</Text>
              <Text style={[styles.moodPillText, dailyMood === 'thriving' && styles.moodPillTextActive]}>GREAT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodPill, dailyMood === 'too_easy' && styles.moodPillActive]} 
              onPress={() => setDailyMood('too_easy')}
            >
              <Text style={styles.moodPillEmoji}>😎</Text>
              <Text style={[styles.moodPillText, dailyMood === 'too_easy' && styles.moodPillTextActive]}>EASY</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Non-Blocking Variable Reward Toast Banner (Hooked Variable Ratio + Peak-End Rule) */}
      {lastRewardToast && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setLastRewardToast(null)}
          style={{
            position: 'absolute',
            bottom: 18,
            left: 18,
            right: 18,
            backgroundColor: lastRewardToast.isCritical ? '#231c07' : Colors.surface,
            borderWidth: 2,
            borderColor: lastRewardToast.isCritical ? Colors.amber : Colors.green,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: lastRewardToast.isCritical ? Colors.amber : Colors.green,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>{lastRewardToast.isCritical ? '⚡' : '✅'}</Text>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: lastRewardToast.isCritical ? Colors.amber : Colors.green }}>
                {lastRewardToast.isCritical ? 'CRITICAL MYSTERY DROP! (1.5x LOOT)' : 'QUEST COMPLETE!'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: Colors.text, marginTop: 2 }} numberOfLines={1}>
              {lastRewardToast.questTitle}
            </Text>
            {Boolean(lastRewardToast.skillLabel) && (
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: Colors.textSecondary, marginTop: 2 }}>
                {avatarSkill.skillName}: {lastRewardToast.skillLabel}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={{ backgroundColor: Colors.amberDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: Colors.amber }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: Colors.amber }}>
                +{lastRewardToast.xpGain} XP ⭐
              </Text>
            </View>
            <View style={{ backgroundColor: Colors.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: Colors.green }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: Colors.green }}>
                +{lastRewardToast.coinGain} 💰
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Prize Wheel and Celebration only open when all daily quests are 100% completed AND not already spun today */}
      <PrizeWheelModal 
        visible={showPrizeWheel && completedCount === totalCount && totalCount > 0 && !alreadySpunToday} 
        onClose={() => {
          setShowPrizeWheel(false);
          setPlayConfetti(true);
        }} 
        prizeName={wonPrize} 
      />

      <LottieConfetti play={playConfetti} onAnimationFinish={() => setPlayConfetti(false)} />
      
      <DancingBananaModal 
        visible={showDancingBanana && completedCount === totalCount && totalCount > 0 && !alreadySpunToday} 
        onClose={() => {
          setShowDancingBanana(false);
          if (pendingWheelSpin && completedCount === totalCount && totalCount > 0 && !alreadySpunToday) {
            setPendingWheelSpin(false);
            setTimeout(() => {
              setShowPrizeWheel(true);
            }, 300);
          } else {
            setPendingWheelSpin(false);
          }
        }} 
      />

      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingTop: 12,
    paddingBottom: 60,
    paddingHorizontal: 16,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  topMicroBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cleanHeader: {
    backgroundColor: '#161A28',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cleanPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cleanAvatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#272B40',
    borderWidth: 2,
    borderColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cleanAvatarImg: {
    width: 40,
    height: 40,
  },
  cleanAppTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  cleanLvlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  cleanLvlPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  cleanCompanionText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cleanProgressLine: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cleanProgressText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cleanXpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  cleanBuffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  cleanBuffText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    color: Colors.amber,
  },
  cleanSettingBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanStatsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  giftClaimPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F0D',
    borderWidth: 1.5,
    borderColor: Colors.amber,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  giftClaimPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  cleanXpTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
  },
  cleanXpFill: {
    height: '100%',
    borderRadius: 999,
  },
  topUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerHudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarMiniFrame: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#272B40',
    borderWidth: 2,
    borderColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarMiniImg: {
    width: 34,
    height: 34,
  },
  appTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  lvlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  lvlPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  statsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F1D',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    gap: 4,
  },
  statIcon: {
    fontSize: 13,
  },
  streakText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#F97316',
    fontSize: 13,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#231F14',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D97706',
    gap: 4,
  },
  coinText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 13,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212538',
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  compactBannerText: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  compactActionBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactActionText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#121212',
  },
  restDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#162235',
    borderWidth: 1.5,
    borderColor: Colors.blue,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  restDayText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.blue,
    letterSpacing: 0.5,
  },
  heroArenaStage: {
    backgroundColor: '#1C2133',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.2)',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  charArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#272B40',
    borderWidth: 3,
    borderColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarImg: {
    width: 70,
    height: 70,
  },
  companionBubble: {
    backgroundColor: '#272B40',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.4)',
  },
  companionBubbleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFB800',
    letterSpacing: 0.3,
  },
  heroProgressArea: {
    flex: 1,
    justifyContent: 'center',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  starRatioText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  xpRatioText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  xpTrack: {
    height: 12,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
  },
  buffBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buffBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  crateCard: {
    backgroundColor: '#1E1704',
    borderBottomWidth: 4,
    borderBottomColor: '#B45309',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  crateTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  crateSub: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FDE68A',
    fontSize: 11,
    marginTop: 1,
  },
  crateBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#B45309',
  },
  crateBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#121212',
    fontSize: 11,
  },
  epicBossCard: {
    backgroundColor: '#1C1318',
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  epicBossCardVulnerable: {
    backgroundColor: '#112215',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  epicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  epicTitleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.amber,
    letterSpacing: 0.5,
  },
  bossShieldBadge: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    marginLeft: 'auto',
  },
  epicQuestName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  shieldTrack: {
    height: 6,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  shieldFill: {
    height: '100%',
    borderRadius: 999,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  secCount: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  comboPill: {
    backgroundColor: 'rgba(255, 0, 127, 0.2)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comboPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
  },
  questBoard: {
    backgroundColor: '#1E2235',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  questRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  questRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  questRowDone: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    opacity: 0.72,
  },
  questRowSupercharged: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.amber,
  },
  choreHalo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreHaloDone: {
    backgroundColor: '#1C1F2E',
  },
  choreEmoji: {
    fontSize: 26,
  },
  questTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  questTitleDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  coinRewardText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.green,
  },
  mysteryBadge: {
    backgroundColor: Colors.amberDim,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  mysteryBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.amber,
  },
  superchargedBadge: {
    backgroundColor: Colors.amberDim,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  superchargedBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.amber,
  },
  zapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zapBtnActive: {
    backgroundColor: Colors.amber,
  },
  checkCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#373D54',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272B40',
  },
  checkCircleDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  completedStamp: {
    position: 'absolute',
    right: 10,
    top: 12,
    borderWidth: 2,
    borderColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    transform: [{ rotate: '-12deg' }],
    backgroundColor: 'rgba(18,18,18,0.85)',
  },
  completedStampText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.red,
    letterSpacing: 1,
  },
  completedStampLocked: {
    borderColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    transform: [{ rotate: '0deg' }],
  },
  completedStampTextLocked: {
    color: '#00E676',
  },
  allDoneBanner: {
    backgroundColor: '#1C291F',
    borderWidth: 2,
    borderColor: Colors.green,
    borderBottomWidth: 5,
    borderBottomColor: '#166534',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  allDoneBannerSpun: {
    backgroundColor: '#16222F',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00E676',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  spunPill: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allDoneTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.green,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  allDoneSub: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#86EFAC',
    fontSize: 11,
    marginTop: 2,
  },
  spinBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#166534',
  },
  spinBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#121212',
    fontSize: 12,
  },
  moodSection: {
    marginVertical: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  moodSectionTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  moodButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  moodPill: {
    flex: 1,
    backgroundColor: '#1C2133',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  moodPillActive: {
    backgroundColor: '#272B40',
    borderColor: Colors.amber,
    borderWidth: 1.5,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  moodPillEmoji: {
    fontSize: 22,
  },
  moodPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  moodPillTextActive: {
    color: Colors.amber,
  },
  topCalendarStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181D2D',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
  },
  calendarDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calendarDayToday: {
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderColor: 'rgba(255, 184, 0, 0.35)',
  },
  calendarDaySelected: {
    backgroundColor: '#262D4A',
    borderColor: Colors.amber,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  calendarDayName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calendarDayNameToday: {
    color: Colors.amber,
  },
  calendarDayNameSelected: {
    color: '#FFFFFF',
  },
  calendarDateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  calendarDateCircleToday: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    borderWidth: 1.5,
    borderColor: Colors.amber,
  },
  calendarDateCircleSelected: {
    backgroundColor: Colors.amber,
  },
  calendarDateNum: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#D1D5DB',
  },
  calendarDateNumToday: {
    color: Colors.amber,
  },
  calendarDateNumSelected: {
    color: '#121212',
  },
  calCheckDot: {
    marginTop: 4,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCountDot: {
    marginTop: 4,
    minWidth: 16,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2A3048',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCountDotText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    color: Colors.textMuted,
  },
  calEmptyDot: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  previewModeBanner: {
    backgroundColor: '#1C2236',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.35)',
    gap: 10,
  },
  previewModeTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.amber,
    letterSpacing: 0.4,
  },
  previewModeSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backToTodayBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#B38000',
  },
  backToTodayBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#121212',
  },
  scheduledPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scheduledPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#38BDF8',
    letterSpacing: 0.3,
  },
  noQuestsCard: {
    backgroundColor: '#181D2D',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  noQuestsTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  noQuestsSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
