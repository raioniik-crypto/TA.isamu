'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryEntry {
  url: string;
  title: string;
  type: 'article' | 'youtube';
  openedAt: string;
}

const MAX_ENTRIES = 20;

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'openedAt'>) => void;
  removeEntry: (url: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: ({ url, title, type }) =>
        set((s) => {
          // 既存を除外して先頭に追加
          const filtered = s.entries.filter((e) => e.url !== url);
          const newEntry: HistoryEntry = {
            url,
            title,
            type,
            openedAt: new Date().toISOString(),
          };
          return {
            entries: [newEntry, ...filtered].slice(0, MAX_ENTRIES),
          };
        }),

      removeEntry: (url) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.url !== url),
        })),

      clearAll: () => set({ entries: [] }),
    }),
    { name: 'ta-isamu:url-history' },
  ),
);
