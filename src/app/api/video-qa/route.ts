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
    }: {
      videoTranscript: string;
      messages: { role: string; content: string }[];
      aiName: string;
      growthParams: GrowthParams;
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

    const systemPrompt = buildVideoQASystemPrompt(
      aiName || 'アイモ',
      growthParams,
      videoTranscript,
    );

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20),
    ];

    const response = await callLLM({
      messages: llmMessages,
      temperature: 0.5,
      maxTokens: 768,
    });

    return NextResponse.json({
      content: response.content,
    });
  } catch (error) {
    console.error('Video QA API error:', error);
    return NextResponse.json(
      { error: '回答の生成に失敗しました。もう一度試してみてください。' },
      { status: 500 },
    );
  }
}

function buildVideoQASystemPrompt(
  aiName: string,
  growthParams: GrowthParams,
  transcript: string,
): string {
  const base = buildSystemPrompt(aiName, growthParams);
  const truncated = transcript.slice(0, 5000);

  return `${base}

あなたは今、ユーザーと一緒にYouTube動画を視聴しています。
以下はこの動画の字幕テキスト（またはユーザーが入力したメモ）です。

--- 動画の内容 ---
${truncated}
--- ここまで ---

ユーザーからの質問にはこの動画の内容を踏まえて答えてください。
- 動画の内容に関する質問には具体的に答える
- 動画に書かれていないことは「動画では触れられていませんが」と前置きする
- わかりやすく、短めに答える（3〜5文程度）
- 日本語で回答する`;
}
