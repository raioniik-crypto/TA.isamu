'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentViewer } from '@/components/viewer/ContentViewer';
import { ViewerAnalysis } from '@/components/viewer/ViewerAnalysis';
import { CompanionViewer } from '@/components/ai-character/CompanionViewer';
import { BrowserHome } from '@/components/browser/BrowserHome';
import { useViewerStore } from '@/stores/viewer-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useHydration } from '@/stores/use-hydration';
import { derivePersonality } from '@/lib/ai/personality';
import { DEFAULT_GROWTH_PARAMS } from '@/types';

export default function HomePage() {
  const hydrated = useHydration();
  const content = useViewerStore((s) => s.content);
  const error = useViewerStore((s) => s.error);
  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);
  const totalInteractions = useAIProfileStore((s) => s.totalInteractions);

  const [isTheater, setIsTheater] = useState(false);

  const displayParams = hydrated ? params : DEFAULT_GROWTH_PARAMS;
  const displayName = hydrated ? aiName : 'アイモ';
  const displayCount = hydrated ? totalInteractions : 0;
  const personality = derivePersonality(displayParams);

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

      {/* Home */}
      {!hasContent && (
        <BrowserHome
          displayName={displayName}
          displayCount={displayCount}
          personality={personality}
        />
      )}

      {/* Content view */}
      {hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 space-y-4"
        >
          {/* YouTube: companion watching layout */}
          {isYouTube ? (
            <>
              <ContentViewer
                isTheater={isTheater}
                onToggleTheater={() => setIsTheater(!isTheater)}
              />
              <CompanionViewer />
            </>
          ) : (
            <>
              <ContentViewer isTheater={false} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ViewerAnalysis />
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
