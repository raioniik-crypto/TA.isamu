'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Header } from '@/components/ui/Header';

// Default-export import + ssr:false: the module is excluded from the server
// bundle entirely. The internal isClient guard in AICharacter is a second
// safety net that prevents any motion.div from rendering before mount.
const AICharacter = dynamic(
  () => import('@/components/ai-character/AICharacter'),
  { ssr: false },
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <AICharacter />
    </ThemeProvider>
  );
}
