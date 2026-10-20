import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import AnimatedQuestHero from '../components/AnimatedQuestHero';
import { cancelQuestNotification, scheduleFocusEndNotification } from '../lib/notifications';
import { playSound } from '../lib/sound';

const secondsLeft = (startedAt: string, durationMinutes: number) => {
  const finishAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
  return Math.max(0, Math.ceil((finishAt - Date.now()) / 1000));
};

export default function FocusSessionScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const tasks = useAppStore((state) => state.tasks);
  const currentAvatar = useAppStore((state) => state.currentAvatar);
  const updateTask = useAppStore((state) => state.updateTask);
  const completeTask = useAppStore((state) => state.completeTask);
  const task = tasks.find((item) => item.id === taskId);
  const duration = task?.focusDurationMinutes || 10;
  const startedAt = task?.activeFocusStartedAt || new Date().toISOString();
  const [remaining, setRemaining] = useState(() => secondsLeft(startedAt, duration));
  const [finished, setFinished] = useState(remaining === 0);
  const started = useRef(false);
  const celebrated = useRef(false);

  useEffect(() => {
    if (!task || started.current) return;
    started.current = true;
    const sessionStart = task.activeFocusStartedAt || new Date().toISOString();
    const initialRemaining = secondsLeft(sessionStart, duration);
    if (!task.activeFocusStartedAt) updateTask(task.id, { activeFocusStartedAt: sessionStart });
    scheduleFocusEndNotification({ ...task, activeFocusStartedAt: sessionStart }, initialRemaining).then((identifier) => {
      if (identifier) updateTask(task.id, { focusNotificationId: identifier });
    });
  }, [duration, task, updateTask]);

  useEffect(() => {
    if (!task) return;
    const tick = () => {
      const next = secondsLeft(task.activeFocusStartedAt || startedAt, duration);
      setRemaining(next);
      if (next === 0) setFinished(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', tick);
    return () => {
      clearInterval(interval);
      listener.remove();
    };
  }, [duration, startedAt, task]);

  useEffect(() => {
    if (!finished || celebrated.current) return;
    celebrated.current = true;
    playSound('complete');
  }, [finished]);

  const timeText = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remaining]);

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}><Text style={styles.title}>Quest not found</Text></View>
      </SafeAreaView>
    );
  }

  const finishQuest = async () => {
    await cancelQuestNotification(task.focusNotificationId);
    completeTask(task.id);
    router.back();
  };

  const stopSession = async () => {
    await cancelQuestNotification(task.focusNotificationId);
    updateTask(task.id, { activeFocusStartedAt: undefined, focusNotificationId: undefined });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.close} onPress={stopSession} accessibilityLabel="Stop focus session">
          <X size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.eyebrow}>{finished ? 'FOCUS COMPLETE' : 'FOCUS WITH HABI'}</Text>
        <Text style={styles.title}>{task.name}</Text>
        <AnimatedQuestHero id={currentAvatar} style={styles.hero} motion={finished ? 'celebrate' : 'focus'} />

        <View style={[styles.timerRing, finished && styles.timerRingFinished]}>
          <Text style={styles.timer}>{timeText}</Text>
        </View>
        <Text style={styles.message}>{finished ? 'You stayed with it. Great work!' : 'One thing at a time. Habi is staying with you.'}</Text>

        {finished ? (
          <TouchableOpacity style={styles.finishButton} onPress={finishQuest}>
            <Check size={22} color={Colors.text} strokeWidth={3} />
            <Text style={styles.finishText}>{task.requiresApproval ? 'Send to parent' : 'Finish quest'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.quietButton} onPress={stopSession}>
            <Text style={styles.quietText}>Stop for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  close: { alignSelf: 'flex-end', width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { marginTop: 20, fontFamily: 'Nunito_800ExtraBold', fontSize: 12, letterSpacing: 1.4, color: Colors.primary },
  title: { marginTop: 7, fontFamily: 'Nunito_800ExtraBold', fontSize: 29, color: Colors.text, textAlign: 'center' },
  hero: { width: 150, height: 150, marginTop: 24 },
  timerRing: { width: 190, height: 190, borderRadius: 95, borderWidth: 12, borderColor: Colors.primary, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  timerRingFinished: { borderColor: '#CBF250' },
  timer: { fontFamily: 'Nunito_800ExtraBold', fontSize: 48, letterSpacing: 1, color: Colors.text },
  message: { marginTop: 22, maxWidth: 330, fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 21, color: Colors.textSecondary, textAlign: 'center' },
  finishButton: { minWidth: 220, minHeight: 58, marginTop: 28, paddingHorizontal: 24, borderRadius: 19, backgroundColor: '#CBF250', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  finishText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  quietButton: { marginTop: 28, paddingHorizontal: 22, paddingVertical: 14 },
  quietText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textSecondary },
});
