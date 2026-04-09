'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Zustand persist ストアのハイドレーション完了を待つフック
 * SSRとクライアントで値が異なるhydration mismatchを防ぐ
 */
export function useHydration(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
