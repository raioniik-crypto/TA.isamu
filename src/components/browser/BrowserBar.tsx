'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import { useHistoryStore } from '@/stores/history-store';
import type { ViewerContent } from '@/types';

export function BrowserBar() {
  const content = useViewerStore((s) => s.content);
  const isLoading = useViewerStore((s) => s.isLoading);
  const backStack = useViewerStore((s) => s.backStack);
  const forwardStack = useViewerStore((s) => s.forwardStack);
  const setContent = useViewerStore((s) => s.setContent);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setError = useViewerStore((s) => s.setError);
  const goBack = useViewerStore((s) => s.goBack);
  const goForward = useViewerStore((s) => s.goForward);

  const addEntry = useHistoryStore((s) => s.addEntry);

  const [inputUrl, setInputUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // コンテンツが変わったらURL欄を同期
  useEffect(() => {
    if (!isFocused) {
      setInputUrl(content?.url ?? '');
    }
  }, [content?.url, isFocused]);

  const handleNavigate = async (targetUrl?: string) => {
    const trimmed = (targetUrl ?? inputUrl).trim();
    if (!trimmed) return;

    const finalUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
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
        e instanceof Error
          ? e.message
          : 'ページを開けませんでした。',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    if (content?.url) {
      handleNavigate(content.url);
    }
  };

  const canGoBack = backStack.length > 0;
  const canGoForward = forwardStack.length > 0;

  // フォーカス外れたとき、非フォーカス時はタイトルを表示
  const showTitle = !isFocused && !!content && !isLoading;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1.5"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* 戻る */}
        <NavButton onClick={goBack} disabled={!canGoBack || isLoading} label="戻る">
          <path d="M15 18l-6-6 6-6" />
        </NavButton>

        {/* 進む */}
        <NavButton onClick={goForward} disabled={!canGoForward || isLoading} label="進む">
          <path d="M9 18l6-6-6-6" />
        </NavButton>

        {/* リロード / 停止 */}
        <NavButton
          onClick={handleReload}
          disabled={!content || isLoading}
          label={isLoading ? '停止' : 'リロード'}
        >
          {isLoading ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </>
          )}
        </NavButton>

        {/* URL入力エリア */}
        <div className="flex-1 flex items-center rounded-lg bg-background px-3 py-1.5 gap-1.5">
          {/* アイコン */}
          <span className="text-muted shrink-0">
            {content ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            )}
          </span>

          {/* 入力 or タイトル表示 */}
          {showTitle ? (
            <button
              onClick={() => setIsFocused(true)}
              className="flex-1 text-left text-[13px] text-foreground truncate"
            >
              <span className="text-muted/60 mr-1.5">
                {content.type === 'youtube' ? '🎬' : '📄'}
              </span>
              {content.title}
              <span className="ml-2 text-[11px] text-muted hidden sm:inline">
                — {content.url}
              </span>
            </button>
          ) : (
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputUrl.trim() && !isLoading) {
                  handleNavigate();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onFocus={(e) => {
                setIsFocused(true);
                setInputUrl(content?.url ?? '');
                e.target.select();
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              placeholder="URLを入力、または検索"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/60 focus:outline-none"
              autoComplete="off"
            />
          )}
        </div>
      </div>

      {/* ローディングプログレスバー */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-xl">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%', x: '0%' }}
            animate={{ width: '40%', x: '100%' }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent"
      aria-label={label}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
