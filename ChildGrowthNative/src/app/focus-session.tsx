import { questName } from '../lib/questTemplates';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import AnimatedQuestHero from '../components/AnimatedQuestHero';
import { cancelQuestNotification, requestNotificationPermissions, scheduleFocusEndNotification } from '../lib/notifications';
import { playSound } from '../lib/sound';

const secondsLeft = (startedAt: string, durationMinutes: number) => {
  const finishAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
  return Math.max(0, Math.ceil((finishAt - Date.now()) / 1000));
};

export default function FocusSessionScreen() {
  const { t } = useTranslation();
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
  const [backgroundAlert, setBackgroundAlert] = useState<boolean | null>(task?.focusNotificationId ? true : null);
  const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };

  useEffect(() => {
    if (!task || task.done || task.pendingApproval || started.current) return;
    started.current = true;
    const sessionStart = task.activeFocusStartedAt || new Date().toISOString();
    const initialRemaining = secondsLeft(sessionStart, duration);
    if (!task.activeFocusStartedAt) updateTask(task.id, { activeFocusStartedAt: sessionStart });
    if (!task.focusNotificationId && initialRemaining > 0) {
      requestNotificationPermissions().then(granted => granted
        ? scheduleFocusEndNotification({ ...task, activeFocusStartedAt: sessionStart }, initialRemaining) : null).then((identifier) => {
        setBackgroundAlert(Boolean(identifier));
        const latest = useAppStore.getState().tasks.find(item => item.id === task.id);
        if (identifier && latest?.activeFocusStartedAt === sessionStart && !latest.done && !latest.pendingApproval) {
          updateTask(task.id, { focusNotificationId: identifier });
        } else if (identifier) void cancelQuestNotification(identifier);
      }).catch(error => { setBackgroundAlert(false); console.warn(error); });
    }
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
    // The native notification covers background/closed delivery. This audible,
    // repeating in-app fallback makes the finish unmistakable while this screen
    // remains open, even when an older Android channel was configured silently.
    playSound('alarm');
  }, [finished]);

  const timeText = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remaining]);

  if (!task || task.done || task.pendingApproval) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.title}>{task ? t('timer_all_set') : t('timer_not_found')}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.quietButton} onPress={leave}><Text style={styles.quietText}>{t('timer_back')}</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const finishQuest = async () => {
    await cancelQuestNotification(task.focusNotificationId);
    const result = completeTask(task.id);
    if (result.completed || result.pendingApproval) {
      router.replace({ pathname: '/(tabs)', params: { completedTaskId: task.id } } as never);
    } else leave();
  };

  const stopSession = async () => {
    await cancelQuestNotification(task.focusNotificationId);
    updateTask(task.id, { activeFocusStartedAt: undefined, focusNotificationId: undefined });
    leave();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity accessibilityRole="button" style={styles.close} onPress={leave} accessibilityLabel={t('timer_back_running')}>
          <X size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.eyebrow}>{finished ? t('timer_up') : t('timer_focus')}</Text>
        <Text style={styles.title}>{questName(task)}</Text>
        <AnimatedQuestHero id={currentAvatar} style={styles.hero} motion={finished ? 'celebrate' : 'focus'} />

        <View style={styles.timerRing} accessibilityLabel={t('timer_remaining', { minutes: Math.ceil(remaining / 60) })}>
          <Svg width={190} height={190} style={StyleSheet.absoluteFill} viewBox="0 0 190 190">
            <Circle cx={95} cy={95} r={83} fill="none" stroke="#E8EEF8" strokeWidth={12} />
            <Circle cx={95} cy={95} r={83} fill="none" stroke={finished ? '#548014' : Colors.primary}
              strokeWidth={12} strokeLinecap="round" strokeDasharray={2 * Math.PI * 83}
              strokeDashoffset={finished ? 0 : 2 * Math.PI * 83 * (1 - Math.min(1, remaining / (duration * 60)))}
              rotation={-90} origin="95, 95" />
          </Svg>
          <Text style={styles.timer}>{timeText}</Text>
        </View>
        <Text style={styles.message}>{finished ? t('timer_check') : t('timer_step')}</Text>
        {!finished && (Platform.OS === 'web' || backgroundAlert === false) && <Text style={styles.message}>{Platform.OS === 'web' ? t('timer_web') : t('timer_alerts_off')}</Text>}

        {finished ? (
          <TouchableOpacity accessibilityRole="button" style={styles.finishButton} onPress={finishQuest}>
            <Check size={22} color={Colors.text} strokeWidth={3} />
            <Text style={styles.finishText}>{task.requiresApproval && useAppStore.getState().linkedParents.length > 0 ? t('timer_send') : t('done')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity accessibilityRole="button" style={styles.finishButton} onPress={leave}>
              <Text style={styles.finishText}>{t('timer_keep')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.quietButton} onPress={stopSession}>
              <Text style={styles.quietText}>{t('timer_stop')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  close: { alignSelf: 'flex-end', width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { marginTop: 20, fontFamily: 'Nunito_800ExtraBold', fontSize: 12, letterSpacing: 1.4, color: Colors.primary },
  title: { marginTop: 7, fontFamily: 'Nunito_800ExtraBold', fontSize: 29, color: Colors.text, textAlign: 'center' },
  hero: { width: 150, height: 150, marginTop: 24 },
  timerRing: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  timer: { fontFamily: 'Nunito_800ExtraBold', fontSize: 48, letterSpacing: 1, color: Colors.text },
  message: { marginTop: 22, maxWidth: 330, fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 21, color: Colors.textSecondary, textAlign: 'center' },
  finishButton: { minWidth: 220, minHeight: 58, marginTop: 28, paddingHorizontal: 24, borderRadius: 19, backgroundColor: '#CBF250', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  finishText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  quietButton: { marginTop: 28, paddingHorizontal: 22, paddingVertical: 14 },
  quietText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textSecondary },
});
