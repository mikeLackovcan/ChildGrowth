import { Platform } from 'react-native';
import type { Task } from '../store/useAppStore';

const CHANNEL_ID = 'quest-reminders';

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
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Quest reminders',
      description: 'Reminders for unfinished QuestPip habits and tasks.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
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
  await Notifications.cancelAllScheduledNotificationsAsync();

  const activeTasks = tasks
    .filter((task) => !task.done && task.reminderEnabled && parseReminderTime(task.reminderTime))
    .slice(0, 12);

  for (const task of activeTasks) {
    const reminder = parseReminderTime(task.reminderTime);
    if (!reminder) continue;
    const content = {
      title: `⏰ ${task.name}`,
      body: `Your quest is due at ${task.reminderTime}. You’ve got this!`,
      sound: 'default' as const,
      data: { taskId: task.id, route: '/(tabs)' },
    };
    const androidChannel = Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {};
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

export async function scheduleDailyQuestReminder(hour = 19, minute = 0): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'QuestPip daily quests',
      body: 'Your hero quests are waiting!',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
