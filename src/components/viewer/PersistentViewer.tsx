'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ContentViewer } from './ContentViewer';
import { useViewerStore } from '@/stores/viewer-store';

/**
 * Persistent viewer wrapper mounted once in ClientProviders so the
 * underlying iframe (e.g. YouTube) keeps playing across route changes.
 *
 * Modes:
 * - `/`          : inline at the top of the main content area.
 * - other routes : compact mini-player floating at the bottom-left
 *                  (collapsible to a small pill). On mobile it renders
 *                  small enough to stay clear of the floating character
 *                  at the bottom-right.
 *
 * We intentionally keep a single stable DOM subtree for the iframe and
 * only toggle wrapper classes/styles between modes. Collapsing the
 * mini-player uses an off-viewport absolute position rather than
 * `display: none`, so YouTube playback keeps running while collapsed.
 */
export function PersistentViewer() {
  const pathname = usePathname();
  const content = useViewerStore((s) => s.content);
  const [isTheater, setIsTheater] = useState(false);
  const [isMiniExpanded, setIsMiniExpanded] = useState(true);

  if (!content) return null;

  const isHome = pathname === '/';
  const isYouTube = content.type === 'youtube';
  const showPill = !isHome && !isMiniExpanded;

  // Outer wrapper: inline on home, fixed floating on other routes.
  // Mobile:  top-right, narrow, so it never touches the chat input
  //          (bottom-center) or the floating character (bottom-right
  //          on desktop but still bottom-area on mobile).
  // Desktop: bottom-left, moderate size, stays clear of the character
  //          which defaults to the bottom-right corner.
  const wrapperClass = isHome
    ? 'mx-auto max-w-5xl px-4 pt-4'
    : 'fixed z-40 top-[112px] right-3 w-[58vw] max-w-[220px] md:top-auto md:right-auto md:bottom-4 md:left-4 md:w-[min(70vw,300px)] md:max-w-[300px]';

  // When collapsed, move the viewer off-viewport (not display:none) so
  // the iframe keeps running. A small pill is shown in its place.
  const viewerOffscreenStyle: React.CSSProperties | undefined = showPill
    ? {
        position: 'fixed',
        left: -10000,
        top: 0,
        width: 300,
        pointerEvents: 'none',
      }
    : undefined;

  return (
    <>
      <div className={wrapperClass} style={showPill ? undefined : undefined}>
        <div className="relative" style={viewerOffscreenStyle}>
          <ContentViewer
            isTheater={isHome && isTheater}
            onToggleTheater={
              isHome && isYouTube ? () => setIsTheater((v) => !v) : undefined
            }
          />
          {!isHome && !showPill && (
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
      </div>

      {/* Collapsed pill — shown when the mini player is minimized on
          a non-home route. Renders only the control; the iframe itself
          stays mounted offscreen so YouTube keeps playing. */}
      {showPill && (
        <button
          onClick={() => setIsMiniExpanded(true)}
          className="fixed z-40 top-[112px] right-3 md:top-auto md:right-auto md:bottom-4 md:left-4 flex items-center gap-2 rounded-full bg-surface border border-border px-3 py-2 text-[12px] font-medium text-foreground hover:bg-surface-hover transition-colors max-w-[min(58vw,220px)]"
          style={{ boxShadow: 'var(--shadow-md)' }}
          aria-label="ビューアを表示"
        >
          <span aria-hidden="true">{isYouTube ? '🎬' : '📄'}</span>
          <span className="truncate">{content.title}</span>
        </button>
      )}
    </>
  );
}
