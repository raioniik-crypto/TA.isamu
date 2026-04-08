'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LearningDiary } from '@/types';

const MOOD_EMOJI: Record<string, string> = {
  '嬉しい': '😊',
  '楽しい': '😄',
  '真剣': '🤔',
  '考え中': '💭',
  'ワクワク': '✨',
};

interface DiaryCardProps {
  diary: LearningDiary;
  index: number;
}

export function DiaryCard({ diary, index }: DiaryCardProps) {
  const emoji = MOOD_EMOJI[diary.mood] ?? '📝';
  const date = new Date(diary.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/diary/${diary.id}`}
        className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-surface-hover"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{emoji}</span>
              <h3 className="font-semibold text-foreground text-sm truncate">
                {diary.title}
              </h3>
            </div>
            <p className="text-[13px] text-muted leading-relaxed line-clamp-2">
              {diary.summary}
            </p>
            {diary.topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {diary.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[13px] text-muted">
              {date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="text-[11px] text-muted">
              {date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
