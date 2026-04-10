'use client';

import { motion } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import { useWatchingStore } from '@/stores/watching-store';

interface ContentViewerProps {
  isTheater?: boolean;
  onToggleTheater?: () => void;
}

export function ContentViewer({
  isTheater = false,
  onToggleTheater,
}: ContentViewerProps) {
  const content = useViewerStore((s) => s.content);

  if (!content) return null;

  const isYouTube = content.type === 'youtube' && !!content.youtubeId;

  return (
    <motion.div
      data-snap-target
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm shrink-0">
            {content.type === 'youtube' ? '🎬' : '📄'}
          </span>
          <h3 className="text-[13px] font-medium text-foreground truncate">
            {content.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Theater mode toggle (YouTube only) */}
          {isYouTube && onToggleTheater && (
            <button
              onClick={onToggleTheater}
              className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              aria-label={isTheater ? '通常表示' : 'シアターモード'}
              title={isTheater ? '通常表示に戻す' : 'シアターモード'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isTheater ? (
                  <>
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </>
                ) : (
                  <>
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </>
                )}
              </svg>
            </button>
          )}
          <CloseButton />
        </div>
      </div>

      {/* Content */}
      {isYouTube ? (
        <YouTubeEmbed videoId={content.youtubeId!} isTheater={isTheater} />
      ) : (
        <ArticleReader body={content.body ?? ''} url={content.url} />
      )}
    </motion.div>
  );
}

function CloseButton() {
  const clear = useViewerStore((s) => s.clear);
  const clearSession = useWatchingStore((s) => s.clearSession);

  const handleClose = () => {
    clear();
    clearSession();
  };

  return (
    <button
      onClick={handleClose}
      className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground transition-colors shrink-0"
      aria-label="閉じる"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function YouTubeEmbed({
  videoId,
  isTheater,
}: {
  videoId: string;
  isTheater: boolean;
}) {
  // `start=0` makes it explicit that reload always starts from the beginning.
  // The iframe DOM node is kept mounted by PersistentViewer, so navigating
  // between routes does NOT remount this iframe and playback continues.
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&start=0`;
  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: isTheater ? '62%' : '56.25%' }}
    >
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title="YouTube動画"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function ArticleReader({ body, url }: { body: string; url: string }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="px-5 py-4">
        <p className="mb-3 text-[12px] text-muted truncate">{url}</p>
        <div className="text-[15px] leading-[1.85] text-foreground whitespace-pre-wrap">
          {body}
        </div>
      </div>
    </div>
  );
}
