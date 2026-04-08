'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useViewerStore } from '@/stores/viewer-store';
import { useHistoryStore } from '@/stores/history-store';
import { useHydration } from '@/stores/use-hydration';
import type { ViewerContent } from '@/types';

/** サンプルURL */
const SAMPLE_URLS = [
  { label: 'NHK NEWS WEB', url: 'https://www3.nhk.or.jp/news/', icon: '📰' },
  { label: 'Wikipedia: AI', url: 'https://ja.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD', icon: '📚' },
  { label: 'YouTube: Lofi Girl', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', icon: '🎵' },
  { label: 'Zenn トレンド', url: 'https://zenn.dev/', icon: '💻' },
];

interface BrowserHomeProps {
  displayName: string;
  displayCount: number;
  personality: { trait: string; description: string };
}

export function BrowserHome({
  displayName,
  displayCount,
  personality,
}: BrowserHomeProps) {
  const hydrated = useHydration();
  const setContent = useViewerStore((s) => s.setContent);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setError = useViewerStore((s) => s.setError);
  const isLoading = useViewerStore((s) => s.isLoading);
  const entries = useHistoryStore((s) => s.entries);
  const addEntry = useHistoryStore((s) => s.addEntry);
  const removeEntry = useHistoryStore((s) => s.removeEntry);

  const handleOpen = async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ページを開けませんでした。');
      }
      const data: ViewerContent = await res.json();
      setContent(data);
      addEntry({ url: data.url, title: data.title, type: data.type });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'ページを開けませんでした。',
      );
    } finally {
      setLoading(false);
    }
  };

  const hasHistory = hydrated && entries.length > 0;

  return (
    <div className="py-10 sm:py-16">
      {/* ウェルカム */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-surface-hover overflow-hidden flex items-center justify-center border border-border">
          <Image
            src="/characters/phil-default.png"
            alt={displayName}
            width={56}
            height={56}
            className="object-contain"
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {displayName}と一緒にWebを探検しよう
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          上のURLバーにアドレスを入力するか、下のリンクをクリック
        </p>
      </motion.div>

      {/* お気に入り / クイックリンク */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {SAMPLE_URLS.map((s) => (
            <button
              key={s.url}
              onClick={() => handleOpen(s.url)}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97] disabled:opacity-40"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[12px] font-medium text-foreground text-center leading-tight">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 閲覧履歴 */}
      {hasHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="mb-3 text-[13px] font-semibold text-muted">最近開いたページ</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {entries.slice(0, 6).map((entry) => (
              <div
                key={entry.url}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover cursor-pointer"
                onClick={() => handleOpen(entry.url)}
              >
                <span className="text-sm shrink-0">
                  {entry.type === 'youtube' ? '🎬' : '📄'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {entry.title}
                  </p>
                  <p className="text-[11px] text-muted truncate">{entry.url}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEntry(entry.url);
                  }}
                  className="shrink-0 rounded-md p-1 text-muted opacity-0 transition-all hover:bg-background hover:text-foreground group-hover:opacity-100"
                  aria-label="削除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AIステータス */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="max-w-md mx-auto mt-10 rounded-2xl border border-border bg-surface p-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover overflow-hidden shrink-0">
            <Image
              src="/characters/phil-default.png"
              alt={displayName}
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
              <span className="text-[11px] text-primary font-medium">{personality.trait}</span>
            </div>
            <p className="text-[12px] text-muted truncate">{personality.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {displayCount}回
          </span>
        </div>
      </motion.div>
    </div>
  );
}
