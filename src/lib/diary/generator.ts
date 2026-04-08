import { v4 as uuidv4 } from 'uuid';
import type { LearningDiary } from '@/types';
import { callLLM } from '@/lib/ai/llm-client';
import { buildDiaryPrompt } from '@/lib/ai/prompts';

/**
 * 会話履歴から学習日記を自動生成
 */
export async function generateDiary(
  messages: { role: string; content: string }[],
): Promise<LearningDiary> {
  if (messages.length === 0) {
    return {
      id: uuidv4(),
      title: '静かな一日',
      summary: '今日は静かな一日でした。また明日お話ししましょう！',
      topics: [],
      mood: '考え中',
      createdAt: new Date().toISOString(),
    };
  }

  const prompt = buildDiaryPrompt(messages);
  const res = await callLLM({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens: 500,
  });

  try {
    const parsed = JSON.parse(res.content);
    return {
      id: uuidv4(),
      title: parsed.title || '今日の記録',
      summary: parsed.summary || '今日も色々ありました。',
      topics: parsed.topics || [],
      mood: parsed.mood || '楽しい',
      createdAt: new Date().toISOString(),
    };
  } catch {
    // JSONパース失敗時のフォールバック
    return {
      id: uuidv4(),
      title: '今日の記録',
      summary: res.content.slice(0, 200),
      topics: [],
      mood: '楽しい',
      createdAt: new Date().toISOString(),
    };
  }
}
