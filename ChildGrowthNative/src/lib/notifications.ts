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
      description: 'Reminders for unfinished QuestBlox habits and tasks.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function scheduleTaskReminders(tasks: Task[], hour = 19, minute = 0): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await configureNotifications();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const activeTasks = tasks.filter((task) => !task.done).slice(0, 12);
  for (const [index, task] of activeTasks.entries()) {
    const totalMinutes = hour * 60 + minute + index * 3;
    const reminderHour = Math.floor((totalMinutes % (24 * 60)) / 60);
    const reminderMinute = totalMinutes % 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚔️ Quest reminder: ${task.name}`,
        body: 'Your quest is waiting. Complete it to keep your streak alive!',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminderHour,
        minute: reminderMinute,
      },
    });
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
      title: '⚔️ QuestBlox daily quests',
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
