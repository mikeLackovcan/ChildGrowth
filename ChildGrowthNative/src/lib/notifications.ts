import i18n from '../i18n';
import { questName } from './questTemplates';
import { Platform } from 'react-native';
import type { Task } from '../store/useAppStore';
import { heroFor } from './heroCatalog';
import { reminderPlan } from './reminderPlan';
import { localDateKey } from './questSchedule';

const NOTIFICATION_CHANNEL_ID = 'quest-notifications';
const ALARM_CHANNEL_ID = 'quest-alarms';
export const QUEST_REMINDER_CATEGORY = 'quest-reminder-actions';
export const FOCUS_FINISHED_CATEGORY = 'focus-finished-actions';

export async function scheduleAlarmWithNotificationFallback(
  schedule: (request: any) => Promise<string>,
  alarmRequest: any,
  notificationRequest: any,
): Promise<string> {
  try { return await schedule(alarmRequest); }
  catch { return schedule(notificationRequest); }
}

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch (error) {
    console.warn('Notifications module unavailable:', error);
    return null;
  }
}

export async function configureNotifications(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: i18n.t('notification_channel'),
      description: i18n.t('notification_channel_description'),
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      sound: 'habi_reminder.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: i18n.t('alarm_channel'),
      description: i18n.t('alarm_channel_description'),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 450, 180, 450, 180, 650],
      sound: 'habi_alarm.wav',
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(QUEST_REMINDER_CATEGORY, [
    { identifier: 'START', buttonTitle: i18n.t('action_start'), options: { opensAppToForeground: true } },
    { identifier: 'DONE', buttonTitle: i18n.t('action_done'), options: { opensAppToForeground: true } },
    { identifier: 'LATER', buttonTitle: i18n.t('action_later'), options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(FOCUS_FINISHED_CATEGORY, [
    { identifier: 'FINISH', buttonTitle: i18n.t('action_finish'), options: { opensAppToForeground: true } },
    { identifier: 'LATER', buttonTitle: i18n.t('action_later'), options: { opensAppToForeground: true } },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  await configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

let reminderQueue: Promise<void> = Promise.resolve();
export function scheduleTaskReminders(tasks: Task[], heroId = 'default'): Promise<void> {
  reminderQueue = reminderQueue.catch(() => undefined).then(() => replaceTaskReminders(tasks, heroId));
  return reminderQueue;
}

async function replaceTaskReminders(tasks: Task[], heroId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === 'quest-reminder')
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  for (const { task, date } of reminderPlan(tasks)) {
    const content = {
      title: `${task.icon || '⭐'} ${questName(task)}`,
      subtitle: `${heroFor(heroId).name} · Quest Champ`,
      body: task.focusDurationMinutes
        ? i18n.t('notification_focus_ready', { minutes: task.focusDurationMinutes })
        : i18n.t('notification_ready'),
      sound: task.reminderMode === 'alarm' ? 'habi_alarm.wav' : 'habi_reminder.wav',
      categoryIdentifier: QUEST_REMINDER_CATEGORY,
      data: { kind: 'quest-reminder', taskId: task.id, questDate: localDateKey(date), route: '/(tabs)', heroId, focusDurationMinutes: task.focusDurationMinutes || 0 },
    };
    const channelId = task.reminderMode === 'alarm' ? ALARM_CHANNEL_ID : NOTIFICATION_CHANNEL_ID;
    const androidChannel = Platform.OS === 'android' ? { channelId } : {};
    const request: any = {
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...androidChannel,
      },
    };
    if (task.reminderMode === 'alarm' && Platform.OS === 'android') {
      await scheduleAlarmWithNotificationFallback(
        Notifications.scheduleNotificationAsync,
        request,
        {
          ...request,
          content: { ...content, sound: 'habi_reminder.wav', data: { ...content.data, alarmFallback: true } },
          trigger: { ...request.trigger, channelId: NOTIFICATION_CHANNEL_ID },
        },
      );
    } else await Notifications.scheduleNotificationAsync(request);
  }
}

export async function scheduleFocusEndNotification(task: Task, seconds: number): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications || seconds < 1) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const request: any = {
    content: {
      title: i18n.t('notification_focus_title', { name: questName(task) }),
      body: i18n.t('notification_focus_done'),
      sound: 'habi_alarm.wav',
      categoryIdentifier: FOCUS_FINISHED_CATEGORY,
      data: { kind: 'focus-end', taskId: task.id, questDate: task.date, route: '/focus-session', focusFinished: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : {}),
    },
  };
  if (Platform.OS !== 'android') return Notifications.scheduleNotificationAsync(request);
  return scheduleAlarmWithNotificationFallback(
    Notifications.scheduleNotificationAsync,
    request,
    {
      ...request,
      content: { ...request.content, sound: 'habi_reminder.wav', data: { ...request.content.data, alarmFallback: true } },
      trigger: { ...request.trigger, channelId: NOTIFICATION_CHANNEL_ID },
    },
  );
}

export async function cancelQuestNotification(identifier?: string): Promise<void> {
  if (!identifier) return;
  const Notifications = await getNotifications();
  if (Notifications) await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

export async function registerQuestNotificationActions(
  onAction: (action: string, taskId: string, questDate?: string) => void | Promise<void>,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => undefined;
  await configureNotifications();
  const seen = new Set<string>();
  const handle = async (response: import('expo-notifications').NotificationResponse) => {
    const taskId = String(response.notification.request.content.data?.taskId || '');
    const key = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    if (!taskId || seen.has(key)) return;
    seen.add(key);
    const date = response.notification.request.content.data?.questDate;
    await onAction(response.actionIdentifier, taskId, typeof date === 'string' ? date : undefined);
    await Notifications.clearLastNotificationResponseAsync();
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(console.warn); });
  try {
    const previous = await Notifications.getLastNotificationResponseAsync();
    if (previous) await handle(previous);
  } catch (error) { console.warn('Could not restore notification action:', error); }
  return () => subscription.remove();
}

export async function snoozeQuestReminder(task: Task): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications || task.done || task.pendingApproval) return false;
  await configureNotifications();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return false;
  await Notifications.cancelScheduledNotificationAsync(`later-${task.id}`).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: `later-${task.id}`,
    content: {
      title: `${task.icon || '⭐'} ${questName(task)}`,
      body: i18n.t('notification_snooze'),
      subtitle: 'Quest Champ', sound: 'habi_reminder.wav',
      categoryIdentifier: QUEST_REMINDER_CATEGORY,
      data: { kind: 'quest-snooze', taskId: task.id, questDate: task.date },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 600, repeats: false,
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
  });
  return true;
}

export async function scheduleDailyQuestReminder(hour = 19, minute = 0): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notification_daily_title'),
      body: i18n.t('notification_daily_body'),
      sound: 'habi_reminder.wav',
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Schedules a real notification; success means scheduled, never verified delivery. */
export async function testQuestReminder(heroId = 'default'): Promise<'scheduled' | 'denied' | 'unavailable'> {
  const Notifications = await getNotifications();
  if (!Notifications) return 'unavailable';
  if (!await requestNotificationPermissions()) return 'denied';
  await Notifications.cancelScheduledNotificationAsync('quest-reminder-test').catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: 'quest-reminder-test',
    content: {
      title: i18n.t('notification_test_title'),
      body: i18n.t('notification_test_body'),
      sound: 'habi_reminder.wav',
      data: { kind: 'reminder-test', heroId, route: '/(tabs)' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
  });
  return 'scheduled';
}
