import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { LogOut, Thermometer, Moon, CheckCircle2, Star, Trophy, Gamepad2, Sun, Calendar, ScrollText, Settings } from 'lucide-react-native';
import HoldToClaim from '../../components/HoldToClaim';
import PrizeWheelModal from '../../components/PrizeWheelModal';
import BouncingButton from '../../components/BouncingButton';
import { playSuccessChime } from '../../utils/audio';
import LottieConfetti from '../../components/LottieConfetti';
import DancingBananaModal from '../../components/DancingBananaModal';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import SlideToComplete from '../../components/SlideToComplete';
import SettingsModal from '../../components/SettingsModal';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_TASKS = [
  { id: '1', name: 'Brush your teeth 🪥', icon: '🪥', done: false, diff: 'easy' as const, freq: 'daily' as const, mystery: false, date: new Date().toISOString() },
];

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
  const tasks = (rawTasks && rawTasks.length > 0) ? rawTasks : DEFAULT_TASKS;
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
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
  const [epicClaimed, setEpicClaimed] = useState(false);
  const [wonPrize, setWonPrize] = useState('');
  const [playConfetti, setPlayConfetti] = useState(false);
  const [showDancingBanana, setShowDancingBanana] = useState(false);
  const [pendingWheelSpin, setPendingWheelSpin] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

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
  const currentStreak = completedCount > 0 ? 1 : 0;
  const currentLevel = progressPct === 100 ? 3 : progressPct > 50 ? 2 : 1;

  const handleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isNowDone = !task.done;
    toggleTaskDone(taskId);

    if (isNowDone) {
      playSuccessChime();

      // Check if ALL daily tasks are now completed
      const remainingUndone = tasks.filter(t => t.id !== taskId && !t.done);
      const isAllDailyQuestsDone = remainingUndone.length === 0;

      if (isAllDailyQuestsDone) {
        console.log('🎉 ALL daily quests completed! Awarding prize wheel spin.');
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)] || 'Extra Roblox Coins!';
        setWonPrize(randomPrize);
        addWonPrize(randomPrize);
        setPendingWheelSpin(true);
      }

      setShowDancingBanana(true);
    }
  };

  const handleEpicClaim = () => {
    setEpicClaimed(true);
    playSuccessChime();
    
    // Pick prize wheel reward for Epic Boss Quest completion
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
      return map[currentAvatar] || { image: require('../../assets/images/roblox_noob.png') };
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Roblox Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <View style={styles.robloxDiamond} />
            </View>
            <View>
              <Text style={styles.appTitle}>{fullName || nickname || 'Kid Hero'}</Text>
              <Text style={styles.appSub}>@{nickname || 'hero'} · {t('app_subtitle')}</Text>
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

        {/* Level & XP Summary Card (Original Roblox Summary Row) */}
        <View style={styles.summaryCard}>
          <View style={styles.charArea}>
            <View style={styles.avatarBorder}>
              {getAvatarDisplay().image ? (
                <Image source={getAvatarDisplay().image} style={styles.avatarImg} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: 32 }}>{getAvatarDisplay().emoji}</Text>
              )}
            </View>
            <Text style={styles.charPct}>{progressPct}% DONE</Text>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.levelBadge}>
              <Trophy size={12} color={Colors.red} />
              <Text style={styles.levelBadgeText}>
                {progressPct === 100 ? t('level_champion') : progressPct > 50 ? t('level_adventurer') : t('level_explorer')}
              </Text>
            </View>

            <Text style={styles.bigLabel}>{t('daily_xp_progress')}</Text>
            
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${progressPct}%` }]} />
            </View>
            
            <Text style={styles.xpLabel}>
              {completedCount} / {totalCount} {t('quests_completed')} ({completedCount * 20} {t('earned_xp')})
            </Text>
          </View>
        </View>

        {/* Sick Mode Toggle */}
        <View style={styles.sickToggleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Thermometer size={18} color={isSick ? Colors.blue : Colors.textSecondary} />
            <Text style={styles.sickText}>{t('sick_mode_toggle')}</Text>
          </View>
          <Switch 
            value={isSick} 
            onValueChange={setSick} 
            trackColor={{ false: Colors.surface2, true: Colors.blue }}
            thumbColor={Colors.text}
          />
        </View>

        {isSick && (
          <View style={styles.sickMessage}>
            <Moon size={18} color={Colors.blue} />
            <Text style={styles.sickMessageText}>{t('sick_mode_message')}</Text>
          </View>
        )}

        {/* QUEST LOG Section (Matching User Screenshot 1) */}
        <View style={[styles.section, isSick && styles.disabledSection]} pointerEvents={isSick ? 'none' : 'auto'}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Gamepad2 size={18} color="#ab47bc" />
              <Text style={styles.secTitle}>{t('quest_log')}</Text>
            </View>
            <Text style={styles.secCount}>{completedCount} / {totalCount} done</Text>
          </View>

          {/* EPIC DAILY BOSS Card */}
          <View style={styles.epicBossCard}>
            <View style={styles.epicHeaderRow}>
              <Sun size={14} color={Colors.amber} />
              <Text style={styles.epicTitleText}>{t('epic_daily_boss')}</Text>
            </View>
            
            <Text style={styles.epicQuestName}>
              {epicBossTask || t('epic_boss_task')}
            </Text>
            
            {/* Hold to claim button inside the Epic Boss card */}
            <HoldToClaim 
              isClaimed={epicClaimed} 
              onClaim={handleEpicClaim}
              title={t('hold_to_claim_xp', { xp: epicBossXP || 35 })}
              claimedTitle={t('claimed_banner_xp', { xp: epicBossXP || 35 })}
            />
          </View>

          {/* Tiered Hybrid Strategy Quest List */}
          <View style={styles.verticalList}>
            {tasks.map((task) => {
              const diff = getDiffBadge(task.freq);
              const isMediumOrHard = task.diff === 'med' || task.diff === 'hard' || task.freq === 'weekdays' || task.freq === 'weekends' || task.freq === 'saturday' || task.freq === 'sunday';

              // Tier 2: Medium / Hard Quests -> Option C (Slide Left-to-Right)
              if (isMediumOrHard) {
                return (
                  <SlideToComplete
                    key={task.id}
                    title={task.name}
                    icon={task.icon || '⭐'}
                    isDone={task.done}
                    badgeLabel={diff.label}
                    badgeColor={diff.color}
                    badgeBg={diff.bg}
                    onComplete={() => handleTaskCompletion(task.id)}
                  />
                );
              }

              // Tier 1: Easy / Routine Quests -> Option A (Instant 1-Tap Checkbox)
              return (
                <BouncingButton 
                  key={task.id} 
                  style={[
                    styles.taskCard, 
                    task.done && styles.taskDone
                  ]}
                  onPress={() => handleTaskCompletion(task.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.check, task.done && styles.checkOn]}>
                      {task.done ? (
                        <CheckCircle2 size={20} color="#121212" />
                      ) : (
                        <Star size={18} color={Colors.textMuted} />
                      )}
                    </View>
                    
                    <View style={styles.habitIconBox}>
                      <Text style={styles.habitIconEmoji}>{task.icon || '⭐'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskName, task.done && styles.taskNameDone]}>{task.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={styles.taskFreqLabel}>{getFreqBadge(task.freq)}</Text>
                        <View style={[styles.diffTag, { backgroundColor: diff.bg }]}>
                          <Text style={[styles.diffTagText, { color: diff.color }]}>{diff.label}</Text>
                        </View>
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

        {/* Daily Mood Rating Card ("How did today feel?") */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('how_did_today_feel')}</Text>
          <View style={styles.moodRow}>
            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'wiped' && styles.moodCardActive]} 
              onPress={() => setDailyMood('wiped')}
            >
              <Text style={styles.moodEmoji}>😴</Text>
              <Text style={[styles.moodLabel, dailyMood === 'wiped' && styles.moodLabelActive]}>{t('mood_wiped')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'thriving' && styles.moodCardActive]} 
              onPress={() => setDailyMood('thriving')}
            >
              <Text style={styles.moodEmoji}>😄</Text>
              <Text style={[styles.moodLabel, dailyMood === 'thriving' && styles.moodLabelActive]}>{t('mood_thriving')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.moodCard, dailyMood === 'too_easy' && styles.moodCardActive]} 
              onPress={() => setDailyMood('too_easy')}
            >
              <Text style={styles.moodEmoji}>😎</Text>
              <Text style={[styles.moodLabel, dailyMood === 'too_easy' && styles.moodLabelActive]}>{t('mood_too_easy')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.moodSub}>{t('rate_today_sub')}</Text>
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  charArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 54,
    height: 54,
  },
  charPct: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.red,
    marginTop: 6,
  },
  summaryRight: {
    flex: 1,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.redDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  levelBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.red,
    letterSpacing: 0.5,
  },
  bigLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 6,
  },
  xpTrack: {
    height: 10,
    backgroundColor: Colors.surface2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.red,
    borderRadius: 999,
  },
  xpLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  sickToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sickText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.text,
  },
  sickMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.blueDim,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(41,182,246,0.3)',
  },
  sickMessageText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.blue,
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
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  secCount: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  epicBossCard: {
    backgroundColor: '#16140b',
    borderWidth: 2,
    borderColor: Colors.amber,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  epicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  epicTitleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.amber,
    letterSpacing: 1.5,
  },
  epicQuestName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  verticalList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  taskDone: {
    backgroundColor: Colors.background,
    borderStyle: 'dashed',
    borderColor: Colors.border2,
    opacity: 0.8,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
  checkOn: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  habitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIconEmoji: {
    fontSize: 20,
  },
  taskName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: Colors.text,
  },
  taskNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  taskFreqLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  diffTagText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
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
  moodSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moodCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodCardActive: {
    borderColor: Colors.red,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  moodLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 32,
    color: Colors.text,
    marginBottom: 6,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  weekCellToday: {
    borderColor: Colors.red,
    backgroundColor: Colors.redDim,
    borderWidth: 2,
  },
  weekCellFull: {
    backgroundColor: Colors.greenDim,
    borderColor: 'rgba(0,230,118,0.4)',
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
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
