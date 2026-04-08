'use client';

import { motion } from 'framer-motion';
import { ReadPageButton } from '@/components/page-reader/ReadPageButton';
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

  // hydration前はデフォルト値で表示（SSR一致）
  const displayParams = hydrated ? params : DEFAULT_GROWTH_PARAMS;
  const displayName = hydrated ? aiName : 'イサム';
  const displayCount = hydrated ? totalInteractions : 0;
  const personality = derivePersonality(displayParams);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ウェルカムセクション */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          TA.isamu
        </h1>
        <p className="text-muted">
          {displayName}と一緒にWebを探検しよう
        </p>

        {/* AIステータスカード */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl border border-border bg-surface p-5 text-left shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                🌱
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{displayName}</h2>
                <p className="text-xs text-muted">{personality.trait}</p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              {displayCount}回会話
            </span>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {personality.description}
          </p>
        </motion.div>
      </motion.section>

      {/* ページ読解セクション */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ReadPageButton />
      </motion.section>

      {/* ヒント */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 rounded-2xl border border-border bg-surface/50 p-4"
      >
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          使い方ヒント
        </h3>
        <ul className="space-y-1.5 text-xs text-muted">
          <li>
            右下の <span className="text-primary font-medium">{displayName}</span> をタップして会話を始めよう
          </li>
          <li>URLを入力して「このページを見て」で記事を読んでもらえます</li>
          <li>
            会話するほど{displayName}の性格が少しずつ変わっていきます
          </li>
          <li>
            「日記」ページで{displayName}の学習記録を見返せます
          </li>
        </ul>
      </motion.section>
    </div>
  );
}
