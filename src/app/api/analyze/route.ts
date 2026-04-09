import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai/llm-client';
import { buildSystemPrompt } from '@/lib/ai/personality';
import { buildAnalysisPrompt } from '@/lib/ai/prompts';
import { extractPageContent, PageReadError } from '@/lib/page-reader/extractor';
import { pageReadDelta } from '@/lib/growth/engine';
import { apiGuard } from '@/lib/security/api-guard';
import type { AnalysisType, GrowthParams } from '@/types';

export async function POST(req: NextRequest) {
  const blocked = apiGuard(req, { maxRequests: 20 });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const {
      url,
      type,
      aiName,
      growthParams,
      content: preSuppliedContent,
    }: {
      url: string;
      type: AnalysisType;
      aiName: string;
      growthParams: GrowthParams;
      content?: string;
    } = body;

    if (!url) {
      return NextResponse.json({ error: 'URLを入力してください。' }, { status: 400 });
    }

    // クライアントから本文が渡されていればそのまま使う（YouTube字幕など）
    // なければ従来通りURLからページ内容を取得
    const content = preSuppliedContent || (await extractPageContent(url));

    // 解析プロンプトを構築
    const systemPrompt = buildSystemPrompt(aiName || 'アイモ', growthParams);
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

    // PageReadError はユーザー向けメッセージをそのまま返す
    if (error instanceof PageReadError) {
      return NextResponse.json({ error: error.userMessage }, { status: 422 });
    }

    return NextResponse.json(
      { error: 'ページの解析中にエラーが発生しました。もう一度試してみてください。' },
      { status: 500 },
    );
  }
}
