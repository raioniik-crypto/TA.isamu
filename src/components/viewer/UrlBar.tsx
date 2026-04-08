'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import type { ViewerContent } from '@/types';

export function UrlBar() {
  const [url, setUrl] = useState('');
  const isLoading = useViewerStore((s) => s.isLoading);
  const setContent = useViewerStore((s) => s.setContent);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setError = useViewerStore((s) => s.setError);
  const error = useViewerStore((s) => s.error);

  const handleOpen = async () => {
    const trimmed = url.trim();
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

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* URL icon */}
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
          onClick={handleOpen}
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
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-error/20 bg-error/5 px-4 py-3"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-sm shrink-0">😥</span>
            <p className="text-xs text-foreground leading-relaxed">{error}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
