'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { useHydration } from '@/stores/use-hydration';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const hydrated = useHydration();

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, hydrated]);

  // 未ハイドレーション時はテーマ属性なし（CSSの:root既定値を使う）
  return <>{children}</>;
}
