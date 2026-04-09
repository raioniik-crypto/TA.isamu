'use client';

import { create } from 'zustand';
import type { CharacterExpression } from '@/types';

interface Reaction {
  expression: CharacterExpression;
  message: string;
}

interface ReactionState {
  reaction: Reaction | null;
  triggerReaction: (expression: CharacterExpression, message: string) => void;
  clearReaction: () => void;
}

export const useReactionStore = create<ReactionState>((set) => ({
  reaction: null,
  triggerReaction: (expression, message) =>
    set({ reaction: { expression, message } }),
  clearReaction: () => set({ reaction: null }),
}));
