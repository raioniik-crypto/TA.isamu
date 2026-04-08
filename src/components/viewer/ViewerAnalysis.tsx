'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalysisType, GrowthDelta } from '@/types';
import { ANALYSIS_TYPE_LABELS } from '@/types';
import { useViewerStore } from '@/stores/viewer-store';
import { useWatchingStore } from '@/stores/watching-store';
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

const BETA_BADGE = (
  <span className="ml-1.5 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
    BETA
  </span>
);

function getTranscriptErrorMessage(
  errorType: string | undefined,
): string {
  switch (errorType) {
    case 'no_captions':
      return 'この動画には字幕が設定されていません。';
    case 'blocked':
      return '現在の環境ではYouTube字幕の自動取得が拒否されました。';
    case 'parsing_failed':
      return '字幕データの解析に失敗しました。';
    case 'fetch_failed':
      return '現在の環境ではYouTube字幕の自動取得に失敗しました。';
    default:
      return '字幕の自動取得に失敗しました。';
  }
}

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

  // 手動テキスト貼り付け用
  const [manualText, setManualText] = useState('');

  const startSession = useWatchingStore((s) => s.startSession);
  const updateTranscript = useWatchingStore((s) => s.updateTranscript);
  const watchingSession = useWatchingStore((s) => s.session);

  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);
  const applyGrowth = useAIProfileStore((s) => s.applyGrowth);
  const incrementInteractions = useAIProfileStore((s) => s.incrementInteractions);

  if (!content) return null;

  const isYouTube = content.type === 'youtube';
  const hasAutoTranscript = isYouTube && !!content.body;
  const isYouTubeWithoutTranscript = isYouTube && !content.body;

  // 解析に使うテキスト: 自動取得字幕 > 手動貼り付け > 記事本文
  const analysisContent = content.body || manualText.trim() || undefined;
  const canAnalyze = !!analysisContent;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    // YouTube手動テキストの場合、視聴セッションにも反映する
    if (isYouTubeWithoutTranscript && manualText.trim() && content.youtubeId) {
      const hasExisting = watchingSession?.videoId === content.youtubeId;
      if (hasExisting) {
        updateTranscript(manualText.trim(), 'manual');
      } else {
        startSession(content.youtubeId, manualText.trim(), 'manual');
      }
    }

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
          content: analysisContent,
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

  // ─── 解析ボタン部分（共通） ──────────────────
  const analysisControls = (
    <div className="flex flex-wrap items-center gap-2">
      {ANALYSIS_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => setSelectedType(type)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
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
        disabled={isAnalyzing || !canAnalyze}
        className="ml-auto rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
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
  );

  return (
    <div className="space-y-3">
      {/* 解析コントロール */}
      <div
        data-snap-target
        className="rounded-2xl border border-border bg-surface p-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {isYouTubeWithoutTranscript ? (
          // ─── YouTube: 字幕自動取得失敗 → 手動貼り付けフォールバック ───
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-muted">
                YouTube動画を解析
              </span>
              {BETA_BADGE}
            </div>

            {/* エラー説明 */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-900/10">
              <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {getTranscriptErrorMessage(content.transcriptError)}
                {content.transcriptError !== 'no_captions' &&
                  ' サーバー環境の制約により、YouTube字幕の自動取得が制限されています。'}
              </p>
            </div>

            {/* 手動貼り付け */}
            <div className="space-y-1.5">
              <label
                htmlFor="manual-transcript"
                className="block text-[12px] font-medium text-foreground"
              >
                代わりに、字幕テキストや動画メモを貼り付けて解析できます
              </label>
              <textarea
                id="manual-transcript"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={'YouTubeの字幕をコピーして貼り付け、\nまたは動画の概要・メモを入力してください'}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted/50 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {manualText.trim() && (
                <p className="text-[11px] text-muted">
                  {manualText.trim().length.toLocaleString()} 文字入力済み
                </p>
              )}
            </div>

            {/* 解析ボタン（テキストが入力されていれば有効） */}
            {analysisControls}
          </div>
        ) : hasAutoTranscript ? (
          // ─── YouTube: 字幕自動取得成功 ───
          <>
            <p className="mb-3 text-[13px] font-medium text-muted">
              AIにこの動画の字幕を解析してもらう
              {BETA_BADGE}
            </p>
            {analysisControls}
          </>
        ) : (
          // ─── 記事解析（メイン機能） ───
          <>
            <p className="mb-3 text-[13px] font-medium text-muted">
              AIにこのページを解析してもらう
            </p>
            {!result && (
              <p className="mb-3 text-[12px] text-muted/70 leading-relaxed">
                要約・言い換え・注意点・別の視点から解析できます。ボタンを選んで「解析する」を押してください。
              </p>
            )}
            {analysisControls}
          </>
        )}
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
            <p className="text-[13px] text-foreground">{error}</p>
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
