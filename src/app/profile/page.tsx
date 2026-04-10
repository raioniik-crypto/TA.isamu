'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useHydration } from '@/stores/use-hydration';
import { GrowthRadar } from '@/components/profile/GrowthRadar';
import { derivePersonality } from '@/lib/ai/personality';
import { DEFAULT_GROWTH_PARAMS } from '@/types';

const PARAM_LABELS: { key: 'curiosity' | 'empathy' | 'logic' | 'caution' | 'attachment'; label: string; desc: string }[] = [
  { key: 'curiosity', label: '好奇心', desc: '新しいことへの興味' },
  { key: 'empathy', label: '共感', desc: '相手の気持ちへの理解' },
  { key: 'logic', label: '論理性', desc: '整理して考える力' },
  { key: 'caution', label: '慎重さ', desc: 'リスクへの注意力' },
  { key: 'attachment', label: '親密度', desc: 'ユーザーとの絆' },
];

export default function ProfilePage() {
  const hydrated = useHydration();
  const params = useAIProfileStore((s) => s.params);
  const totalInteractions = useAIProfileStore((s) => s.totalInteractions);
  const createdAt = useAIProfileStore((s) => s.createdAt);
  const aiName = useSettingsStore((s) => s.aiName);

  const displayParams = hydrated ? params : DEFAULT_GROWTH_PARAMS;
  const displayName = hydrated ? aiName : 'アイモ';
  const displayCount = hydrated ? totalInteractions : 0;
  const personality = derivePersonality(displayParams);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          {displayName}のプロフィール
        </h1>

        {/* 性格カード */}
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex h-14 w-14 shrink-0 items-start justify-center rounded-full bg-surface-hover overflow-hidden ring-1 ring-border">
              <Image
                src="/sprites/phil-default.png"
                alt={displayName}
                width={120}
                height={168}
                className="pointer-events-none select-none max-w-none"
                style={{ height: 'auto', width: '120%', marginTop: '-6%' }}
                priority
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-primary font-medium">
                {personality.trait}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {personality.description}
          </p>
          <div className="mt-3 flex gap-4 text-[13px] text-muted">
            <span>会話: {displayCount}回</span>
            {hydrated && (
              <span>
                誕生日:{' '}
                {new Date(createdAt).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {/* レーダーチャート */}
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            性格傾向
          </h3>
          <GrowthRadar params={displayParams} />
        </div>

        {/* パラメータ詳細 */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            各パラメータ
          </h3>
          <div className="space-y-3">
            {PARAM_LABELS.map(({ key, label, desc }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <span className="ml-2 text-[13px] text-muted">{desc}</span>
                  </div>
                  <span className="text-[13px] text-muted font-medium">
                    {Math.round(displayParams[key] * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${displayParams[key] * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
