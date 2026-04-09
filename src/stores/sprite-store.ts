'use client';

import { create } from 'zustand';
import type { SpriteState } from '@/types/sprite';
import { SPRITE_PRIORITY } from '@/types/sprite';

interface SpriteStoreState {
  /** Set of currently active states (multiple can be active; highest priority wins). */
  activeStates: Set<SpriteState>;
  /** Resolved current state based on priority. */
  current: SpriteState;
  /** Current frame index within the active animation. */
  frame: number;
  /** Whether the animation loop is running. */
  playing: boolean;

  /** Activate a sprite state (e.g. 'walk' when character starts moving). */
  activate: (state: SpriteState) => void;
  /** Deactivate a sprite state (e.g. 'walk' when character stops). */
  deactivate: (state: SpriteState) => void;
  /** Set the current frame index (driven by the animation hook). */
  setFrame: (frame: number) => void;
  /** Start/stop the animation loop. */
  setPlaying: (playing: boolean) => void;
}

function resolveState(states: Set<SpriteState>): SpriteState {
  let best: SpriteState = 'idle';
  let bestPriority = -1;
  for (const s of states) {
    const p = SPRITE_PRIORITY[s];
    if (p > bestPriority) {
      best = s;
      bestPriority = p;
    }
  }
  return best;
}

export const useSpriteStore = create<SpriteStoreState>((set) => ({
  activeStates: new Set<SpriteState>(['idle']),
  current: 'idle',
  frame: 0,
  playing: true,

  activate: (state) =>
    set((s) => {
      const next = new Set(s.activeStates);
      next.add(state);
      const resolved = resolveState(next);
      return {
        activeStates: next,
        current: resolved,
        // Reset frame when the top-priority state changes
        frame: resolved !== s.current ? 0 : s.frame,
      };
    }),

  deactivate: (state) =>
    set((s) => {
      const next = new Set(s.activeStates);
      next.delete(state);
      // Idle is always present as a fallback
      if (next.size === 0) next.add('idle');
      const resolved = resolveState(next);
      return {
        activeStates: next,
        current: resolved,
        frame: resolved !== s.current ? 0 : s.frame,
      };
    }),

  setFrame: (frame) => set({ frame }),
  setPlaying: (playing) => set({ playing }),
}));
