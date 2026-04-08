'use client';

import { motion } from 'framer-motion';
import { UrlBar } from '@/components/viewer/UrlBar';
import { ContentViewer } from '@/components/viewer/ContentViewer';
import { ViewerAnalysis } from '@/components/viewer/ViewerAnalysis';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useHydration } from '@/stores/use-hydration';
import { derivePersonality } from '@/lib/ai/personality';
import { DEFAULT_GROWTH_PARAMS } from '@/types';

export default function HomePage() {
  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);
  const totalInteractions = useAIProfileStore((s) => s.totalInteractions);

  const displayParams = hydrated ? params : DEFAULT_GROWTH_PARAMS;
  const displayName = hydrated ? aiName : 'イサム';
  const displayCount = hydrated ? totalInteractions : 0;
  const personality = derivePersonality(displayParams);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 pb-24">
      {/* ウェルカムセクション */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="mb-1.5 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          TA.isamu
        </h1>
        <p className="text-[15px] text-muted">
          {displayName}と一緒にWebを探検しよう
        </p>

        {/* AIステータスカード */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6 text-left"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-lg text-white font-bold">
                {displayName.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-base">{displayName}</h2>
                <p className="text-xs text-primary font-medium">{personality.trait}</p>
              </div>
            </div>
            <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              {displayCount}回会話
            </span>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {personality.description}
          </p>
        </motion.div>
      </motion.section>

      {/* ビューアセクション */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <UrlBar />
        <ContentViewer />
        <ViewerAnalysis />
      </motion.section>

      {/* ヒント */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 rounded-2xl border border-border bg-surface/60 p-5"
      >
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          使い方ヒント
        </h3>
        <ul className="space-y-2.5 text-[13px] text-muted">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-primary shrink-0">1.</span>
            右下の <span className="text-primary font-medium">{displayName}</span> をタップして会話を始めよう
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-primary shrink-0">2.</span>
            URLを入力して記事やYouTube動画をこのサイト内で開けます
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-primary shrink-0">3.</span>
            会話するほど{displayName}の性格が少しずつ変わっていきます
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-primary shrink-0">4.</span>
            「日記」ページで{displayName}の学習記録を見返せます
          </li>
        </ul>
      </motion.section>
    </div>
  );
}
