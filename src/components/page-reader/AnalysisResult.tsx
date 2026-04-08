'use client';

import { motion } from 'framer-motion';
import type { AnalysisType } from '@/types';
import { ANALYSIS_TYPE_LABELS } from '@/types';

interface AnalysisResultProps {
  content: string;
  type: AnalysisType;
  url: string;
  onClose: () => void;
}

const TYPE_ICONS: Record<AnalysisType, string> = {
  summary: '📋',
  simplify: '💡',
  caution: '⚠️',
  perspective: '🔍',
};

export function AnalysisResult({
  content,
  type,
  url,
  onClose,
}: AnalysisResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICONS[type]}</span>
          <h4 className="text-sm font-semibold text-foreground">
            {ANALYSIS_TYPE_LABELS[type]}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          aria-label="閉じる"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="mb-3 text-xs text-muted truncate">
        {url}
      </p>

      <div className="rounded-xl bg-background p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {content}
      </div>
    </motion.div>
  );
}
