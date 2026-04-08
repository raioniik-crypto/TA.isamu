'use client';

import { create } from 'zustand';
import type { ViewerContent } from '@/types';

interface ViewerState {
  content: ViewerContent | null;
  isLoading: boolean;
  error: string | null;

  /** ナビゲーション履歴スタック */
  backStack: ViewerContent[];
  forwardStack: ViewerContent[];

  setContent: (content: ViewerContent) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;

  /** 戻る */
  goBack: () => void;
  /** 進む */
  goForward: () => void;
  /** 現在のURLを返す */
  currentUrl: () => string | null;
}

export const useViewerStore = create<ViewerState>()((set, get) => ({
  content: null,
  isLoading: false,
  error: null,
  backStack: [],
  forwardStack: [],

  setContent: (content) =>
    set((s) => {
      const backStack = s.content
        ? [...s.backStack, s.content]
        : s.backStack;
      return {
        content,
        error: null,
        backStack,
        forwardStack: [], // 新しいページに行ったら forward をクリア
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  clear: () =>
    set({
      content: null,
      error: null,
      isLoading: false,
      backStack: [],
      forwardStack: [],
    }),

  goBack: () =>
    set((s) => {
      if (s.backStack.length === 0) return s;
      const prev = s.backStack[s.backStack.length - 1];
      const forwardStack = s.content
        ? [...s.forwardStack, s.content]
        : s.forwardStack;
      return {
        content: prev,
        backStack: s.backStack.slice(0, -1),
        forwardStack,
        error: null,
      };
    }),

  goForward: () =>
    set((s) => {
      if (s.forwardStack.length === 0) return s;
      const next = s.forwardStack[s.forwardStack.length - 1];
      const backStack = s.content
        ? [...s.backStack, s.content]
        : s.backStack;
      return {
        content: next,
        forwardStack: s.forwardStack.slice(0, -1),
        backStack,
        error: null,
      };
    }),

  currentUrl: () => get().content?.url ?? null,
}));
