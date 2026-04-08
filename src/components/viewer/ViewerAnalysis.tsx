'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisType, GrowthDelta } from '@/types';
import { ANALYSIS_TYPE_LABELS } from '@/types';
import { useViewerStore } from '@/stores/viewer-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { AnalysisResult } from '@/components/page-reader/AnalysisResult';

const ANALYSIS_TYPES: AnalysisType[] = [
  'summary',
  'simplify',
  'caution',
  'perspective',
];

const TYPE_ICONS: Record<AnalysisType, string> = {
  summary: '📋',
  simplify: '💡',
  caution: '⚠️',
  perspective: '🔍',
};

export function ViewerAnalysis() {
  const content = useViewerStore((s) => s.content);
  const [selectedType, setSelectedType] = useState<AnalysisType>('summary');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  // コンテンツがある場合のみ表示
  if (!content) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: content.url,
          type: selectedType,
          aiName,
          growthParams: params,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '解析に失敗しました。');
      }

      const data: { content: string; growthDelta: GrowthDelta } =
        await res.json();

      setResult({
        content: data.content,
        type: selectedType,
        url: content.url,
      });

      if (data.growthDelta) {
        applyGrowth(data.growthDelta);
      }
      incrementInteractions();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '解析に失敗しました。もう一度試してみてください。',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 解析コントロール */}
      <div
        className="rounded-2xl border border-border bg-surface p-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="mb-3 text-xs font-medium text-muted">
          AIにこのページを解析してもらう
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {ANALYSIS_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedType === type
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background text-muted hover:bg-surface-hover hover:text-foreground border border-border'
              }`}
            >
              <span className="mr-1">{TYPE_ICONS[type]}</span>
              {ANALYSIS_TYPE_LABELS[type]}
            </button>
          ))}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="ml-auto rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block h-3 w-3 rounded-full border-2 border-white/30 border-t-white"
                />
                解析中...
              </span>
            ) : (
              '解析する'
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
            className="rounded-xl border border-error/20 bg-error/5 px-4 py-3"
          >
            <p className="text-xs text-foreground">{error}</p>
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
