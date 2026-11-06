import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// A device preference, scoped to the signed-in child. Never grants ownership.
export const useFighterGoal = create<{
  goals: Record<string, string>;
  choose: (uid: string, fighter: string) => void;
}>()(persist(set => ({ goals: {}, choose: (uid, fighter) => set(state => ({ goals: { ...state.goals, [uid]: fighter } })) }), {
  name: 'questblox-fighter-goals',
  storage: createJSONStorage(() => AsyncStorage),
  skipHydration: Platform.OS === 'web' && typeof window === 'undefined',
}));
