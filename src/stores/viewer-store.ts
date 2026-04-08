'use client';

import { create } from 'zustand';
import type { ViewerContent } from '@/types';

interface ViewerState {
  content: ViewerContent | null;
  isLoading: boolean;
  error: string | null;
  setContent: (content: ViewerContent) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useViewerStore = create<ViewerState>()((set) => ({
  content: null,
  isLoading: false,
  error: null,
  setContent: (content) => set({ content, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clear: () => set({ content: null, error: null, isLoading: false }),
}));
