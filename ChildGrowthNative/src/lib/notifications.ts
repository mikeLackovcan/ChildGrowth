import { localDay, tasksForDay } from '../utils/questDay';
import { questDevice } from './questDevice';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useReminderStore, defaultReminders } from '../store/useReminderStore';
import { reminderPlan } from '../utils/reminderPlan';
import i18n from '../i18n';
import { auth } from './firebase';
import { pushDestination, PushDestination } from '../utils/pushNavigation';

const PREFIX = 'questblox-reminder:';
const channel = (sound: boolean) => sound ? 'quest-reminders-sound-v1' : 'quest-reminders-quiet-v1';
export const reminderAccount = () => useAppStore.getState().userEmail?.toLowerCase() || '';
async function notificationModule() {
  const n = await import('expo-notifications');
  if (Platform.OS === 'android') {
    for (const sound of [true, false]) await n.setNotificationChannelAsync(channel(sound), {
      name: sound ? i18n.t('notification_channel') : i18n.t('notification_quiet'),
      importance: n.AndroidImportance.HIGH,
      sound: sound ? 'default' : null, enableVibrate: sound,
      vibrationPattern: sound ? [0, 250, 120, 250] : undefined,
      lockscreenVisibility: n.AndroidNotificationVisibility.PRIVATE,
    });
  }
  return n;
}
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;
  const n = await notificationModule(); // Android channel must exist before permission prompt.
  const permission = await n.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
}
let queue: Promise<unknown> = Promise.resolve();
export function syncQuestReminders() {
  queue = queue.catch(() => {}).then(async () => {
    if (Platform.OS === 'web' || !useReminderStore.getState().hydrated) return;
    const n = await notificationModule();
    const s = useAppStore.getState();
    const account = reminderAccount();
    const prefs = useReminderStore.getState().accounts[account] || defaultReminders;
    let permissions = await n.getPermissionsAsync();
    let allowed = permissions.granted || permissions.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
    // A parent can add the first timed quest remotely. Ask on the child device
    // when that quest arrives instead of requiring the child to find Settings.
    if (!allowed && permissions.canAskAgain && account && s.role === 'child' && prefs.enabled && s.tasks.length > 0) {
      permissions = await n.requestPermissionsAsync();
      allowed = permissions.granted || permissions.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
    }
    const plan = account && s.role === 'child' && prefs.enabled && allowed
      ? reminderPlan(s.tasks, prefs.time, s.lastActiveDate, s.isSick) : [];
    const alarmMode = s.tasks.some(task => task.reminderMode === 'alarm') && !!questDevice;
    const alarmAllowed = alarmMode && await questDevice!.canAlarm();
    const alarmTaskIds = new Set(s.tasks.filter(task => task.reminderMode === 'alarm').map(task => task.id));
    const alarmPlan = plan.map(slot => ({ ...slot, taskIds: slot.taskIds.filter(id => alarmTaskIds.has(id)) })).filter(slot => slot.taskIds.length);
    const notificationPlan = plan.map(slot => ({ ...slot, taskIds: slot.taskIds.filter(id => !alarmAllowed || !alarmTaskIds.has(id)) })).filter(slot => slot.taskIds.length);
    if (questDevice) await questDevice.syncAlarms(JSON.stringify({
      account, enabled: !!account && alarmAllowed && prefs.enabled && allowed && !s.isSick && s.role === 'child',
      liveIds: tasksForDay(s.tasks, new Date()).filter(task => task.reminderMode === 'alarm' && !(task.done && s.lastActiveDate === localDay()) && !task.pendingApproval).map(task => task.id),
      slots: alarmAllowed ? alarmPlan.map(slot => ({
        id: `${account}:${slot.at}`, at: slot.at, account, taskIds: slot.taskIds,
        ...alarmLabels(slot.taskIds.map(id => { const task = s.tasks.find(t => t.id === id)!; return `${task.icon || '⭐'} ${i18n.t(task.name, task.name)}`; }).join(' · ')),
      })) : [],
    }));
    const desired = new Map(notificationPlan.map(slot => {
      const identifier = `${PREFIX}${encodeURIComponent(account)}:${slot.at}`;
      const names = slot.taskIds.map(id => { const task = s.tasks.find(t => t.id === id)!; return `${task.icon || '⭐'} ${i18n.t(task.name, task.name)}`; });
      const body = names.length === 1 ? names[0] : `${names.slice(0, 2).join(' · ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
      const signature = JSON.stringify([body, slot.taskIds, prefs.sound, s.language]);
      return [identifier, { slot, body, signature }];
    }));
    const existing = await n.getAllScheduledNotificationsAsync();
    for (const item of existing) {
      if (!item.identifier.startsWith(PREFIX)) continue;
      const match = desired.get(item.identifier);
      if (match && item.content.data?.signature === match.signature) desired.delete(item.identifier);
      else await n.cancelScheduledNotificationAsync(item.identifier);
    }
    for (const [identifier, { slot, body, signature }] of desired) {
      await n.scheduleNotificationAsync({ identifier, content: {
        title: i18n.t('notification_title'), body, sound: prefs.sound ? 'default' : false,
        data: { questReminder: true, account, taskIds: slot.taskIds, signature },
      }, trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(slot.at), channelId: channel(prefs.sound) } });
    }
    useReminderStore.setState({ status: prefs.enabled && alarmMode && !alarmAllowed ? i18n.t('alarm_permission') : prefs.enabled && !allowed ? i18n.t('notification_blocked') : s.isSick ? i18n.t('notification_rest') : prefs.enabled && s.role === 'child' ? i18n.t('notification_ready') : '' });
  }).catch(() => { useReminderStore.setState({ status: i18n.t('notification_retry') }); });
  return queue;
}
export async function testQuestReminder() {
  if (Platform.OS === 'web') throw new Error(i18n.t('notification_native'));
  if (!await requestNotificationPermissions()) throw new Error(i18n.t('notification_blocked'));
  const n = await notificationModule();
  await n.scheduleNotificationAsync({ identifier: `${PREFIX}test`, content: {
    title: i18n.t('notification_test_title'), body: i18n.t('notification_test_body'),
    sound: 'default', data: { questReminder: true, account: reminderAccount() },
  }, trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: channel(true) } });
}
export async function observeQuestNotifications(onOpen: (taskId?: string) => void, onFamilyOpen?: (destination: PushDestination) => void) {
  if (Platform.OS === 'web') return () => {};
  const n = await notificationModule();
  n.setNotificationHandler({ handleNotification: async notification => {
    const data = notification.request.content.data;
    const s = useAppStore.getState();
    const prefs = useReminderStore.getState().accounts[reminderAccount()] || defaultReminders;
    if (data?.questbloxPush === true) {
      const hour = new Date().getHours();
      const show = !!prefs.familyAlerts && auth.currentUser?.uid === s.userId && !!pushDestination(data, s.userId, s.role) &&
        (s.role === 'parent' || !s.isSick) && hour >= 7 && hour < 20;
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show && prefs.sound, shouldSetBadge: false };
    }
    const show = data?.questReminder === true && data.account === reminderAccount() && s.role === 'child' && !s.isSick &&
      (notification.request.identifier === `${PREFIX}test` || (prefs.enabled && (!Array.isArray(data.taskIds) || data.taskIds.some(id => s.tasks.some(t => t.id === id && !t.done && !t.pendingApproval)))));
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show && prefs.sound, shouldSetBadge: false };
  } });
  const open = (response: import('expo-notifications').NotificationResponse) => {
    const data = response.notification.request.content.data;
    if (data?.questbloxPush === true) {
      const state = useAppStore.getState();
      const destination = auth.currentUser?.uid === state.userId ? pushDestination(data, state.userId, state.role) : null;
      if (destination) { onFamilyOpen?.(destination); n.clearLastNotificationResponseAsync().catch(() => {}); }
      return;
    }
    if (data?.questReminder !== true || data.account !== reminderAccount() || useAppStore.getState().role !== 'child') return;
    onOpen(Array.isArray(data.taskIds) && typeof data.taskIds[0] === 'string' ? data.taskIds[0] : undefined);
    n.clearLastNotificationResponseAsync().catch(() => {});
  };
  const listener = n.addNotificationResponseReceivedListener(open);
  const last = await n.getLastNotificationResponseAsync();
  if (last) open(last);
  return () => listener.remove();
}

export function alarmLabels(body: string) {
  return { title: i18n.t('notification_title'), body, channel: i18n.t('alarm_mode'), stop: i18n.t('alarm_stop'), snooze: i18n.t('alarm_snooze') };
}
export async function testQuestAlarm() {
  if (!questDevice || !await questDevice.canAlarm()) throw new Error('alarm_permission');
  if (!await requestNotificationPermissions()) throw new Error('notification_blocked');
  await questDevice.testAlarm(JSON.stringify({ ...alarmLabels(i18n.t('notification_test_body')), account: reminderAccount(), taskIds: [] }));
}
