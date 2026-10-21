import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar as NativeStatusBar } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts, 
  Nunito_500Medium, 
  Nunito_600SemiBold, 
  Nunito_700Bold, 
  Nunito_800ExtraBold 
} from '@expo-google-fonts/nunito';
import '../i18n';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';
import { registerQuestNotificationActions, snoozeQuestReminder } from '../lib/notifications';
import useReducedMotion from '../hooks/useReducedMotion';
import { localDateKey } from '../lib/questSchedule';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const [loaded, error] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    void useAppStore.getState().loadMockState().finally(() => setHydrated(true));
    SystemUI.setBackgroundColorAsync(Colors.background).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, error]);

  useEffect(() => {
    if (!hydrated || (!loaded && !error)) return;
    let disposed = false;
    let dispose: () => void = () => {};
    registerQuestNotificationActions(async (action, taskId, questDate) => {
      if (disposed) return;
      const store = useAppStore.getState();
      store.resetTasksForNewDay();
      const task = useAppStore.getState().tasks.find((item) => item.id === taskId);
      if (!task || task.done || task.pendingApproval) return;
      if (questDate && questDate !== localDateKey()) {
        router.push({ pathname: '/(tabs)', params: { taskId } } as never);
        return;
      }
      if (action === 'DONE' || action === 'FINISH') {
        const result = store.completeTask(taskId);
        if (result.completed || result.pendingApproval) router.push({ pathname: '/(tabs)', params: { completedTaskId: taskId } } as never);
      }
      else if (action === 'LATER' || action === 'NOT_DONE') await snoozeQuestReminder(task);
      else if (action === 'START' && task.focusDurationMinutes) {
        router.push({ pathname: '/focus-session', params: { taskId } } as never);
      } else router.push({ pathname: '/(tabs)', params: { taskId } } as never);
    }).then((cleanup) => { if (disposed) cleanup(); else dispose = cleanup; }).catch(console.warn);
    return () => { disposed = true; dispose(); };
  }, [hydrated, loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NativeStatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
        <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="role-select" />
          <Stack.Screen name="link-account" />
          <Stack.Screen name="child-onboard" />
          <Stack.Screen name="waiting" />
          <Stack.Screen name="parent-dashboard" />
          <Stack.Screen name="manage-tasks" />
          <Stack.Screen name="quest-list" />
          <Stack.Screen name="focus-session" />
          <Stack.Screen name="tracker" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
