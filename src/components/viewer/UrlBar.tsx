'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import { useHistoryStore } from '@/stores/history-store';
import { useHydration } from '@/stores/use-hydration';
import type { ViewerContent } from '@/types';

/** サンプルURL（記事＋YouTube混在） */
const SAMPLE_URLS = [
  { label: 'NHK NEWS WEB', url: 'https://www3.nhk.or.jp/news/' },
  { label: 'Wikipedia: AI', url: 'https://ja.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E7%9F%A5%E8%83%BD' },
  { label: 'YouTube: Lofi Girl', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { label: 'Zenn トレンド', url: 'https://zenn.dev/' },
];

export function UrlBar() {
  const [url, setUrl] = useState('');
  const hydrated = useHydration();
  const isLoading = useViewerStore((s) => s.isLoading);
  const content = useViewerStore((s) => s.content);
  const setContent = useViewerStore((s) => s.setContent);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setError = useViewerStore((s) => s.setError);
  const error = useViewerStore((s) => s.error);

  const entries = useHistoryStore((s) => s.entries);
  const addEntry = useHistoryStore((s) => s.addEntry);
  const removeEntry = useHistoryStore((s) => s.removeEntry);

  const handleOpen = async (targetUrl?: string) => {
    const trimmed = (targetUrl ?? url).trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ページを開けませんでした。');
      }

      const data: ViewerContent = await res.json();
      setContent(data);
      setUrl('');

      // 履歴に追加
      addEntry({
        url: data.url,
        title: data.title,
        type: data.type,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ページを開けませんでした。もう一度試してみてください。',
      );
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = !content && hydrated && entries.length === 0;
  const showHistory = !content && hydrated && entries.length > 0;

  return (
    <div className="space-y-3">
      {/* URL入力バー */}
      <div
        className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url.trim() && !isLoading) handleOpen();
          }}
          placeholder="URLを入力してページを開く"
          className="flex-1 bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />

        <button
          onClick={() => handleOpen()}
          disabled={!url.trim() || isLoading}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
              />
              読み込み中
            </span>
          ) : (
            '開く'
          )}
        </button>
      </div>

      {/* エラー表示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-error/20 bg-error/5 px-4 py-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-sm shrink-0">😥</span>
              <p className="text-xs text-foreground leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 候補URL（履歴がないとき） */}
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="mb-2 text-xs font-medium text-muted">試してみる</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_URLS.map((s) => (
              <button
                key={s.url}
                onClick={() => handleOpen(s.url)}
                disabled={isLoading}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary hover:text-primary active:scale-[0.97] disabled:opacity-40"
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 履歴 */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="mb-2 text-xs font-medium text-muted">最近開いたもの</p>
          <div className="space-y-1">
            {entries.slice(0, 5).map((entry) => (
              <div
                key={entry.url}
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-surface-hover cursor-pointer"
                onClick={() => handleOpen(entry.url)}
              >
                <span className="text-sm shrink-0">
                  {entry.type === 'youtube' ? '🎬' : '📄'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {entry.title}
                  </p>
                  <p className="text-[11px] text-muted truncate">
                    {entry.url}
                  </p>
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
    </div>
  );
}
