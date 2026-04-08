'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { Header } from '@/components/ui/Header';

// AICharacter relies on browser APIs during render (window.innerWidth, drag,
// useMotionValue, viewport sizing). next/dynamic ssr:false ensures the module
// is never loaded or rendered on the server, eliminating hydration mismatches.
const AICharacter = dynamic(
  () =>
    import('@/components/ai-character/AICharacter').then(
      (mod) => mod.AICharacter,
    ),
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
