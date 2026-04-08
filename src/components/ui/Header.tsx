'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useHydration } from '@/stores/use-hydration';

const NAV_ITEMS = [
  { href: '/', label: 'ホーム' },
  { href: '/diary', label: '日記' },
  { href: '/profile', label: 'AI情報' },
  { href: '/settings', label: '設定' },
] as const;

export function Header() {
  const pathname = usePathname();
  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const totalInteractions = useAIProfileStore((s) => s.totalInteractions);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="text-xl">🌱</span>
          <span className="hidden sm:inline text-base tracking-tight">TA.isamu</span>
          {hydrated && (
            <span className="text-[11px] text-muted font-normal ml-0.5 hidden sm:inline">
              with {aiName}
            </span>
          )}
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {hydrated && totalInteractions > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {totalInteractions}回
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
