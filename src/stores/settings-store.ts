'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

interface SettingsState extends AppSettings {
  update: (partial: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (partial) => set((s) => ({ ...s, ...partial })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'ta-isamu:settings' },
  ),
);
