import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
  setupChecklistDismissed: boolean;
  setSetupChecklistDismissed: (value: boolean) => void;
  defaultChoreAmount: number;
  setDefaultChoreAmount: (amount: number) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
      setupChecklistDismissed: false,
      setSetupChecklistDismissed: (value) => set({ setupChecklistDismissed: value }),
      defaultChoreAmount: 5,
      setDefaultChoreAmount: (amount) => set({ defaultChoreAmount: amount }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
    }),
    {
      name: 'fam-fi-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
