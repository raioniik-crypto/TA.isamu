import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai/llm-client';
import { buildSystemPrompt } from '@/lib/ai/personality';
import type { GrowthParams } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoTranscript,
      messages,
      aiName,
      growthParams,
      hasTimedSegments,
    }: {
      videoTranscript: string;
      messages: { role: string; content: string }[];
      aiName: string;
      growthParams: GrowthParams;
      hasTimedSegments?: boolean;
    } = body;

    if (!videoTranscript) {
      return NextResponse.json(
        { error: '動画の字幕テキストがありません。' },
        { status: 400 },
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: '質問を入力してください。' },
        { status: 400 },
      );
    }

    // ユーザーの最新質問
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    // 質問に関連する字幕断片を抽出（最大3つ）
    const excerpts = extractRelevantExcerpts(videoTranscript, lastUserMessage);

    // 時間指定クエリの検出
    const hasTimeReference = /(\d+)\s*(秒|分|:|：|時点|あたり|ごろ|頃|s|m|min)/.test(lastUserMessage);

    const systemPrompt = buildVideoQASystemPrompt(
      aiName || 'アイモ',
      growthParams,
      videoTranscript,
      excerpts,
      hasTimeReference,
      !!hasTimedSegments,
    );

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20),
    ];

    const response = await callLLM({
      messages: llmMessages,
      temperature: 0.3, // 低めにして根拠重視
      maxTokens: 768,
    });

    return NextResponse.json({
      content: response.content,
      excerpts: excerpts.length > 0 ? excerpts : undefined,
    });
  } catch (error) {
    console.error('Video QA API error:', error);
    return NextResponse.json(
      { error: '回答の生成に失敗しました。もう一度試してみてください。' },
      { status: 500 },
    );
  }
}

/**
 * 質問に関連しそうな字幕断片を抽出する
 * キーワードマッチングで関連度の高い文を最大3つ返す
 */
function extractRelevantExcerpts(
  transcript: string,
  question: string,
): string[] {
  // 質問からキーワードを抽出（助詞・記号・ストップワードを除去）
  const stopWords = new Set([
    'の', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'や', 'か',
    'な', 'て', 'た', 'だ', 'する', 'した', 'する', 'ます', 'です',
    'ある', 'いる', 'この', 'その', 'あの', 'どの', 'って', 'という',
    'こと', 'もの', 'ため', 'から', 'まで', 'より', 'ない', 'なに',
    'what', 'how', 'why', 'when', 'where', 'the', 'is', 'are', 'was',
    'about', 'って', 'について', 'とは', 'なん', 'どう', 'どんな',
  ]);

  const keywords = question
    .replace(/[？?！!。、,.…\s]+/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (keywords.length === 0) return [];

  // 字幕テキストを文単位で分割
  const sentences = transcript
    .split(/(?<=[。.！!？?\n])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // 各文にスコアを付ける（キーワードの一致数）
  const scored = sentences.map((sentence) => {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lowerSentence.includes(kw.toLowerCase())) {
        score += kw.length; // 長いキーワードほど高スコア
      }
    }
    return { sentence, score };
  });

  // スコア降順で上位3つ
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.sentence.slice(0, 150)); // 1断片あたり150文字上限
}

function buildVideoQASystemPrompt(
  aiName: string,
  growthParams: GrowthParams,
  transcript: string,
  excerpts: string[],
  hasTimeReference: boolean,
  hasTimedSegments: boolean,
): string {
  const base = buildSystemPrompt(aiName, growthParams);
  const truncated = transcript.slice(0, 5000);

  const excerptBlock =
    excerpts.length > 0
      ? `\n\n--- 質問に関連しそうな部分 ---\n${excerpts.map((e, i) => `[${i + 1}] ${e}`).join('\n')}\n--- ここまで ---`
      : '';

  const timeNote = hasTimeReference
    ? hasTimedSegments
      ? '\nユーザーが時間を指定しています。該当する時間帯の字幕を参照して答えてください。'
      : '\nユーザーが時間を指定していますが、現在の字幕データには時刻情報がありません。「時間指定での参照にはまだ対応できていません。内容全体から関連部分をお伝えします」と正直に伝えてから、内容全体から関連する部分を探して答えてください。'
    : '';

  return `${base}

あなたは今、ユーザーと一緒にYouTube動画を視聴しています。
以下はこの動画の字幕テキスト（またはユーザーが入力したメモ）です。

--- 動画の内容（全文） ---
${truncated}
--- ここまで ---${excerptBlock}${timeNote}

## 回答ルール（厳守）

1. **必ず上記の「動画の内容」に基づいて答えること**。一般知識や推測で補完しない。
2. 質問に対する答えが動画内容に含まれていれば、**該当する部分を具体的に引用**して答える。
   - 引用は「動画では〜と言っています」「字幕には〜とあります」のような形式で。
3. 質問の答えが動画内容に**見つからない場合**は、正直に「この動画の内容にはその情報が含まれていないようです」と伝える。推測や一般論で埋めない。
4. 部分的にしか答えられない場合は「動画で触れられているのはここまでです」と範囲を明示する。
5. 回答は**3〜5文**で簡潔にまとめる。
6. 日本語で回答する。`;
}
