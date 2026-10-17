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

  const [showPrizeWheel, setShowPrizeWheel] = useState(false);
  const [wonPrize, setWonPrize] = useState('');
  const [playConfetti, setPlayConfetti] = useState(false);
  const [showDancingBanana, setShowDancingBanana] = useState(false);
  const [pendingWheelSpin, setPendingWheelSpin] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lastRewardToast, setLastRewardToast] = useState<(QuestRewardCalculation & { questTitle: string }) | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const epicClaimed = epicClaimedDate === todayStr;
  const avatarSkill = getAvatarSkillConfig(currentAvatar);
  const nextUnlock = getNextLockedAvatar(unlockedAvatars, coins);
  const themeColors = getThemeColors(activeTheme);
  const worldInfo = WORLD_THEMES[activeTheme] || WORLD_THEMES.classic;

  const triggerRewardToast = (reward: QuestRewardCalculation, questTitle: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setLastRewardToast({ ...reward, questTitle });
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

      if (isAllDailyQuestsDone) {
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
    
    // Pick prize wheel reward for Epic Boss Quest completion (Peak-End Climax)
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)] || 'Extra Roblox Coins!';
    setWonPrize(randomPrize);
    addWonPrize(randomPrize);
    setPendingWheelSpin(true);
    setShowDancingBanana(true);
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

  // 7-day week summary dataset (0% default for past days until tasks completed)
  const todayDayIndex = new Date().getDay();
  const weekDaysData = [t('day_sun'), t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat')].map((dayName, idx) => {
    const isToday = idx === todayDayIndex;
    if (isToday) {
      return { day: dayName, pct: isSick ? '🤒' : `${progressPct}%`, isToday: true, isSick };
    }
    return { day: dayName, pct: '0%', isToday: false, isSick: false };
  });

  // History Log dataset (only active when user has completed quests)
  const historyLog = completedCount > 0 ? [
    { date: getFormatDate(), pct: progressPct, tasks: completedCount, ill: isSick }
  ] : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Roblox Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={[styles.logoBox, { backgroundColor: themeColors.accent, shadowColor: themeColors.accent }]}>
              <View style={styles.robloxDiamond} />
            </View>
            <View>
              <Text style={styles.appTitle}>{fullName || nickname || 'Kid Hero'}</Text>
              <Text style={styles.appSub}>@{nickname || 'hero'} · {worldInfo.icon} {worldInfo.name}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <LanguageSwitcher />
            <View style={styles.coinPill}>
              <Text style={styles.coinIcon}>💰</Text>
              <Text style={styles.coinText}>{coins}</Text>
            </View>
            <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
              <Settings size={22} color={Colors.amber} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Parent Link Status / Pending Invitation Request Card */}
        {(() => {
          const currentKidNick = (nickname || '').toLowerCase();
          const matchingChild = children.find(c => (currentKidNick && c.nickname.toLowerCase() === currentKidNick) || children.length === 1);
          
          const validParentTags = Array.from(new Set([
            ...(matchingChild?.linkedParents || []),
            ...(linkedParents || []),
            ...(parentEmail ? [parentEmail] : [])
          ]))
          .filter(Boolean)
          .map(p => p.replace(/^@/, ''))
          .filter(p => p.toLowerCase() !== currentKidNick);

          const allParentTags = validParentTags.map(p => `@${p}`).join(', ');
          
          // Is this kid officially approved?
          const isApproved = approvalStatus === 'approved' || (validParentTags.length > 0 && approvalStatus !== 'pending' && matchingChild?.isApproved === true);

          // If approved, ALWAYS render the green linked parents badge - NEVER show invitation card!
          if (isApproved && validParentTags.length > 0) {
            return (
              <View style={{ backgroundColor: Colors.cardGreen, borderWidth: 1, borderColor: Colors.green, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>👨‍👩‍👧</Text>
                  <Text style={{ fontFamily: 'Nunito_700Bold', color: Colors.green, fontSize: 12 }}>
                    {t('linked_parents_title', 'Linked Parents: {{parents}} 👨‍👩‍👧', { parents: allParentTags || '@parent_boss' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 11 }}>⚙️ Manage</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // If NOT approved, check if there is a pending invitation
          const pendingInviteChild = !isApproved ? children.find(c => c.isApproved === false && c.linkedParents && c.linkedParents.length > 0) : null;
          const hasPendingInvitation = !isApproved && (approvalStatus === 'pending' || Boolean(pendingInviteChild));
          const pendingParentTag = pendingInviteChild?.linkedParents[0] || parentEmail || validParentTags[0] || 'parent_boss';

          if (hasPendingInvitation) {
            const isKidInitiated = pendingInviteChild?.initiatedBy === 'kid' || approvalStatus === 'pending' || !pendingInviteChild?.initiatedBy;
            
            return (
              <View style={{ backgroundColor: Colors.cardYellow, borderWidth: 1.5, borderColor: Colors.amber, borderRadius: 16, padding: 14, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 20 }}>⏳</Text>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 15 }}>
                    {isKidInitiated ? t('parent_link_req_title', 'Parent Approval Pending ⏳') : t('parent_invite_recv_title', 'Parent Invitation Received 👨‍👩‍👧')}
                  </Text>
                </View>

                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  {isKidInitiated 
                    ? t('waiting_parent_approval_sub', 'Sent request to parent @{{parent}}. Waiting for parent to tap "APPROVE LINK ✅" on their dashboard ⏳', { parent: pendingParentTag })
                    : t('parent_invited_you_sub', 'Parent @{{parent}} invited you to link accounts and manage daily quests!', { parent: pendingParentTag })}
                </Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {!isKidInitiated && (
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: Colors.green, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      onPress={() => {
                        acceptParentInvite(pendingParentTag);
                        alert('🎉 Account linked with parent!');
                      }}
                    >
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 13 }}>
                        {t('btn_accept_link', 'ACCEPT LINK ✅')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    onPress={() => {
                      denyParentInvite(pendingParentTag);
                      alert('Request cancelled.');
                    }}
                  >
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.red, fontSize: 13 }}>
                      {isKidInitiated ? t('btn_cancel_request', 'CANCEL REQUEST ❌') : t('btn_deny_link', 'DENY ❌')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={{ backgroundColor: Colors.surface2, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 13 }}>
                    {t('link_account_title', 'Link Parent Account')}
                  </Text>
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 11 }}>
                    {t('link_parent_hint', 'Enter parent nickname or email for approvals ⏳')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: Colors.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                onPress={() => router.push('/link-account')}
              >
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 12 }}>
                  {t('btn_send_request', 'Link 🚀')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Date Chip */}
        <View style={styles.dateChipWrapper}>
          <Text style={styles.dateChipText}>{getFormatDate().toUpperCase()}</Text>
        </View>

        {/* Daily Mystery Supply Drop Crate (Webs of Influence Reciprocity + 100 Things Dopamine Seeking) */}
        {hasUnclaimedDailyChest && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenSupplyCrate}
            style={styles.crateCard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <Text style={{ fontSize: 36 }}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.crateTitle}>FREE GIFT! 🎁</Text>
                <Text style={styles.crateSub}>+{25 + currentStreak * 5} 💰 WAITING</Text>
              </View>
            </View>
            <View style={styles.crateBtn}>
              <Text style={styles.crateBtnText}>OPEN! 🎁</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* QuestBlox Hero Showcase Stage (Visual-First, Clean Canvas, No Box Inception) */}
        <View style={styles.summaryCard}>
          <View style={styles.charArea}>
            <View style={styles.avatarBorder}>
              {getAvatarDisplay().image ? (
                <Image source={getAvatarDisplay().image} style={styles.avatarImg} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: 38 }}>{getAvatarDisplay().emoji || '⭐'}</Text>
              )}
            </View>
            <View style={styles.companionBubble}>
              <Text style={styles.companionBubbleText}>
                {companionMessage}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={styles.levelBadge}>
                <Trophy size={14} color="#FFD700" />
                <Text style={styles.levelBadgeText}>
                  LVL {currentLevel}
                </Text>
              </View>
              <Text style={styles.charPct}>{progressPct}% DONE</Text>
            </View>

            {/* Thick Tactile Candy XP Bar */}
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${progressPct}%`, backgroundColor: themeColors.accent }]} />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.xpLabel}>
                {completedCount}/{totalCount} Quests
              </Text>
              <Text style={styles.xpLabel}>
                {xp}/100 XP
              </Text>
            </View>

            {/* Active Hero Skill Buff Pill */}
            <View style={styles.heroSkillPill}>
              <Zap size={13} color={Colors.amber} />
              <Text style={styles.heroSkillText} numberOfLines={1}>
                {avatarSkill.name}: {avatarSkill.shortBuff}
              </Text>
            </View>
          </View>
        </View>

        {/* Goal-Gradient "Next Hero Unlock" Progress Bar */}
        {nextUnlock && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/shop')}
            style={styles.nextHeroCard}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={Colors.amber} />
                <Text style={styles.nextHeroTitle}>
                  NEXT: {nextUnlock.name.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.nextHeroCoins}>
                {coins} / {nextUnlock.price} 💰
              </Text>
            </View>
            <View style={styles.nextHeroTrack}>
              <View style={[styles.nextHeroFill, { width: `${nextUnlock.progressPct}%` }]} />
            </View>
            <Text style={styles.nextHeroHint}>
              {nextUnlock.canUnlockNow ? '🎉 UNLOCK IN SHOP!' : `${nextUnlock.coinsNeeded} 💰 TO UNLOCK`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sick Mode Toggle */}
        <View style={styles.sickToggleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Moon size={18} color={isSick ? Colors.blue : Colors.textSecondary} />
            <Text style={styles.sickText}>REST DAY 🌙</Text>
          </View>
          <Switch 
            value={isSick} 
            onValueChange={setSick} 
            trackColor={{ false: '#272B40', true: Colors.blue }}
            thumbColor={Colors.text}
          />
        </View>

        {isSick && (
          <View style={styles.sickMessage}>
            <Moon size={18} color={Colors.blue} />
            <Text style={styles.sickMessageText}>{t('sick_mode_message')}</Text>
          </View>
        )}

        {/* Loss-Aversion Pending Daily Vault & Zeigarnik Quest Chain Stepper */}
        <View style={styles.vaultCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Lock size={16} color={Colors.amber} />
              <Text style={styles.vaultTitle}>
                VAULT 🔒
              </Text>
            </View>
            <Text style={styles.vaultReward}>
              +{pendingVaultCoins} 💰 · +{pendingVaultXP} XP
            </Text>
          </View>

          {/* Connected Zeigarnik Quest Chain Stepper */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {tasks.map((t, idx) => (
              <React.Fragment key={t.id}>
                <View style={[
                  styles.vaultStepNode,
                  t.done && styles.vaultStepNodeDone,
                  superchargedTaskId === t.id && !t.done && styles.vaultStepNodeSuper,
                ]}>
                  <Text style={[styles.vaultStepText, t.done && styles.vaultStepTextDone]}>
                    {t.done ? '✓' : idx + 1}
                  </Text>
                </View>
                <View style={[styles.vaultStepLine, t.done && styles.vaultStepLineDone]} />
              </React.Fragment>
            ))}
            <View style={[
              styles.vaultBossNode,
              epicClaimed && styles.vaultBossNodeDone,
            ]}>
              <Text style={[styles.vaultBossText, epicClaimed && styles.vaultBossTextDone]}>
                👑 BOSS
              </Text>
            </View>
          </View>
        </View>

        {/* QUEST LOG Section */}
        <View style={[styles.section, isSick && styles.disabledSection]} pointerEvents={isSick ? 'none' : 'auto'}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Gamepad2 size={18} color="#ab47bc" />
              <Text style={styles.secTitle}>QUESTS ⚔️</Text>
              {comboInfo.multiplier > 1.0 && (
                <View style={[styles.comboPill, { borderColor: comboInfo.color }]}>
                  <Text style={[styles.comboPillText, { color: comboInfo.color }]}>
                    {comboInfo.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.secCount}>{completedCount}/{totalCount} DONE</Text>
          </View>

          {/* EPIC DAILY BOSS Card with Monster Shield Bar */}
          <View style={[styles.epicBossCard, isBossVulnerable && styles.epicBossCardVulnerable]}>
            <View style={styles.epicHeaderRow}>
              <Crown size={16} color={Colors.amber} />
              <Text style={styles.epicTitleText}>BOSS FIGHT 👑</Text>
            </View>
            
            <Text style={styles.epicQuestName}>
              {epicBossTask || t('epic_boss_task')}
            </Text>

            {/* Interactive Boss Monster Shield Bar */}
            <View style={{ marginVertical: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: isBossVulnerable ? Colors.green : Colors.amber }}>
                  {isBossVulnerable ? '💥 SHIELD BROKEN!' : `🛡️ SHIELD: ${bossShieldPct}%`}
                </Text>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: Colors.textSecondary }}>
                  {regularDoneCount}/{regularTasksCount} 💥
                </Text>
              </View>
              <View style={styles.shieldTrack}>
                <View style={[styles.shieldFill, { width: `${bossShieldPct}%`, backgroundColor: isBossVulnerable ? Colors.green : Colors.red }]} />
              </View>
            </View>
            
            {/* Hold to claim button inside the Epic Boss card */}
            <HoldToClaim 
              isClaimed={epicClaimed} 
              onClaim={handleEpicClaim}
              title={t('hold_to_claim_xp', { xp: (epicBossXP || 35) + (avatarSkill.bossBonusXP || 0) + (isBossVulnerable ? 25 : 0) })}
              claimedTitle={t('claimed_banner_xp', { xp: (epicBossXP || 35) + (avatarSkill.bossBonusXP || 0) + (isBossVulnerable ? 25 : 0) })}
              durationMs={avatarSkill.bossHoldDurationMs || 1500}
              fastChargeLabel={avatarSkill.bossHoldDurationMs ? `⚡ 2x Speed!` : undefined}
            />
          </View>

          {/* Tiered Hybrid Strategy Quest List */}
          <View style={styles.verticalList}>
            {tasks.map((task) => {
              const isMediumOrHard = task.diff === 'med' || task.diff === 'hard' || task.freq === 'weekdays' || task.freq === 'weekends' || task.freq === 'saturday' || task.freq === 'sunday';
              const isSupercharged = superchargedTaskId === task.id;
              const baseRewardCoins = task.diff === 'hard' ? 35 : (task.diff === 'med' ? 20 : 10) + (task.mystery ? 10 : 0);
              const boostedCoins = isSupercharged ? baseRewardCoins * 2 : baseRewardCoins;

              // Tier 2: Medium / Hard Quests -> Option C (Slide Left-to-Right)
              if (isMediumOrHard) {
                return (
                  <View key={task.id} style={[styles.slideCardWrap, isSupercharged && styles.superchargedCard]}>
                    <SlideToComplete
                      title={task.mystery ? `${task.name} 🎁` : task.name}
                      icon={task.icon || '⭐'}
                      isDone={task.done}
                      badgeLabel={isSupercharged ? '⚡ 2X' : (task.mystery ? '🎁 BONUS' : undefined)}
                      badgeColor={isSupercharged ? Colors.amber : Colors.blue}
                      badgeBg={isSupercharged ? Colors.amberDim : Colors.blueDim}
                      onComplete={() => handleTaskCompletion(task.id)}
                    />
                    {!task.done && (
                      <View style={styles.superchargeRow}>
                        <TouchableOpacity
                          onPress={() => setSuperchargedTask(isSupercharged ? null : task.id)}
                          style={[styles.superchargePill, isSupercharged && styles.superchargePillActive]}
                        >
                          <Zap size={13} color={isSupercharged ? '#121212' : Colors.amber} />
                          <Text style={[styles.superchargePillText, isSupercharged && styles.superchargePillTextActive]}>
                            {isSupercharged ? '⚡ 2X ACTIVE' : '⚡ 2X BOOST'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.questCoinReward}>
                          +{boostedCoins} 💰
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }

              // Tier 1: Easy / Routine Quests -> Big Visual Icon + 1-Tap Checkbox
              return (
                <BouncingButton 
                  key={task.id} 
                  style={[
                    styles.taskCard, 
                    task.done && styles.taskDone,
                    isSupercharged && styles.superchargedCard
                  ]}
                  onPress={() => handleTaskCompletion(task.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    {/* Big 52x52 Visual Chore Icon Halo */}
                    <View style={[styles.habitIconBox, task.done && styles.habitIconBoxDone]}>
                      <Text style={styles.habitIconEmoji}>{task.icon || '⭐'}</Text>
                    </View>

                    {/* Quest Title & Reward */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskName, task.done && styles.taskNameDone]}>
                        {task.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={styles.questCoinReward}>
                          +{boostedCoins} 💰
                        </Text>
                        {task.mystery && (
                          <View style={styles.mysteryPill}>
                            <Text style={styles.mysteryPillText}>🎁 BONUS</Text>
                          </View>
                        )}
                        {isSupercharged && (
                          <View style={styles.superchargedPill}>
                            <Text style={styles.superchargedPillText}>⚡ 2X</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Supercharge toggle & Big 38x38 Checkbox */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {!task.done && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            setSuperchargedTask(isSupercharged ? null : task.id);
                          }}
                          style={[styles.superIconBtn, isSupercharged && styles.superIconBtnActive]}
                        >
                          <Zap size={16} color={isSupercharged ? '#121212' : Colors.amber} />
                        </TouchableOpacity>
                      )}
                      
                      <View style={[styles.check, task.done && styles.checkOn]}>
                        {task.done ? (
                          <CheckCircle2 size={24} color="#121212" />
                        ) : (
                          <Star size={20} color={Colors.textMuted} />
                        )}
                      </View>
                    </View>
                  </View>

                  {task.done && (
                    <View style={styles.stamp}>
                      <Text style={styles.stampText}>{t('completed_stamp')}</Text>
                    </View>
                  )}
                </BouncingButton>
              );
            })}
          </View>
        </View>

        {/* Daily Mood Rating Card */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>TODAY'S MOOD 😄</Text>
          <View style={styles.moodRow}>
            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'wiped' && styles.moodCardActive]} 
              onPress={() => setDailyMood('wiped')}
            >
              <Text style={styles.moodEmoji}>😴</Text>
              <Text style={[styles.moodLabel, dailyMood === 'wiped' && styles.moodLabelActive]}>TIRED</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'thriving' && styles.moodCardActive]} 
              onPress={() => setDailyMood('thriving')}
            >
              <Text style={styles.moodEmoji}>😄</Text>
              <Text style={[styles.moodLabel, dailyMood === 'thriving' && styles.moodLabelActive]}>GREAT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'too_easy' && styles.moodCardActive]} 
              onPress={() => setDailyMood('too_easy')}
            >
              <Text style={styles.moodEmoji}>😎</Text>
              <Text style={[styles.moodLabel, dailyMood === 'too_easy' && styles.moodLabelActive]}>EASY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Stats Grid Cards (Matching User Screenshot 2) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedCount}/{totalCount}</Text>
            <View style={styles.statBadgeRow}>
              <Text style={styles.statBadgeText}>✅ DONE</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{currentStreak}</Text>
            <View style={styles.statBadgeRow}>
              <Text style={styles.statBadgeText}>🔥 STREAK</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{currentLevel}</Text>
            <View style={styles.statBadgeRow}>
              <Text style={styles.statBadgeText}>⭐ LEVEL</Text>
            </View>
          </View>
        </View>

        {/* THIS WEEK Section (Matching User Screenshot 2) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Calendar size={16} color={Colors.blue} />
            <Text style={styles.secTitle}>THIS WEEK</Text>
          </View>
          <View style={styles.weekGrid}>
            {weekDaysData.map((item, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.weekCell,
                  item.isToday && styles.weekCellToday,
                  item.pct === '100%' && styles.weekCellFull,
                ]}
              >
                <Text style={styles.weekDayLabel}>{item.day}</Text>
                <Text style={styles.weekPctText}>{item.pct}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* QUEST LOG History Section (Matching User Screenshot 2) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ScrollText size={16} color={Colors.amber} />
            <Text style={styles.secTitle}>QUEST LOG</Text>
          </View>
          <View style={styles.historyList}>
            {historyLog.map((item, idx) => (
              <View key={idx} style={styles.historyRow}>
                <Text style={styles.historyDate}>{item.date}</Text>
                {item.ill ? (
                  <Text style={[styles.historyBadge, { color: Colors.blue }]}>🤒 Sick Day (Paused)</Text>
                ) : (
                  <Text style={[styles.historyBadge, { color: item.pct >= 80 ? Colors.green : Colors.amber }]}>
                    {item.pct >= 80 ? '🏆' : '⭐'} {item.pct}% · {item.tasks} quests
                  </Text>
                )}
              </View>
            ))}
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

      <PrizeWheelModal 
        visible={showPrizeWheel} 
        onClose={() => {
          setShowPrizeWheel(false);
          setPlayConfetti(true);
        }} 
        prizeName={wonPrize} 
      />

      <LottieConfetti play={playConfetti} onAnimationFinish={() => setPlayConfetti(false)} />
      
      <DancingBananaModal 
        visible={showDancingBanana} 
        onClose={() => {
          setShowDancingBanana(false);
          if (pendingWheelSpin) {
            setPendingWheelSpin(false);
            setTimeout(() => {
              setShowPrizeWheel(true);
            }, 300);
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
    paddingTop: 16,
    paddingBottom: 60,
    paddingHorizontal: 18,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ rotate: '-10deg' }],
  },
  robloxDiamond: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  appTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  appSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border2,
    gap: 4,
  },
  coinIcon: {
    fontSize: 14,
  },
  coinText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 14,
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
  dateChipWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  dateChipText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: '#1E2235',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  charArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#272B40',
    borderWidth: 3,
    borderColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  avatarImg: {
    width: 76,
    height: 76,
  },
  companionBubble: {
    backgroundColor: '#272B40',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
  },
  companionBubbleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#FFB800',
  },
  charPct: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: '#FFB800',
  },
  summaryRight: {
    flex: 1,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  xpTrack: {
    height: 12,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 999,
  },
  xpLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  heroSkillPill: {
    marginTop: 8,
    backgroundColor: '#272B40',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSkillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    flex: 1,
  },
  crateCard: {
    backgroundColor: '#1E1704',
    borderBottomWidth: 4,
    borderBottomColor: '#B45309',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  crateTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  crateSub: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FDE68A',
    fontSize: 11,
    marginTop: 2,
  },
  crateBtn: {
    backgroundColor: Colors.amber,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#B45309',
  },
  crateBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: '#121212',
    fontSize: 12,
  },
  nextHeroCard: {
    backgroundColor: '#1A1D2E',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  nextHeroTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.text,
  },
  nextHeroCoins: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.amber,
  },
  nextHeroTrack: {
    height: 8,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 5,
  },
  nextHeroFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    borderRadius: 999,
  },
  nextHeroHint: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    marginTop: 2,
  },
  sickToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1E2235',
    borderRadius: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
    marginBottom: 16,
  },
  sickText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
  },
  sickMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.blueDim,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  sickMessageText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.blue,
  },
  vaultCard: {
    backgroundColor: '#1A1D2E',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  vaultTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.amber,
    letterSpacing: 0.5,
  },
  vaultReward: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.amber,
  },
  vaultStepNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultStepNodeDone: {
    backgroundColor: Colors.green,
  },
  vaultStepNodeSuper: {
    borderWidth: 2,
    borderColor: Colors.amber,
  },
  vaultStepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Nunito_800ExtraBold',
  },
  vaultStepTextDone: {
    color: '#121212',
  },
  vaultStepLine: {
    flex: 1,
    height: 4,
    backgroundColor: '#272B40',
    marginHorizontal: 3,
    borderRadius: 2,
  },
  vaultStepLineDone: {
    backgroundColor: Colors.green,
  },
  vaultBossNode: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultBossNodeDone: {
    backgroundColor: Colors.amber,
  },
  vaultBossText: {
    fontSize: 11,
    color: Colors.amber,
    fontFamily: 'Nunito_800ExtraBold',
  },
  vaultBossTextDone: {
    color: '#121212',
  },
  section: {
    marginBottom: 24,
  },
  disabledSection: {
    opacity: 0.3,
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
  epicBossCard: {
    backgroundColor: '#1E1414',
    borderBottomWidth: 5,
    borderBottomColor: '#991B1B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  epicBossCardVulnerable: {
    backgroundColor: '#112215',
    borderBottomColor: '#166534',
    shadowColor: Colors.green,
  },
  epicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  epicTitleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.amber,
    letterSpacing: 1,
  },
  epicQuestName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  shieldTrack: {
    height: 8,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
  },
  shieldFill: {
    height: '100%',
    borderRadius: 999,
  },
  verticalList: {
    gap: 12,
  },
  slideCardWrap: {
    backgroundColor: '#1E2235',
    borderRadius: 18,
    padding: 12,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.35)',
  },
  superchargedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.amber,
  },
  superchargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  superchargePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#272B40',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  superchargePillActive: {
    backgroundColor: Colors.amber,
  },
  superchargePillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  superchargePillTextActive: {
    color: '#121212',
  },
  taskCard: {
    backgroundColor: '#1E2235',
    borderRadius: 18,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.35)',
  },
  taskDone: {
    backgroundColor: '#151724',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    opacity: 0.75,
  },
  check: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#373D54',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#272B40',
  },
  checkOn: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  habitIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIconBoxDone: {
    backgroundColor: '#1C1F2E',
  },
  habitIconEmoji: {
    fontSize: 28,
  },
  taskName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
  },
  taskNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  questCoinReward: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.green,
  },
  mysteryPill: {
    backgroundColor: Colors.amberDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  mysteryPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.amber,
  },
  superchargedPill: {
    backgroundColor: Colors.amberDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  superchargedPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.amber,
  },
  superIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#272B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superIconBtnActive: {
    backgroundColor: Colors.amber,
  },
  stamp: {
    position: 'absolute',
    right: 12,
    top: 14,
    borderWidth: 2,
    borderColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    transform: [{ rotate: '-12deg' }],
    backgroundColor: 'rgba(18,18,18,0.85)',
  },
  stampText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.red,
    letterSpacing: 1,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moodCard: {
    flex: 1,
    backgroundColor: '#1E2235',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
  },
  moodCardActive: {
    backgroundColor: '#272B40',
    borderBottomColor: Colors.red,
    borderBottomWidth: 4,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  moodLabelActive: {
    color: Colors.red,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E2235',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 4,
  },
  statBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekCell: {
    flex: 1,
    aspectRatio: 0.9,
    backgroundColor: '#1E2235',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  weekCellToday: {
    borderBottomColor: Colors.red,
    backgroundColor: '#2A1F2D',
    borderBottomWidth: 4,
  },
  weekCellFull: {
    backgroundColor: '#162C22',
    borderBottomColor: Colors.green,
  },
  weekDayLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  weekPctText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.text,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    backgroundColor: '#1E2235',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  historyBadge: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
  },
});
