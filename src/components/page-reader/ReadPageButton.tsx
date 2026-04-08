'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisType, GrowthDelta } from '@/types';
import { ANALYSIS_TYPE_LABELS } from '@/types';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { AnalysisResult } from './AnalysisResult';

const ANALYSIS_TYPES: AnalysisType[] = [
  'summary',
  'simplify',
  'caution',
  'perspective',
];

const LOADING_MESSAGES = [
  'ページを読み込んでいます...',
  'テキストを抽出しています...',
  'AIが内容を読んでいます...',
];

export function ReadPageButton() {
  const [url, setUrl] = useState('');
  const [selectedType, setSelectedType] = useState<AnalysisType>('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{
    content: string;
    type: AnalysisType;
    url: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);
  const applyGrowth = useAIProfileStore((s) => s.applyGrowth);
  const incrementInteractions = useAIProfileStore((s) => s.incrementInteractions);

  const handleAnalyze = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);

    // ローディングステップの進行
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_MESSAGES.length - 1));
    }, 2000);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          type: selectedType,
          aiName,
          growthParams: params,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ページの解析に失敗しました。');
      }

      const data: { content: string; growthDelta: GrowthDelta } =
        await res.json();

      setResult({
        content: data.content,
        type: selectedType,
        url: url.trim(),
      });

      if (data.growthDelta) {
        applyGrowth(data.growthDelta);
      }
      incrementInteractions();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ページの解析に失敗しました。もう一度試してみてください。',
      );
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL入力 */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          ページを読んでもらう
        </h3>

        <div className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim() && !isLoading) handleAnalyze();
            }}
            placeholder="https://example.com/article"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />

          {/* 解析タイプ選択 */}
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-primary text-white'
                    : 'bg-background text-muted hover:bg-surface-hover hover:text-foreground border border-border'
                }`}
              >
                {ANALYSIS_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!url.trim() || isLoading}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
                {LOADING_MESSAGES[loadingStep]}
              </span>
            ) : (
              'このページを見て'
            )}
          </button>
        </div>
      </div>

      {/* エラー */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-error/20 bg-error/5 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg shrink-0">😥</span>
              <div>
                <p className="text-sm text-foreground leading-relaxed">{error}</p>
                <p className="mt-2 text-xs text-muted">
                  ニュース記事やブログなど、テキスト中心のページがおすすめです。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 結果 */}
      <AnimatePresence>
        {result && (
          <AnalysisResult
            content={result.content}
            type={result.type}
            url={result.url}
            onClose={() => setResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
