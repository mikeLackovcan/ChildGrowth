import { Platform } from 'react-native';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // @ts-ignore - optional native module
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    return false;
  }
}

export async function scheduleDailyQuestReminder(hour = 19, minute = 0): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    // @ts-ignore - optional native module
    const Notifications = await import('expo-notifications');
    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    await Notifications.cancelAllScheduledNotificationsAsync();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚔️ QuestBlox Daily Quests Reminder!',
        body: 'Your daily hero quests are waiting! Complete them before bedtime to maintain your streak 🚀',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return id;
  } catch (err) {
    console.warn('Notifications note:', err);
    return null;
  }
}
