'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ContentViewer } from '@/components/viewer/ContentViewer';
import { VideoQA } from '@/components/viewer/VideoQA';
import { ViewerAnalysis } from '@/components/viewer/ViewerAnalysis';
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

  const displayParams = hydrated ? params : DEFAULT_GROWTH_PARAMS;
  const displayName = hydrated ? aiName : 'アイモ';
  const displayCount = hydrated ? totalInteractions : 0;
  const personality = derivePersonality(displayParams);

  const hasContent = !!content;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      {/* エラー表示 */}
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
              <p className="text-[13px] text-foreground leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* コンテンツ非表示時 → ブラウザホーム画面 */}
      {!hasContent && (
        <BrowserHome
          displayName={displayName}
          displayCount={displayCount}
          personality={personality}
        />
      )}

      {/* コンテンツ表示時 → ブラウザ閲覧モード */}
      {hasContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 space-y-4"
        >
          {/* メイン閲覧エリア */}
          <ContentViewer />

          {/* AI解析パネル（横並び可能に） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <VideoQA />
            </div>
            <div className="space-y-4">
              <ViewerAnalysis />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
