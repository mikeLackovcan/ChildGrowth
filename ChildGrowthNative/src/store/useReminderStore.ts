import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
export interface ReminderPreferences { enabled: boolean; time: string; sound: boolean; familyAlerts?: boolean }
// Quest reminders are a core child feature. The OS permission still controls
// delivery, while an explicit in-app opt-out remains persisted per account.
export const defaultReminders: ReminderPreferences = { enabled: true, time: '18:00', sound: true, familyAlerts: false };
export const useReminderStore = create<{
  accounts: Record<string, ReminderPreferences>;
  hydrated: boolean;
  status: string;
  pushStatus: string;
  update: (account: string, changes: Partial<ReminderPreferences>) => void;
}>()(persist((set) => ({
  accounts: {}, hydrated: false, status: '', pushStatus: '',
  update: (account, changes) => set(state => ({ accounts: { ...state.accounts, [account]: { ...defaultReminders, ...state.accounts[account], ...changes } } })),
}), {
  name: 'questblox-reminder-preferences',
  skipHydration: Platform.OS === 'web' && typeof window === 'undefined',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: state => ({ accounts: state.accounts }),
  onRehydrateStorage: () => (_state, error) => {
    useReminderStore.setState({ hydrated: true, status: error ? i18n.t('notification_retry') : '' });
  },
}));
