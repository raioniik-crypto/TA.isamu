'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ContentViewer } from './ContentViewer';
import { useViewerStore } from '@/stores/viewer-store';

/**
 * Persistent viewer wrapper mounted once in ClientProviders so that the
 * underlying iframe (e.g. YouTube) keeps playing across route changes.
 *
 * The ContentViewer is always rendered inside the same DOM subtree so
 * the iframe is never unmounted. We only toggle outer wrapper styles
 * between "inline at top of home" and "floating mini-player" on other
 * routes. React keeps the inner tree stable, so the iframe keeps playing.
 */
export function PersistentViewer() {
  const pathname = usePathname();
  const content = useViewerStore((s) => s.content);
  const [isTheater, setIsTheater] = useState(false);
  const [isMiniExpanded, setIsMiniExpanded] = useState(true);

  if (!content) return null;

  const isHome = pathname === '/';
  const isYouTube = content.type === 'youtube';

  // Single stable wrapper — only class/style changes between modes so
  // the ContentViewer (and its iframe) is never remounted.
  const wrapperClass = isHome
    ? 'mx-auto max-w-5xl px-4 pt-4'
    : isMiniExpanded
      ? 'fixed bottom-4 left-4 z-40 w-[min(92vw,360px)]'
      : 'fixed bottom-4 left-4 z-40 w-auto';

  return (
    <div className={wrapperClass}>
      <div
        className="relative"
        style={{
          // Hide the full viewer when collapsed on non-home routes,
          // without unmounting the iframe — keeps YouTube playback alive.
          display: !isHome && !isMiniExpanded ? 'none' : undefined,
        }}
      >
        <ContentViewer
          isTheater={isHome && isTheater}
          onToggleTheater={
            isHome && isYouTube ? () => setIsTheater((v) => !v) : undefined
          }
        />
        {!isHome && isMiniExpanded && (
          <button
            onClick={() => setIsMiniExpanded(false)}
            className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-foreground transition-colors"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            aria-label="小さくする"
            title="小さくする"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="4 14 10 14 10 20" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapsed pill — shown only on non-home when minimized */}
      {!isHome && !isMiniExpanded && (
        <button
          onClick={() => setIsMiniExpanded(true)}
          className="flex items-center gap-2 rounded-full bg-surface border border-border px-4 py-2 text-[12px] font-medium text-foreground hover:bg-surface-hover transition-colors"
          style={{ boxShadow: 'var(--shadow-md)' }}
          aria-label="ビューアを表示"
        >
          <span>{isYouTube ? '🎬' : '📄'}</span>
          <span className="max-w-[160px] truncate">{content.title}</span>
        </button>
      )}
    </div>
  );
}
