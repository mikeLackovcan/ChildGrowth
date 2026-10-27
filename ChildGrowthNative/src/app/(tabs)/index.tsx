import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, Coins, MoreHorizontal, Pencil, Play, Plus, Settings, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { Task, useAppStore } from '../../store/useAppStore';
import { Colors, QUEST_BACKGROUNDS } from '../../constants/theme';
import SettingsModal from '../../components/SettingsModal';
import ActionSheet from '../../components/ActionSheet';
import UndoNotice, { Notice } from '../../components/UndoNotice';
import { scheduleTaskReminders } from '../../lib/notifications';
import { calculateQuestReward } from '../../lib/heroRewards';
import { isQuestDue, isQuestLater, localDateKey } from '../../lib/questSchedule';
import HeroCelebrationModal from '../../components/HeroCelebrationModal';
import { playSound } from '../../lib/sound';
import CoinFeedback from '../../components/CoinFeedback';
import PrizeWheelModal from '../../components/PrizeWheelModal';
import { useTranslation } from 'react-i18next';
import { questName } from '../../lib/questTemplates';
import { useExperienceSettings } from '../../store/useExperienceSettings';
import { useWorldStore } from '../../store/useWorldStore';
import { newlyAffordableBuilding, worldPowerBalance, WORLD_BUILDINGS, type WorldBuildingType } from '../../lib/worldEconomy';

