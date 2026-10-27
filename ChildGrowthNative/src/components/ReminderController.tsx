import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { useReminderStore, defaultReminders } from '../store/useReminderStore';
import { observeQuestNotifications, syncQuestReminders } from '../lib/notifications';
import { syncFamilyPushDevice } from '../lib/pushDevices';
async function syncPush(force = false) {
  const s = useAppStore.getState(), reminders = useReminderStore.getState();
  if (!reminders.hydrated || Platform.OS === 'web') return;
  const prefs = reminders.accounts[s.userEmail?.toLowerCase() || ''] || defaultReminders;
  const uid = s.userId;
  const pushStatus = await syncFamilyPushDevice(uid, s.language, !!prefs.familyAlerts, prefs.sound, force);
  if (useAppStore.getState().userId === uid) useReminderStore.setState({ pushStatus });
}
export default function ReminderController() {
  const s = useAppStore();
  const reminders = useReminderStore();
  const nav = useRootNavigationState();
  useEffect(() => {
    if (!s.userId || s.userId === 'guest-local') return;
    const uid = s.userId;
    let busy = false, disposed = false;
    const refresh = async () => {
      if (busy || disposed || useAppStore.getState().userId !== uid) return;
      busy = true;
      try {
        await useAppStore.getState().syncToServer();
        if (!disposed && useAppStore.getState().userId === uid) await useAppStore.getState().loadMockState();
      } finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { disposed = true; clearInterval(timer); listener.remove(); };
  }, [s.userId]);
  const signature = JSON.stringify([s.userEmail, s.role, s.tasks, s.isSick, s.lastActiveDate, s.language, reminders.accounts, reminders.hydrated]);
  useEffect(() => { void syncQuestReminders(); }, [signature]);
  useEffect(() => { void syncPush(); }, [s.userId, s.language, reminders.accounts, reminders.hydrated]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') { void syncQuestReminders(); void syncPush(); } });
    let tokenListener: { remove: () => void } | undefined, disposed = false;
    if (Platform.OS !== 'web') import('expo-notifications').then(n => { if (!disposed) tokenListener = n.addPushTokenListener(() => { void syncPush(true); }); }).catch(() => {});
    return () => { disposed = true; listener.remove(); tokenListener?.remove(); };
  }, []);
  useEffect(() => {
    if (!nav?.key || !s.userEmail || !reminders.hydrated) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    observeQuestNotifications(taskId => {
      if (!disposed) router.push({ pathname: '/(tabs)', params: taskId ? { quest: taskId } : {} });
    }, destination => {
      if (disposed) return;
      if (destination.screen === 'battle') router.push({ pathname: '/family-battle', params: { battleId: destination.id } });
      else if (destination.screen === 'parent') {
        if (destination.id) useAppStore.getState().selectChild(destination.id);
        router.push('/parent-dashboard');
      } else if (destination.screen === 'quests') router.push({ pathname: '/(tabs)', params: destination.id ? { quest: destination.id } : {} });
      else if (destination.screen === 'rewards') router.push('/(tabs)/milestones');
      else router.push('/link-account');
    }).then(stop => { if (disposed) stop(); else cleanup = stop; }).catch(() => {});
    return () => { disposed = true; cleanup?.(); };
  }, [nav?.key, s.userEmail, reminders.hydrated]);
  return null;
}
