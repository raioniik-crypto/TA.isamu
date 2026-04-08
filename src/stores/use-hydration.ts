'use client';

import { useState, useEffect } from 'react';

/**
 * Zustand persist ストアのハイドレーション完了を待つフック
 * SSRとクライアントで値が異なるhydration mismatchを防ぐ
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
