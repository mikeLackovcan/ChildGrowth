import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '../lib/projectStorage';

export const useExperienceSettings = create(persist<{
  soundEnabled: boolean;
  reducedMotion: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}>((set) => ({
  soundEnabled: true,
  reducedMotion: false,
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}), {
  name: 'experience-settings',
  storage: createJSONStorage(() => AsyncStorage),
}));
