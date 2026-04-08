'use client';

import { motion } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import { useWatchingStore } from '@/stores/watching-store';

export function ContentViewer() {
  const content = useViewerStore((s) => s.content);

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* ページタイトルバー */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm shrink-0">
            {content.type === 'youtube' ? '🎬' : '📄'}
          </span>
          <h3 className="text-[13px] font-medium text-foreground truncate">
            {content.title}
          </h3>
        </div>
        <CloseButton />
      </div>

      {/* コンテンツ */}
      {content.type === 'youtube' && content.youtubeId ? (
        <YouTubeEmbed videoId={content.youtubeId} />
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
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
        <div className="text-[15px] leading-[1.8] text-foreground whitespace-pre-wrap">
          {body}
        </div>
      </div>
    </div>
  );
}
