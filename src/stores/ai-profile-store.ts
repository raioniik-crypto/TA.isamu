'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AIProfile, GrowthDelta, GrowthParams } from '@/types';
import { DEFAULT_GROWTH_PARAMS } from '@/types';

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

function applyDelta(params: GrowthParams, delta: GrowthDelta): GrowthParams {
  return {
    curiosity: clamp(params.curiosity + (delta.curiosity ?? 0)),
    empathy: clamp(params.empathy + (delta.empathy ?? 0)),
    logic: clamp(params.logic + (delta.logic ?? 0)),
    caution: clamp(params.caution + (delta.caution ?? 0)),
    attachment: clamp(params.attachment + (delta.attachment ?? 0)),
  };
}

interface AIProfileState extends AIProfile {
  applyGrowth: (delta: GrowthDelta) => void;
  setName: (name: string) => void;
  incrementInteractions: () => void;
  reset: () => void;
}

const initialProfile: AIProfile = {
  id: uuidv4(),
  name: 'アイモ',
  params: { ...DEFAULT_GROWTH_PARAMS },
  totalInteractions: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useAIProfileStore = create<AIProfileState>()(
  persist(
    (set) => ({
      ...initialProfile,
      applyGrowth: (delta) =>
        set((s) => ({
          params: applyDelta(s.params, delta),
          updatedAt: new Date().toISOString(),
        })),
      setName: (name) =>
        set({ name, updatedAt: new Date().toISOString() }),
      incrementInteractions: () =>
        set((s) => ({
          totalInteractions: s.totalInteractions + 1,
          updatedAt: new Date().toISOString(),
        })),
      reset: () => set({ ...initialProfile, id: uuidv4() }),
    }),
    { name: 'ta-isamu:ai-profile' },
  ),
);
