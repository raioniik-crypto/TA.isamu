'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningDiary } from '@/types';

interface DiaryState {
  diaries: LearningDiary[];
  addDiary: (diary: LearningDiary) => void;
  clearAll: () => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set) => ({
      diaries: [],
      addDiary: (diary) =>
        set((s) => ({ diaries: [diary, ...s.diaries] })),
      clearAll: () => set({ diaries: [] }),
    }),
    { name: 'ta-isamu:diaries' },
  ),
);
