'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ViewerAnalysis } from '@/components/viewer/ViewerAnalysis';
import { CompanionViewer } from '@/components/ai-character/CompanionViewer';
import { HomeCompanionCard } from '@/components/home/HomeCompanionCard';
import { useViewerStore } from '@/stores/viewer-store';

export default function HomePage() {
  const content = useViewerStore((s) => s.content);
  const error = useViewerStore((s) => s.error);

  const hasContent = !!content;
  const isYouTube = content?.type === 'youtube';

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 rounded-xl border border-error/20 bg-error/5 px-4 py-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-sm shrink-0">😥</span>
              <p className="text-[13px] text-foreground leading-relaxed">
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home: character + bubble + input + sample URL cards */}
      {!hasContent && <HomeCompanionCard />}

      {/* Content view — ContentViewer itself is rendered by PersistentViewer
          at the providers level so the iframe persists across route changes.
          Here we only render the "below content" UI. */}
      {hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 space-y-4"
        >
          {isYouTube ? (
            <CompanionViewer />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ViewerAnalysis />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
