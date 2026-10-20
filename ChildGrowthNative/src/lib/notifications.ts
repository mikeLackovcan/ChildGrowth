import { Platform } from 'react-native';
import type { Task } from '../store/useAppStore';

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
      description: 'Reminders for unfinished Quest Habi habits and tasks.',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      sound: 'habi-reminder.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Quest alarms',
      description: 'Louder alarms for quests and finished focus sessions.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 450, 180, 450, 180, 650],
      sound: 'habi-alarm.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(QUEST_REMINDER_CATEGORY, [
    { identifier: 'START', buttonTitle: 'Start', options: { opensAppToForeground: true } },
    { identifier: 'DONE', buttonTitle: 'Done', options: { opensAppToForeground: false } },
    { identifier: 'NOT_DONE', buttonTitle: 'Not done', options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync(FOCUS_FINISHED_CATEGORY, [
    { identifier: 'FINISH', buttonTitle: 'Finish quest', options: { opensAppToForeground: true } },
    { identifier: 'NOT_DONE', buttonTitle: 'Not done', options: { opensAppToForeground: false } },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

const WEEKDAYS: Record<Task['freq'], number[]> = {
  daily: [],
  sunday: [1],
  monday: [2],
  tuesday: [3],
  wednesday: [4],
  thursday: [5],
  friday: [6],
  saturday: [7],
  weekdays: [2, 3, 4, 5, 6],
  weekends: [1, 7],
};

function parseReminderTime(value?: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const [hourValue, minuteValue] = value.split(':').map(Number);
  if (!Number.isInteger(hourValue) || !Number.isInteger(minuteValue)) return null;
  if (hourValue < 0 || hourValue > 23 || minuteValue < 0 || minuteValue > 59) return null;
  return { hour: hourValue, minute: minuteValue };
}

export async function scheduleTaskReminders(tasks: Task[]): Promise<void> {
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

  const activeTasks = tasks
    .filter((task) => !task.done && task.reminderEnabled && parseReminderTime(task.reminderTime))
    .slice(0, 12);

  for (const task of activeTasks) {
    const reminder = parseReminderTime(task.reminderTime);
    if (!reminder) continue;
    const content = {
      title: `⏰ ${task.name}`,
      body: task.focusDurationMinutes
        ? `Ready for a ${task.focusDurationMinutes}-minute focus session?`
        : `Your quest is due at ${task.reminderTime}. You’ve got this!`,
      sound: task.reminderMode === 'alarm' ? 'habi-alarm.wav' : 'habi-reminder.wav',
      categoryIdentifier: QUEST_REMINDER_CATEGORY,
      data: { kind: 'quest-reminder', taskId: task.id, route: '/(tabs)', focusDurationMinutes: task.focusDurationMinutes || 0 },
    };
    const channelId = task.reminderMode === 'alarm' ? ALARM_CHANNEL_ID : NOTIFICATION_CHANNEL_ID;
    const androidChannel = Platform.OS === 'android' ? { channelId } : {};
    const weekdays = WEEKDAYS[task.freq];

    if (weekdays.length === 0) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          ...androidChannel,
        },
      });
      continue;
    }

    for (const weekday of weekdays) {
      await Notifications.scheduleNotificationAsync({
      content: {
          ...content,
      },
      trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: reminder.hour,
          minute: reminder.minute,
          ...androidChannel,
      },
      });
    }
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
      body: 'Your hero stayed with you. Finish your quest when you are ready!',
      sound: 'habi-alarm.wav',
      categoryIdentifier: FOCUS_FINISHED_CATEGORY,
      data: { kind: 'focus-end', taskId: task.id, route: '/focus-session', focusFinished: true },
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
  onAction: (action: string, taskId: string) => void,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => undefined;
  await configureNotifications();
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const taskId = String(response.notification.request.content.data?.taskId || '');
    if (taskId) onAction(response.actionIdentifier, taskId);
  });
  return () => subscription.remove();
}

export async function scheduleDailyQuestReminder(hour = 19, minute = 0): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Quest Habi daily quests',
      body: 'Your hero quests are waiting!',
      sound: 'habi-reminder.wav',
      ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
