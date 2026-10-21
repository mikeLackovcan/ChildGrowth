import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, Coins, MoreHorizontal, Pencil, Play, Plus, Settings, Trash2 } from 'lucide-react-native';
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

export default function TrackerScreen() {
  const state = useAppStore();
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
  }, [state.userEmail, state.role]);
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
  }, [state.tasks, state.currentAvatar, state.userEmail, state.role]);

  const tasks = state.tasks.filter(task => isQuestDue(task, now));
  const done = tasks.filter(task => task.done);
  const remaining = tasks.filter(task => !task.done);
  const later = remaining.filter(task => isQuestLater(task, now));
  const ready = remaining.filter(task => !isQuestLater(task, now));
  const allDone = tasks.length > 0 && remaining.length === 0;
  const wheelReady = allDone && state.lastSpinDate !== localDateKey();
  const earned = state.dailyEarnings.date === localDateKey() ? state.dailyEarnings.coins : 0;
  const selected = state.tasks.find(task => task.id === selectedId);
  const menuTask = state.tasks.find(task => task.id === menuId);
  const firstName = (state.fullName || state.nickname || 'Hero').split(' ')[0];
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
      setNotice({ key: Date.now(), text: 'Sent to your parent ✓' });
      return;
    }
    if (!task.done) return;
    const reward = task.rewardedCoins || 0;
    setCoinFeedback({ amount: reward, sequence: Date.now() });
    setNotice({
      key: Date.now(), text: `${task.name} ✓  +${reward} coins`,
      undo: () => {
        if (!useAppStore.getState().undoTaskCompletion(task.id)) {
          setNotice({ key: Date.now(), text: 'These coins already support a purchase or claimed reward.' });
        }
      },
    });
    const finishedDay = useAppStore.getState().tasks.filter(item => isQuestDue(item)).every(item => item.done);
    if (finishedDay) setCelebration(reward);
    else playSound('coin');
  }, []);
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
    setNotice({ key: Date.now(), text: 'Quest removed', undo: () => state.restoreTask({ ...task, activeFocusStartedAt: undefined, focusNotificationId: undefined }) });
  };

  const taskRow = (task: Task) => (
    <View key={task.id} style={styles.taskRow}>
      <Pressable style={styles.taskMain} accessibilityRole="button" accessibilityLabel={`Open ${task.name}`} onPress={() => setSelectedId(task.id)}>
        <View style={[styles.taskIcon, task.done && styles.taskIconDone]}><Text style={styles.emoji}>{task.done ? '✓' : task.icon || '⭐'}</Text></View>
        <View style={styles.taskCopy}>
          <Text style={styles.taskName}>{task.name}</Text>
          <Text style={styles.taskMeta}>
            {task.done ? 'Done today' : task.pendingApproval ? 'Waiting for your parent' :
              [task.reminderEnabled ? task.reminderTime : '', task.focusDurationMinutes ? `${task.focusDurationMinutes} min` : '', `+${calculateQuestReward(task, state.tasks, state.currentAvatar, earned).coins} coins`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      {!task.done && !task.pendingApproval && (
        <Pressable style={styles.taskAction} accessibilityRole="button"
          accessibilityLabel={`${task.focusDurationMinutes ? 'Start' : 'Complete'} ${task.name}`}
          onPress={() => task.focusDurationMinutes ? start(task) : finish(task)}>
          {task.focusDurationMinutes ? <Play size={18} color={Colors.primary} /> : <Check size={20} color={Colors.primary} />}
          <Text style={styles.actionText}>{task.activeFocusStartedAt ? 'Resume' : task.focusDurationMinutes ? 'Start' : 'Done'}</Text>
        </Pressable>
      )}
      <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Options for ${task.name}`} onPress={() => setMenuId(task.id)}>
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
            <Pressable style={styles.wallet} accessibilityRole="button" accessibilityLabel={`${state.coins} coins to spend`} onPress={() => router.push('/shop')}>
              <Coins size={20} color="#926500" /><Text style={styles.walletText}>{state.coins}</Text>
            </Pressable>
            <Pressable style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Settings" onPress={() => setSettingsVisible(true)}><Settings size={22} color={Colors.textSecondary} /></Pressable>
          </View>
        </View>
        <Text style={styles.greeting}>{firstName}’s day</Text>
        <View style={styles.banner}>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>{allDone ? 'You did it!' : 'Small steps.\nBig adventures.'}</Text>
            <Text style={styles.bannerText}>{allDone ? 'All done for today.' : 'One quest at a time.'}</Text>
          </View>
          <Image source={require('../../../assets/branding/quest-hero-source.png')} style={styles.originalHero} accessibilityLabel="Original Quest Champ hero" resizeMode="cover" />
        </View>
        <View style={styles.progressHeading}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.meta}>{done.length} of {tasks.length} done</Text>
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: tasks.length || 1, now: done.length }}>
          <View style={[styles.progressFill, { width: `${tasks.length ? done.length / tasks.length * 100 : 0}%` }]} />
        </View>
        {wheelReady && <Pressable style={styles.wheelButton} accessibilityRole="button" onPress={openDailyWheel}>
          <Text style={styles.wheelIcon}>🎡</Text><View style={{ flex: 1 }}><Text style={styles.taskName}>Spin today’s reward</Text><Text style={styles.meta}>One family reward is waiting.</Text></View><Text style={styles.linkText}>Spin</Text>
        </Pressable>}
        {tasks.length === 0 && <View style={styles.empty}><Text style={styles.emptyEmoji}>🌱</Text><Text style={styles.sectionTitle}>{state.tasks.length ? 'A quiet day' : 'Your first small win'}</Text><Text style={styles.meta}>{state.tasks.length ? 'No quests planned for today.' : 'Pick something you want to do.'}</Text></View>}
        {ready.length > 0 && <>{later.length > 0 && <Text style={styles.groupTitle}>Now</Text>}{ready.map(taskRow)}</>}
        {later.length > 0 && <><Text style={styles.groupTitle}>Later</Text>{later.map(taskRow)}</>}
        {done.length > 0 && <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDone }} style={styles.doneToggle} onPress={() => setShowDone(value => !value)}>
            <Check size={18} color="#316327" /><Text style={styles.doneText}>Done ({done.length})</Text><ChevronDown size={18} color={Colors.textSecondary} style={{ transform: [{ rotate: showDone ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showDone && done.map(taskRow)}
        </>}
        <View style={styles.footerActions}>
          <Pressable style={styles.addButton} accessibilityRole="button" accessibilityLabel="Add a quest" onPress={() => router.push('/manage-tasks')}>
            <Plus size={26} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.manageLink} accessibilityRole="button" onPress={() => router.push('/quest-list')}><Text style={styles.linkText}>All quests</Text></Pressable>
        </View>
        {state.rewardGoal && !state.rewardGoal.claimed && <Pressable style={styles.goalLink} onPress={() => router.push('/milestones')} accessibilityRole="button">
          <Text style={styles.goalIcon}>🎯</Text>
          <View style={{ flex: 1 }}><Text style={styles.taskName}>{state.rewardGoal.title}</Text><Text style={styles.meta}>{Math.min(state.rewardGoal.target, Math.max(0, state.totalEarned - state.rewardGoal.startCoins))} / {state.rewardGoal.target} earned</Text></View>
          <Text style={styles.linkText}>View</Text>
        </Pressable>}
      </ScrollView>
      <CoinFeedback amount={coinFeedback.amount} sequence={coinFeedback.sequence} />
      <UndoNotice notice={notice} onDismiss={dismissNotice} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <HeroCelebrationModal visible={celebration !== null} coins={celebration || 0} heroId={state.currentAvatar} onClose={finishCelebration} />
      <PrizeWheelModal visible={Boolean(wheelPrize)} prizeName={wheelPrize || ''} onClose={() => { setWheelPrize(null); router.push('/milestones'); }} />
      <ActionSheet visible={Boolean(selected)} title={selected?.name || 'Quest'} onClose={() => setSelectedId(null)}>
        {selected && <>
          <Text style={styles.detailEmoji}>{selected.icon || '⭐'}</Text>
          <Text style={styles.detailText}>{selected.done ? 'Done for today. Nice work!' : selected.pendingApproval ? 'Your parent will check this quest.' : selected.focusDurationMinutes ? `${selected.focusDurationMinutes} minutes, one step at a time.` : 'Ready when you are.'}</Text>
          {!selected.done && !selected.pendingApproval && <Pressable style={styles.primaryButton} accessibilityRole="button" onPress={() => selected.focusDurationMinutes ? start(selected) : finish(selected)}><Text style={styles.primaryText}>{selected.focusDurationMinutes ? selected.activeFocusStartedAt ? 'Resume timer' : 'Start timer' : '✓ Done'}</Text></Pressable>}
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => openEditor(selected.id)}><Pencil size={20} color={Colors.primary} /><Text style={styles.linkText}>Edit quest</Text></Pressable>
        </>}
      </ActionSheet>
      <ActionSheet visible={Boolean(menuTask)} title={menuTask?.name || 'Quest options'} onClose={() => setMenuId(null)}>
        {menuTask && <>
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => openEditor(menuTask.id)}><Pencil size={20} color={Colors.primary} /><Text style={styles.linkText}>Edit quest</Text></Pressable>
          <Pressable style={styles.sheetRow} accessibilityRole="button" onPress={() => remove(menuTask)}><Trash2 size={20} color="#AF332A" /><Text style={[styles.linkText, { color: '#AF332A' }]}>Delete quest</Text></Pressable>
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
