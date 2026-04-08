'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';

const NAV_ITEMS = [
  { href: '/', label: 'ホーム' },
  { href: '/diary', label: '日記' },
  { href: '/profile', label: 'AI情報' },
  { href: '/settings', label: '設定' },
] as const;

export function Header() {
  const pathname = usePathname();
  const aiName = useSettingsStore((s) => s.aiName);
  const totalInteractions = useAIProfileStore((s) => s.totalInteractions);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="text-xl">🌱</span>
          <span className="hidden sm:inline">TA.isamu</span>
          <span className="text-xs text-muted font-normal ml-1">
            with {aiName}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-white'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {totalInteractions > 0 && (
            <span className="ml-2 rounded-full bg-primary-light/20 px-2 py-0.5 text-xs text-primary">
              {totalInteractions}回
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
