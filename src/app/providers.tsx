'use client';

import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Header } from '@/components/ui/Header';
import { AICharacter } from '@/components/ai-character/AICharacter';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <AICharacter />
    </ThemeProvider>
  );
}
