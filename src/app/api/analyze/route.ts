import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai/llm-client';
import { buildSystemPrompt } from '@/lib/ai/personality';
import { buildAnalysisPrompt } from '@/lib/ai/prompts';
import { extractPageContent } from '@/lib/page-reader/extractor';
import { pageReadDelta } from '@/lib/growth/engine';
import type { AnalysisType, GrowthParams } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      url,
      type,
      aiName,
      growthParams,
    }: {
      url: string;
      type: AnalysisType;
      aiName: string;
      growthParams: GrowthParams;
    } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // ページ内容を取得
    const content = await extractPageContent(url);

    // 解析プロンプトを構築
    const systemPrompt = buildSystemPrompt(aiName || 'イサム', growthParams);
    const analysisPrompt = buildAnalysisPrompt(content, type || 'summary', url);

    const response = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.5,
      maxTokens: 1024,
    });

    return NextResponse.json({
      content: response.content,
      growthDelta: pageReadDelta(),
    });
  } catch (error) {
    console.error('Analyze API error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to analyze page';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
