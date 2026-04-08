'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Header } from '@/components/ui/Header';
import { AICharacter } from '@/components/ai-character/AICharacter';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // AICharacter uses window-dependent values during render (drag, motion values,
  // viewport sizing). Deferring to after mount avoids SSR/client hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ThemeProvider>
      <Header />
      <main className="flex-1">{children}</main>
      {mounted && <AICharacter />}
    </ThemeProvider>
  );
}
