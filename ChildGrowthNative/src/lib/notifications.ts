import { Platform } from 'react-native';
import type { Task } from '../store/useAppStore';
import { heroFor } from './heroCatalog';
import { reminderPlan } from './reminderPlan';
import { localDateKey } from './questSchedule';

const NOTIFICATION_CHANNEL_ID = 'quest-notifications';
const ALARM_CHANNEL_ID = 'quest-alarms';
export const QUEST_REMINDER_CATEGORY = 'quest-reminder-actions';
export const FOCUS_FINISHED_CATEGORY = 'focus-finished-actions';

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
      name: 'Quest notifications',
      description: 'Reminders for unfinished Quest Champ habits and tasks.',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      sound: 'habi_reminder.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Quest alarms',
      description: 'Louder alarms for quests and finished focus sessions.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 450, 180, 450, 180, 650],
      sound: 'habi_alarm.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(QUEST_REMINDER_CATEGORY, [
    { identifier: 'START', buttonTitle: 'Start', options: { opensAppToForeground: true } },
    { identifier: 'DONE', buttonTitle: 'Done ✓', options: { opensAppToForeground: true } },
    { identifier: 'LATER', buttonTitle: 'Later · 10 min', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(FOCUS_FINISHED_CATEGORY, [
    { identifier: 'FINISH', buttonTitle: 'Finish quest', options: { opensAppToForeground: true } },
    { identifier: 'LATER', buttonTitle: 'Later · 10 min', options: { opensAppToForeground: true } },
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
      title: `${task.icon || '⭐'} ${task.name}`,
      subtitle: `${heroFor(heroId).name} · Quest Champ`,
      body: task.focusDurationMinutes
        ? `Ready for a ${task.focusDurationMinutes}-minute focus session?`
        : 'Ready for a small win? Start, finish, or try a little later.',
      sound: task.reminderMode === 'alarm' ? 'habi_alarm.wav' : 'habi_reminder.wav',
      categoryIdentifier: QUEST_REMINDER_CATEGORY,
      data: { kind: 'quest-reminder', taskId: task.id, questDate: localDateKey(date), route: '/(tabs)', heroId, focusDurationMinutes: task.focusDurationMinutes || 0 },
    };
    const channelId = task.reminderMode === 'alarm' ? ALARM_CHANNEL_ID : NOTIFICATION_CHANNEL_ID;
    const androidChannel = Platform.OS === 'android' ? { channelId } : {};
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...androidChannel,
      },
    });
  }
}

export async function scheduleFocusEndNotification(task: Task, seconds: number): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications || seconds < 1) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Focus complete: ${task.name}`,
      body: 'Time is up! Ready to mark your quest done?',
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
  });
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

export async function snoozeQuestReminder(task: Task): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications || task.done || task.pendingApproval) return;
  await configureNotifications();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  await Notifications.cancelScheduledNotificationAsync(`later-${task.id}`).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: `later-${task.id}`,
    content: {
      title: `${task.icon || '⭐'} ${task.name}`,
      body: 'Ready now? Your quest is here when you are.',
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
}

export async function scheduleDailyQuestReminder(hour = 19, minute = 0): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Quest Champ daily quests',
      body: 'Your hero quests are waiting!',
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
