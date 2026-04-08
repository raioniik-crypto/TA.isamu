'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDiaryStore } from '@/stores/diary-store';

const MOOD_EMOJI: Record<string, string> = {
  '嬉しい': '😊',
  '楽しい': '😄',
  '真剣': '🤔',
  '考え中': '💭',
  'ワクワク': '✨',
};

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const diaries = useDiaryStore((s) => s.diaries);
  const diary = diaries.find((d) => d.id === params.id);

  if (!diary) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted">日記が見つかりません</p>
        <button
          onClick={() => router.push('/diary')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          日記一覧に戻る
        </button>
      </div>
    );
  }

  const date = new Date(diary.createdAt);
  const emoji = MOOD_EMOJI[diary.mood] ?? '📝';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={() => router.push('/diary')}
        className="mb-4 text-sm text-muted hover:text-foreground transition-colors"
      >
        ← 日記一覧
      </button>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {diary.title}
            </h1>
            <p className="text-[13px] text-muted">
              {date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              {date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-background p-4">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {diary.summary}
          </p>
        </div>

        {diary.topics.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-[13px] font-semibold text-muted uppercase tracking-wide">
              トピック
            </h2>
            <div className="flex flex-wrap gap-2">
              {diary.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-primary/10 px-3 py-1 text-[13px] text-primary"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span>気分:</span>
          <span className="rounded-full bg-surface-hover px-2 py-0.5">
            {emoji} {diary.mood}
          </span>
        </div>
      </motion.article>
    </div>
  );
}
