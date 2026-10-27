import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface QuestDevice {
  canAlarm(): Promise<boolean>;
  alarmSettings(): Promise<void>;
  syncAlarms(json: string): Promise<void>;
  testAlarm(json: string): Promise<void>;
  speak(language: string, prompt: string): Promise<string>;
}
// Older Play builds and web previews must continue to open safely.
export const questDevice = Platform.OS === 'android' ? requireOptionalNativeModule<QuestDevice>('QuestDevice') : null;
