'use client';

import type { LearningDiary } from '@/types';
import { DiaryCard } from './DiaryCard';

interface DiaryListProps {
  diaries: LearningDiary[];
}

export function DiaryList({ diaries }: DiaryListProps) {
  if (diaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">📔</p>
        <p className="text-sm text-muted">
          まだ日記はありません
        </p>
        <p className="text-xs text-muted mt-1">
          AIと会話すると、学習日記が生まれます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {diaries.map((diary, i) => (
        <DiaryCard key={diary.id} diary={diary} index={i} />
      ))}
    </div>
  );
}
