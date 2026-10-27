import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';
import i18n from '../i18n';

const bindingKey = 'questblox-push-device';
type Binding = { uid: string; id: string; signature: string; updatedAt: number };
let queue: Promise<unknown> = Promise.resolve();
let retiringUid: string | null = null;
const call = (name: string, data: object) => httpsCallable(getFunctions(app, 'europe-west1'), name, { timeout: 10000 })(data);
async function bounded<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('PUSH_TIMEOUT')), milliseconds); })]); }
  finally { if (timer) clearTimeout(timer); }
}
export function syncFamilyPushDevice(uid: string | null, language: string, enabled: boolean, sound: boolean, force = false): Promise<string> {
  if (!uid || uid !== retiringUid) retiringUid = null;
  const operation = queue.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return 'notification_native';
    if (!uid || uid !== auth.currentUser?.uid || uid === retiringUid) return '';
    const n = await import('expo-notifications');
    const permission = await n.getPermissionsAsync();
    const allowed = permission.granted || permission.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
    const raw = await AsyncStorage.getItem(bindingKey);
    const previous: Binding | null = raw ? JSON.parse(raw) : null;
    if (!allowed) {
      if (previous?.uid === uid) await call('unregisterPushDevice', { id: previous.id });
      await AsyncStorage.removeItem(bindingKey);
      return enabled ? 'notification_blocked' : 'push_off';
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const signature = JSON.stringify([uid, language, enabled, sound, timeZone]);
    if (!force && previous?.signature === signature && Date.now() - previous.updatedAt < 3600000) return enabled ? 'push_ready' : 'push_off';
    if (Platform.OS === 'android') for (const withSound of [true, false]) await n.setNotificationChannelAsync(withSound ? 'quest-family-sound-v1' : 'quest-family-quiet-v1', {
      name: i18n.t(withSound ? 'push_channel' : 'push_channel_quiet'),
      importance: n.AndroidImportance.DEFAULT, sound: withSound ? 'default' : null,
      enableVibrate: withSound, lockscreenVisibility: n.AndroidNotificationVisibility.PRIVATE,
    });
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) return 'push_retry';
    const token = (await bounded(n.getExpoPushTokenAsync({ projectId }), 8000)).data;
    if (auth.currentUser?.uid !== uid || retiringUid === uid) return '';
    const result = await call('registerPushDevice', { token, language, timeZone, sound, enabled });
    if (auth.currentUser?.uid !== uid || retiringUid === uid) return '';
    const id = (result.data as { id?: unknown })?.id;
    if (typeof id !== 'string') throw Error('INVALID_DEVICE_RESPONSE');
    if (previous?.uid === uid && previous.id !== id) await call('unregisterPushDevice', { id: previous.id });
    await AsyncStorage.setItem(bindingKey, JSON.stringify({ uid, id, signature, updatedAt: Date.now() }));
    return enabled ? 'push_ready' : 'push_off';
  }).catch(() => 'push_retry');
  queue = operation;
  return operation;
}
export async function retireFamilyPushDevice() {
  const uid = auth.currentUser?.uid;
  if (!uid || Platform.OS === 'web') return;
  retiringUid = uid;
  const retire = async () => {
    await queue.catch(() => {});
    const raw = await AsyncStorage.getItem(bindingKey);
    const binding: Binding | null = raw ? JSON.parse(raw) : null;
    if (binding?.uid === uid && auth.currentUser?.uid === uid) {
      await call('unregisterPushDevice', { id: binding.id });
      if (await AsyncStorage.getItem(bindingKey) === raw) await AsyncStorage.removeItem(bindingKey);
    }
  };
  const dismiss = async () => {
    const n = await import('expo-notifications');
    for (const item of await n.getPresentedNotificationsAsync()) {
      if (item.request.content.data?.questbloxPush === true) await n.dismissNotificationAsync(item.request.identifier);
    }
  };
  // Logging out must not wait indefinitely for a network request. Background
  // notices contain generic text only; taps still require the matching UID.
  await bounded(Promise.all([retire(), dismiss()]), 5000);
}
