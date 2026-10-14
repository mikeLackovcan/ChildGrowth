import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Check, ChevronRight, Coins, Plus, Settings } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Colors } from '../../constants/theme';
import SettingsModal from '../../components/SettingsModal';
import DancingBananaModal from '../../components/DancingBananaModal';
import { playSuccessChime } from '../../utils/audio';
import { configureNotifications, requestNotificationPermissions, scheduleTaskReminders } from '../../lib/notifications';

export default function TrackerScreen() {
  const userEmail = useAppStore((state) => state.userEmail);
  const role = useAppStore((state) => state.role);
  const fullName = useAppStore((state) => state.fullName);
  const nickname = useAppStore((state) => state.nickname);
  const tasks = useAppStore((state) => state.tasks);
  const coins = useAppStore((state) => state.coins);
  const prizes = useAppStore((state) => state.prizes);
  const linkedParents = useAppStore((state) => state.linkedParents);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const addWonPrize = useAppStore((state) => state.addWonPrize);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!userEmail) router.replace('/');
    else if (role === 'parent') router.replace('/parent-dashboard');
  }, [userEmail, role]);

  useEffect(() => {
    if (!userEmail || role === 'parent') return;
    let cancelled = false;
    (async () => {
      await configureNotifications();
      const granted = await requestNotificationPermissions();
      if (granted && !cancelled) await scheduleTaskReminders(tasks);
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
    const becomingDone = !task.done;
    toggleTaskDone(taskId);
    if (!becomingDone) return;
    playSuccessChime();
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
          <Text style={styles.wordmark}>QuestBlox</Text>
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

        <Text style={styles.greeting}>Hi, {firstName}!</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Small steps.{"\n"}Big wins.</Text>
            <Text style={styles.heroSubtitle}>You’ve got this!</Text>
          </View>
          <Image source={require('../../../assets/images/quest-hero-v2.png')} style={styles.heroImage} resizeMode="cover" />
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
                <Text style={styles.taskMeta}>{task.freq === 'daily' ? 'Every day' : task.freq.replace('_', ' ')}</Text>
              </View>
              <View style={[styles.checkCircle, task.done && styles.checkCircleDone]}>
                {task.done && <Check size={20} strokeWidth={3} color={Colors.text} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/manage-tasks')}>
          <Plus size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>{tasks.length ? 'Add a quest' : 'Create my first quest'}</Text>
        </TouchableOpacity>
        <Text style={styles.encouragement}>One quest at a time.</Text>

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
      <DancingBananaModal visible={showCelebration} onClose={() => setShowCelebration(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  wordmark: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.primary, letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 12, height: 40 },
  coinText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  greeting: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: Colors.text, marginBottom: 12 },
  heroCard: { height: 146, backgroundColor: Colors.primary, borderRadius: 24, overflow: 'hidden', marginBottom: 26, position: 'relative' },
  heroCopy: { paddingHorizontal: 22, paddingVertical: 19, width: '62%', zIndex: 2 },
  heroTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, lineHeight: 27, color: '#FFFFFF' },
  heroSubtitle: { marginTop: 8, fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#DDE9FF' },
  heroImage: { position: 'absolute', right: -10, bottom: -58, width: 184, height: 184, borderRadius: 90 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  progressText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textSecondary },
  progressTrack: { height: 10, borderRadius: 10, backgroundColor: '#DFE4E8', overflow: 'hidden', marginTop: 10, marginBottom: 17 },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#CBF250' },
  taskList: { gap: 11 },
  taskCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  taskCardDone: { borderColor: '#BEDF79', backgroundColor: '#FCFFF5' },
  taskIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  taskIconDone: { backgroundColor: Colors.greenDim },
  taskEmoji: { fontSize: 24 },
  taskCopy: { flex: 1, marginHorizontal: 13 },
  taskTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: Colors.text },
  taskTitleDone: { color: Colors.textSecondary },
  taskMeta: { fontFamily: 'Nunito_600SemiBold', marginTop: 2, fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border2, alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#CBF250', borderColor: '#CBF250' },
  emptyCard: { alignItems: 'center', padding: 26, backgroundColor: Colors.surface, borderRadius: 22, borderWidth: 1, borderColor: Colors.border },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  emptyText: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, textAlign: 'center', marginTop: 5 },
  addButton: { marginTop: 14, minHeight: 52, borderWidth: 2, borderColor: Colors.primary, borderRadius: 17, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  addButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary },
  encouragement: { textAlign: 'center', color: Colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 13, marginTop: 10 },
  familyCard: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 18, backgroundColor: Colors.blueDim, borderWidth: 1, borderColor: '#C9D9FA' },
  familyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  familyText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 3, paddingRight: 12 },
});
