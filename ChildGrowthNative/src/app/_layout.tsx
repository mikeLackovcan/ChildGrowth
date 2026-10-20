import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
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
import { registerQuestNotificationActions } from '../lib/notifications';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    useAppStore.getState().loadMockState();
    SystemUI.setBackgroundColorAsync(Colors.background).catch(() => undefined);
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, error]);

  useEffect(() => {
    let dispose: () => void = () => {};
    registerQuestNotificationActions((action, taskId) => {
      const store = useAppStore.getState();
      if (action === 'DONE' || action === 'FINISH') store.completeTask(taskId);
      if (action === 'NOT_DONE') store.updateTask(taskId, { done: false, pendingApproval: false });
      if (action === 'START') {
        const task = store.tasks.find((item) => item.id === taskId);
        if (task?.focusDurationMinutes) router.push({ pathname: '/focus-session', params: { taskId } } as never);
        else router.push('/(tabs)');
      }
    }).then((cleanup) => { dispose = cleanup; });
    return () => dispose();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NativeStatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="role-select" />
          <Stack.Screen name="link-account" />
          <Stack.Screen name="child-onboard" />
          <Stack.Screen name="waiting" />
          <Stack.Screen name="parent-dashboard" />
          <Stack.Screen name="manage-tasks" />
          <Stack.Screen name="focus-session" />
          <Stack.Screen name="tracker" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
