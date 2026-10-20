import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Check, ChevronRight, Clock3, Coins, Plus, Settings } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Colors, WORLD_THEMES } from '../../constants/theme';
import SettingsModal from '../../components/SettingsModal';
import { configureNotifications, scheduleTaskReminders } from '../../lib/notifications';
import QuestPipMark from '../../components/QuestPipMark';
import AnimatedQuestHero from '../../components/AnimatedQuestHero';
import { calculateQuestReward } from '../../lib/heroRewards';
import HeroCelebrationModal from '../../components/HeroCelebrationModal';

export default function TrackerScreen() {
  const userEmail = useAppStore((state) => state.userEmail);
  const role = useAppStore((state) => state.role);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
  const tasks = useAppStore((state) => state.tasks);
  const coins = useAppStore((state) => state.coins);
  const currentAvatar = useAppStore((state) => state.currentAvatar);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const theme = WORLD_THEMES[activeTheme];
  const prizes = useAppStore((state) => state.prizes);
  const linkedParents = useAppStore((state) => state.linkedParents);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const completeQuest = useAppStore((state) => state.completeTask);
  const addWonPrize = useAppStore((state) => state.addWonPrize);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationCoins, setCelebrationCoins] = useState(0);
  const [heroDancing, setHeroDancing] = useState(false);

  useEffect(() => {
    if (!userEmail) router.replace('/');
    else if (role === 'parent') router.replace('/parent-dashboard');
  }, [userEmail, role]);

  useEffect(() => {
    if (!userEmail || role === 'parent') return;
    let cancelled = false;
    (async () => {
      await configureNotifications();
      if (!cancelled) await scheduleTaskReminders(tasks);
    })();
    return () => { cancelled = true; };
  }, [userEmail, role, tasks]);

  const completed = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const firstName = (fullName || nickname || 'Hero').split(' ')[0];

  if (!userEmail) return null;

  const completeTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (task.done) {
      toggleTaskDone(taskId);
      return;
    }
    if (task.focusDurationMinutes) {
      router.push({ pathname: '/focus-session', params: { taskId } } as never);
      return;
    }
    const result = completeQuest(taskId);
    if (!result.completed) return;
    setCelebrationCoins(result.reward?.coins || 0);
    setShowCelebration(true);
    const remaining = tasks.filter((item) => item.id !== taskId && !item.done);
    if (remaining.length === 0 && prizes.length > 0) {
      const reward = prizes[Math.floor(Math.random() * prizes.length)];
      addWonPrize(reward);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <QuestPipMark size={36} />
            <Text style={styles.wordmark}>Quest <Text style={[styles.wordmarkPip, { color: theme.accent }]}>Champ</Text></Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.coinPill}>
              <Coins size={17} color={Colors.amber} />
              <Text style={styles.coinText}>{coins}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Settings" style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
              <Settings size={21} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greeting}>{firstName}’s quests</Text>

        <View style={[styles.heroCard, { backgroundColor: theme.accent }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Small steps.{"\n"}Big adventures.</Text>
            <Text style={styles.heroSubtitle}>Your champ is ready. Pick a quest!</Text>
          </View>
          <TouchableOpacity
            style={styles.heroTouch}
            activeOpacity={0.9}
            accessibilityLabel="Make your Quest Champ hero dance"
            onPress={() => {
              setHeroDancing(false);
              requestAnimationFrame(() => setHeroDancing(true));
              setTimeout(() => setHeroDancing(false), 1200);
            }}
          >
            <AnimatedQuestHero id={currentAvatar} style={styles.heroImage} motion={showCelebration ? 'celebrate' : heroDancing ? 'dance' : 'idle'} />
          </TouchableOpacity>
          <QuestPipMark size={48} style={styles.bannerPip} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s quests</Text>
          <Text style={styles.progressText}>{completed} of {tasks.length} done</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.taskList}>
          {tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><Check size={28} color={Colors.primary} /></View>
              <Text style={styles.emptyTitle}>Choose your first small win</Text>
              <Text style={styles.emptyText}>Create a habit or chore you can complete today.</Text>
            </View>
          ) : tasks.map((task) => (
            <TouchableOpacity key={task.id} activeOpacity={0.78} style={[styles.taskCard, task.done && styles.taskCardDone]} onPress={() => completeTask(task.id)} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}>
              <View style={[styles.taskIcon, task.done && styles.taskIconDone]}><Text style={styles.taskEmoji}>{task.icon || '✓'}</Text></View>
              <View style={styles.taskCopy}>
                <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.name}</Text>
                <View style={styles.taskMetaRow}>
                  <Text style={styles.taskMeta}>{task.freq === 'daily' ? 'Every day' : task.freq.replace('_', ' ')}</Text>
                  <Text style={styles.taskReward}>+{calculateQuestReward(task, tasks, currentAvatar).coins} coins</Text>
                  {task.focusDurationMinutes ? <Text style={styles.taskReward}>{task.focusDurationMinutes} min focus</Text> : null}
                  {task.reminderEnabled && task.reminderTime && (
                    <View style={styles.taskTime}>
                      <Clock3 size={12} color={Colors.primary} />
                      <Text style={styles.taskTimeText}>{task.reminderTime}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.checkCircle, task.done && styles.checkCircleDone, task.pendingApproval && styles.checkCirclePending]}>
                {task.done && <Check size={20} strokeWidth={3} color={Colors.text} />}
                {task.pendingApproval && !task.done && <Clock3 size={16} color={Colors.amber} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/manage-tasks')}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{tasks.length ? 'Add a quest' : 'Create my first quest'}</Text>
        </TouchableOpacity>
        <Text style={styles.encouragement}>Your hero celebrates every small win.</Text>

        {role !== 'parent' && linkedParents.length === 0 && (
          <TouchableOpacity style={styles.familyCard} onPress={() => router.push('/link-account')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.familyTitle}>Want help from a parent?</Text>
              <Text style={styles.familyText}>Link a family account for approvals and shared progress.</Text>
            </View>
            <ChevronRight size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <HeroCelebrationModal visible={showCelebration} onClose={() => setShowCelebration(false)} heroId={currentAvatar} coins={celebrationCoins} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.primary, letterSpacing: -0.8 },
  wordmarkPip: { color: Colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, height: 40 },
  coinText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: Colors.text, marginBottom: 12 },
  heroCard: { height: 142, backgroundColor: Colors.primary, borderRadius: 26, overflow: 'hidden', marginBottom: 28, position: 'relative' },
  heroCopy: { paddingHorizontal: 22, paddingVertical: 19, width: '62%', zIndex: 2 },
  heroTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, lineHeight: 27, color: '#FFFFFF' },
  heroSubtitle: { marginTop: 8, fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#DDE9FF' },
  heroTouch: { position: 'absolute', right: 10, bottom: -2, width: 148, height: 148, zIndex: 2 },
  heroImage: { width: '100%', height: '100%' },
  bannerPip: { position: 'absolute', right: 132, bottom: 10, zIndex: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  progressText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textSecondary },
  progressTrack: { height: 7, borderRadius: 7, backgroundColor: '#DFE4E8', overflow: 'hidden', marginTop: 10, marginBottom: 13 },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#CBF250' },
  taskList: { marginTop: 2 },
  taskCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 },
  taskCardDone: { opacity: 0.68 },
  taskIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  taskIconDone: { backgroundColor: Colors.greenDim },
  taskEmoji: { fontSize: 24 },
  taskCopy: { flex: 1, marginHorizontal: 13 },
  taskTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: Colors.text },
  taskTitleDone: { color: Colors.textSecondary },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  taskMeta: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  taskReward: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: Colors.amber },
  taskTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskTimeText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: Colors.primary },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border2, alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#CBF250', borderColor: '#CBF250' },
  checkCirclePending: { backgroundColor: Colors.amberDim, borderColor: Colors.amber },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  emptyText: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, textAlign: 'center', marginTop: 5 },
  addButton: { marginTop: 16, minHeight: 54, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  addButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#FFFFFF' },
  encouragement: { textAlign: 'center', color: Colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 13, marginTop: 10 },
  familyCard: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  familyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  familyText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 3, paddingRight: 12 },
});
