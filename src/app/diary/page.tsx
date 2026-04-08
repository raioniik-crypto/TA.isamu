'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DiaryList } from '@/components/diary/DiaryList';
import { useDiaryStore } from '@/stores/diary-store';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { LearningDiary } from '@/types';

export default function DiaryPage() {
  const diaries = useDiaryStore((s) => s.diaries);
  const addDiary = useDiaryStore((s) => s.addDiary);
  const conversations = useChatStore((s) => s.conversations);
  const aiName = useSettingsStore((s) => s.aiName);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDiary = async () => {
    setIsGenerating(true);
    try {
      // 最新の会話からメッセージを収集
      const allMessages = conversations
        .flatMap((c) => c.messages)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok) throw new Error('Failed to generate diary');

      const data: { diary: LearningDiary } = await res.json();
      addDiary(data.diary);
    } catch {
      // エラー時はフォールバック日記
      addDiary({
        id: crypto.randomUUID(),
        title: '今日の記録',
        summary: '今日も色々なことを学びました。また明日も頑張ろう！',
        topics: [],
        mood: '楽しい',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">学習日記</h1>
            <p className="text-sm text-muted mt-1">
              {aiName}が残した学びの記録
            </p>
          </div>
          <button
            onClick={handleGenerateDiary}
            disabled={isGenerating}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          >
            {isGenerating ? '生成中...' : '日記を書く'}
          </button>
        </div>

        <DiaryList diaries={diaries} />
      </motion.div>
    </div>
  );
}