export default function TrackerScreen() {
  const { t } = useTranslation();
  const simpleView = useExperienceSettings(state => state.simpleView);
  const state = useAppStore();
  const [buildOpportunity, setBuildOpportunity] = useState<WorldBuildingType | null>(null);
  const ownerKey = state.userId || state.nickname || 'guest-local';
  useEffect(() => {
    if (state.role === 'child') void useWorldStore.getState().hydrate(ownerKey);
  }, [ownerKey, state.role]);
  const { taskId, completedTaskId } = useLocalSearchParams<{ taskId?: string; completedTaskId?: string }>();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  const [coinFeedback, setCoinFeedback] = useState({ amount: 0, sequence: 0 });
  const [wheelPrize, setWheelPrize] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const dismissNotice = useCallback(() => setNotice(null), []);
  const background = QUEST_BACKGROUNDS[state.activeBackground] || QUEST_BACKGROUNDS.clean;

  useEffect(() => {
    if (!state.userEmail) router.replace('/');
    else if (state.role === 'parent') router.replace('/parent-dashboard');
    else if (state.userId === 'guest-local' && state.fullName === 'Guest Hero' && !state.tasks.length
      && !state.totalEarned && !state.coins && !state.wonPrizes.length && state.unlockedAvatars.length <= 1)
      router.replace('../welcome');
  }, [state.userEmail, state.role, state.userId, state.fullName, state.tasks.length, state.totalEarned, state.coins, state.wonPrizes.length, state.unlockedAvatars.length]);
  useEffect(() => {
    const refresh = () => {
      useAppStore.getState().resetTasksForNewDay();
      setNow(new Date());
    };
    refresh();
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  useEffect(() => {
    if (taskId) { setSelectedId(taskId); router.setParams({ taskId: '' }); }
  }, [taskId]);
  useEffect(() => {
    if (state.userEmail && state.role !== 'parent') {
      void scheduleTaskReminders(state.tasks, state.currentAvatar).catch(console.warn);
    }
  }, [state.tasks, state.currentAvatar, state.userEmail, state.role, state.language]);

  const tasks = state.tasks.filter(task => isQuestDue(task, now));
  const done = tasks.filter(task => task.done);
  const remaining = tasks.filter(task => !task.done);
  const later = remaining.filter(task => isQuestLater(task, now));
  const ready = remaining.filter(task => !isQuestLater(task, now));
  const allDone = tasks.length > 0 && remaining.length === 0;
  const hasWheelRewards = state.prizes.some(prize => prize.trim());
  const wheelReady = allDone && hasWheelRewards && state.lastSpinDate !== localDateKey();
  const earned = state.dailyEarnings.date === localDateKey() ? state.dailyEarnings.coins : 0;
  const selected = state.tasks.find(task => task.id === selectedId);
  const menuTask = state.tasks.find(task => task.id === menuId);
  const firstName = (state.fullName || state.nickname || t('hero_fallback')).split(' ')[0];
  const openEditor = (id: string) => { setMenuId(null); setSelectedId(null); router.push({ pathname: '/manage-tasks', params: { taskId: id } }); };
  const openDailyWheel = useCallback(() => {
    const prize = useAppStore.getState().claimDailyWheelPrize();
    if (prize) setWheelPrize(prize);
  }, []);
  const finishCelebration = useCallback(() => {
    setCelebration(null);
    setTimeout(openDailyWheel, 180);
  }, [openDailyWheel]);

  const showCompletion = useCallback((task: Task) => {
    setSelectedId(null);
    if (task.pendingApproval) {
      setNotice({ key: Date.now(), text: t('day_sent') });
      return;
    }
    if (!task.done) return;
    const reward = task.rewardedCoins || 0;
    const world = useWorldStore.getState();
    const current = useAppStore.getState();
    if (world.hydrated && world.ownerKey === (current.userId || current.nickname || 'guest-local')) {
      setBuildOpportunity(newlyAffordableBuilding(
        worldPowerBalance(current.totalEarned - reward, world.spentPower),
        worldPowerBalance(current.totalEarned, world.spentPower), world.placements));
    }
    setCoinFeedback({ amount: reward, sequence: Date.now() });
    setNotice({
      key: Date.now(), text: t('coins_completion', { name: questName(task), count: reward }),
      undo: () => {
        setBuildOpportunity(null);
        if (!useAppStore.getState().undoTaskCompletion(task.id)) {
          setNotice({ key: Date.now(), text: t('day_spent') });
        }
      },
    });
    const finishedDay = useAppStore.getState().tasks.filter(item => isQuestDue(item)).every(item => item.done);
    if (finishedDay) setCelebration(reward);
    else playSound('coin');
  }, [t]);
  useEffect(() => {
    if (!completedTaskId) return;
    const completed = useAppStore.getState().tasks.find(item => item.id === completedTaskId);
    if (completed) showCompletion(completed);
    router.setParams({ completedTaskId: '' });
  }, [completedTaskId, showCompletion]);
  const finish = (task: Task) => {
    const result = state.completeTask(task.id);
    const updated = useAppStore.getState().tasks.find(item => item.id === task.id);
    if (updated && (result.completed || result.pendingApproval)) showCompletion(updated);
  };
  const start = (task: Task) => {
    setSelectedId(null);
    router.push({ pathname: '/focus-session', params: { taskId: task.id } });
  };
  const remove = (task: Task) => {
    state.removeTask(task.id);
    setMenuId(null);
    setSelectedId(null);
    // A stopped timer is not restarted by restoring a deleted quest.
    setNotice({ key: Date.now(), text: t('quest_removed'), undo: () => state.restoreTask({ ...task, activeFocusStartedAt: undefined, focusNotificationId: undefined }) });
  };

  const taskRow = (task: Task) => (
    <View key={task.id} style={styles.taskRow}>
      <Pressable style={styles.taskMain} accessibilityRole="button" accessibilityLabel={t('quest_open', { name: questName(task) })} onPress={() => setSelectedId(task.id)}>
        <View style={[styles.taskIcon, simpleView && { width: 64, height: 64 }, task.done && styles.taskIconDone]}><Text style={[styles.emoji, simpleView && { fontSize: 36 }]}>{task.done ? '✓' : task.icon || '⭐'}</Text></View>
        <View style={styles.taskCopy}>
          <Text style={[styles.taskName, simpleView && { fontSize: 21 }]}>{questName(task)}</Text>
          <Text style={styles.taskMeta}>
            {task.done ? t('day_done') : task.pendingApproval ? t('day_waiting') :
              [task.reminderEnabled ? task.reminderTime : '', task.focusDurationMinutes ? t('duration_minutes', { value: task.focusDurationMinutes }) : '', t('coins_plus', { count: calculateQuestReward(task, state.tasks, state.currentAvatar, earned).coins })].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      {!task.done && !task.pendingApproval && (
        <Pressable style={styles.taskAction} accessibilityRole="button"
          accessibilityLabel={t('quest_action', { action: t(task.activeFocusStartedAt ? 'resume' : task.focusDurationMinutes ? 'start' : 'complete'), name: questName(task) })}
          onPress={() => task.focusDurationMinutes ? start(task) : finish(task)}>
          {task.focusDurationMinutes ? <Play size={18} color={Colors.primary} /> : <Check size={20} color={Colors.primary} />}
          <Text style={styles.actionText}>{task.activeFocusStartedAt ? t('resume') : task.focusDurationMinutes ? t('start') : t('done')}</Text>
        </Pressable>
      )}
      <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('quest_options_for', { name: questName(task) })} onPress={() => setMenuId(task.id)}>
        <MoreHorizontal size={22} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );

  if (!state.userEmail) return null;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>Quest Champ</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.wallet} accessibilityRole="button" accessibilityLabel={t('coins_spend', { count: state.coins })} onPress={() => router.push('/shop')}>
              <Coins size={20} color="#926500" /><Text style={styles.walletText}>{state.coins}</Text>
            </Pressable>
            <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('settings_title')} onPress={() => setSettingsVisible(true)}><Settings size={22} color={Colors.textSecondary} /></Pressable>
          </View>
        </View>
        <Text style={styles.greeting}>{t('day_name', { name: firstName })}</Text>
        {state.approvalStatus === 'pending' && state.parentEmail ? <View style={styles.familyInvite}>
          <View style={styles.inviteHeading}><ShieldCheck size={24} color={Colors.primary} /><View style={{ flex: 1 }}>
            <Text style={styles.inviteTitle}>{t('family_invite_title')}</Text>
            <Text style={styles.inviteSender}>{t('family_invite_sender', { parent: state.parentEmail })}</Text>
          </View></View>
          <View style={styles.inviteActions}>
            <Pressable accessibilityRole="button" style={styles.inviteAccept} onPress={() => state.acceptParentInvite(state.parentEmail || undefined)}>
              <Check size={19} color="#FFFFFF" /><Text style={styles.inviteAcceptText}>{t('family_invite_accept')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.inviteDecline} onPress={() => state.denyParentInvite(state.parentEmail || undefined)}>
              <X size={18} color={Colors.textSecondary} /><Text style={styles.inviteDeclineText}>{t('family_invite_decline')}</Text>
            </Pressable>
          </View>
        </View> : null}
        <View style={styles.banner}>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>{allDone ? t('day_you_did_it') : t('app_subtitle')}</Text>
            <Text style={styles.bannerText}>{allDone ? t('day_finished') : t('day_one')}</Text>
          </View>
          <Image source={require('../../../assets/branding/quest-hero-source.png')} style={styles.originalHero} accessibilityLabel={t('hero_original')} resizeMode="cover" />
        </View>
        <View style={styles.progressHeading}>
          <Text style={styles.sectionTitle}>{t('world_today')}</Text>
          <Text style={styles.meta}>{t('day_progress', { done: done.length, total: tasks.length })}</Text>
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: tasks.length || 1, now: done.length }}>
          <View style={[styles.progressFill, { width: `${tasks.length ? done.length / tasks.length * 100 : 0}%` }]} />
        </View>
        {allDone && !hasWheelRewards && <Text style={styles.meta}>{t('day_reward_setup')}</Text>}
        {wheelReady && <Pressable style={styles.wheelButton} accessibilityRole="button" onPress={openDailyWheel}>
          <Text style={styles.wheelIcon}>🎡</Text><View style={{ flex: 1 }}><Text style={styles.taskName}>{t('day_spin')}</Text><Text style={styles.meta}>{t('day_reward_waiting')}</Text></View><Text style={styles.linkText}>{t('spin')}</Text>
        </Pressable>}
        {tasks.length === 0 && <View style={styles.empty}><Text style={styles.emptyEmoji}>🌱</Text><Text style={styles.sectionTitle}>{state.tasks.length ? t('day_quiet') : t('day_first')}</Text><Text style={styles.meta}>{state.tasks.length ? t('day_no_quests') : t('day_pick')}</Text></View>}
        {ready.length > 0 && <>{later.length > 0 && <Text style={styles.groupTitle}>{t('now')}</Text>}{ready.map(taskRow)}</>}
        {later.length > 0 && <><Text style={styles.groupTitle}>{t('later')}</Text>{later.map(taskRow)}</>}
        {done.length > 0 && <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDone }} style={styles.doneToggle} onPress={() => setShowDone(value => !value)}>
            <Check size={18} color="#316327" /><Text style={styles.doneText}>{t('day_done_count', { count: done.length })}</Text><ChevronDown size={18} color={Colors.textSecondary} style={{ transform: [{ rotate: showDone ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showDone && done.map(taskRow)}
        </>}
        <View style={styles.footerActions}>
          <Pressable style={styles.addButton} accessibilityRole="button" accessibilityLabel={t('quest_add_accessible')} onPress={() => router.push('/manage-tasks')}>
            <Plus size={26} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.manageLink} accessibilityRole="button" onPress={() => router.push('/quest-list')}><Text style={styles.linkText}>{t('quest_all')}</Text></Pressable>
        </View>
        {buildOpportunity && <Pressable style={styles.goalLink} accessibilityRole="button" onPress={() => { setBuildOpportunity(null); router.push('/world'); }}>
          <Text style={styles.goalIcon}>{WORLD_BUILDINGS[buildOpportunity].icon}</Text>
          <Text style={[styles.linkText, { flex: 1 }]}>{t('world_ready_to_build', { item: t(WORLD_BUILDINGS[buildOpportunity].nameKey) })}</Text>
        </Pressable>}
        {state.rewardGoal && !state.rewardGoal.claimed && <Pressable style={styles.goalLink} onPress={() => router.push('/milestones')} accessibilityRole="button">
          <Text style={styles.goalIcon}>🎯</Text>
          <View style={{ flex: 1 }}><Text style={styles.taskName}>{state.rewardGoal.title}</Text><Text style={styles.meta}>{t('goal_progress', { earned: Math.min(state.rewardGoal.target, Math.max(0, state.totalEarned - state.rewardGoal.startCoins)), target: state.rewardGoal.target })}</Text></View>
          <Text style={styles.linkText}>{t('view')}</Text>
        </Pressable>}
      </ScrollView>
      <CoinFeedback amount={coinFeedback.amount} sequence={coinFeedback.sequence} />
      <UndoNotice notice={notice} onDismiss={dismissNotice} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <HeroCelebrationModal visible={celebration !== null} coins={celebration || 0} heroId={state.currentAvatar} onClose={finishCelebration} />
      <PrizeWheelModal visible={Boolean(wheelPrize)} prizeName={wheelPrize || ''} onClose={() => { setWheelPrize(null); router.push('/milestones'); }} />
      <ActionSheet visible={Boolean(selected)} title={selected ? questName(selected) : t('quest_generic')} onClose={() => setSelectedId(null)}>
        {selected && <>
          <Text style={styles.detailEmoji}>{selected.icon || '⭐'}</Text>
          <Text style={styles.detailText}>{selected.done ? t('quest_done_detail') : selected.pendingApproval ? t('quest_parent_detail') : selected.focusDurationMinutes ? t('quest_focus_detail', { minutes: selected.focusDurationMinutes }) : t('quest_ready_detail')}</Text>
          {!selected.done && !selected.pendingApproval && <Pressable style={styles.primaryButton} accessibilityRole="button" onPress={() => selected.focusDurationMinutes ? start(selected) : finish(selected)}><Text style={styles.primaryText}>{selected.focusDurationMinutes ? selected.activeFocusStartedAt ? t('timer_resume') : t('timer_start') : t('action_done')}</Text></Pressable>}
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => openEditor(selected.id)}><Pencil size={20} color={Colors.primary} /><Text style={styles.linkText}>{t('quest_edit')}</Text></Pressable>
        </>}
      </ActionSheet>
      <ActionSheet visible={Boolean(menuTask)} title={menuTask ? questName(menuTask) : t('quest_options')} onClose={() => setMenuId(null)}>
        {menuTask && <>
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => openEditor(menuTask.id)}><Pencil size={20} color={Colors.primary} /><Text style={styles.linkText}>{t('quest_edit')}</Text></Pressable>
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => remove(menuTask)}><Trash2 size={20} color="#AF332A" /><Text style={[styles.linkText, { color: '#AF332A' }]}>{t('quest_delete')}</Text></Pressable>
        </>}
      </ActionSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  wordmark: { fontFamily: 'Nunito_800ExtraBold', color: Colors.primary, fontSize: 21 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wallet: { flexDirection: 'row', gap: 6, minHeight: 48, paddingHorizontal: 8, alignItems: 'center' },
  walletText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 16 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 30, marginBottom: 14 },
  familyInvite: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 18, marginBottom: 20 },
  inviteHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  inviteTitle: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 18 },
  inviteSender: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 10, marginTop: 13 },
  inviteAccept: { minHeight: 48, flex: 1, borderRadius: 15, backgroundColor: Colors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  inviteAcceptText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 },
  inviteDecline: { minHeight: 48, flex: 1, borderRadius: 15, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  inviteDeclineText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 15 },
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, backgroundColor: '#EDF3FF', padding: 16, marginBottom: 24, gap: 8 },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 23, lineHeight: 27, color: Colors.text },
  bannerText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  originalHero: { width: 98, height: 98, borderRadius: 49 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  progressTrack: { height: 8, backgroundColor: '#E1E8EF', borderRadius: 8, marginTop: 10, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#83AE2D', borderRadius: 8 },
  groupTitle: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 15, marginTop: 16 },
  taskRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#DFE5ED', paddingVertical: 10 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 10 },
  taskCopy: { flex: 1 },
  taskIcon: { width: 44, height: 48, borderRadius: 14, backgroundColor: '#EDF3FF', justifyContent: 'center', alignItems: 'center' },
  taskIconDone: { backgroundColor: '#EDF6DB' },
  emoji: { fontSize: 25, color: '#316327' },
  taskName: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 17 },
  taskMeta: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  taskAction: { minWidth: 56, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2, marginLeft: 4 },
  actionText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: Colors.primary },
  doneToggle: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 52, marginTop: 10 },
  doneText: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#316327' },
  footerActions: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 18 },
  addButton: { width: 58, height: 58, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  manageLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: Colors.primary },
  empty: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 42 },
  goalLink: { borderTopWidth: 1, borderColor: '#DFE5ED', marginTop: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIcon: { fontSize: 28 },
  wheelButton: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.border },
  wheelIcon: { fontSize: 34 },
  detailEmoji: { fontSize: 52, textAlign: 'center' },
  detailText: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'Nunito_600SemiBold' },
  primaryButton: { minHeight: 56, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
  sheetRow: { flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 52 },
});
