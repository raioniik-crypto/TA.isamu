import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai/llm-client';
import { buildSystemPrompt } from '@/lib/ai/personality';
import { calculateGrowthDelta } from '@/lib/growth/engine';
import type { GrowthParams } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      aiName,
      growthParams,
    }: {
      messages: { role: string; content: string }[];
      aiName: string;
      growthParams: GrowthParams;
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(aiName || 'イサム', growthParams);
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20), // 直近20件に制限
    ];

    const response = await callLLM({
      messages: llmMessages,
      temperature: 0.7,
      maxTokens: 512,
    });

    // 育成パラメータの変動を計算
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    const growthDelta = lastUserMsg
      ? await calculateGrowthDelta(lastUserMsg.content, response.content)
      : {};

    return NextResponse.json({
      content: response.content,
      growthDelta,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}
