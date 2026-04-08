import type { GrowthDelta } from '@/types';
import { callLLM } from '@/lib/ai/llm-client';
import { buildGrowthAnalysisPrompt } from '@/lib/ai/prompts';

const ZERO_DELTA: GrowthDelta = {
  curiosity: 0,
  empathy: 0,
  logic: 0,
  caution: 0,
  attachment: 0,
};

/**
 * 会話内容からパラメータ変動を計算する
 * LLMによる判定を試み、失敗時はルールベースのフォールバック
 */
export async function calculateGrowthDelta(
  userMessage: string,
  assistantReply: string,
): Promise<GrowthDelta> {
  try {
    const prompt = buildGrowthAnalysisPrompt(userMessage, assistantReply);
    const res = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 200,
    });

    const parsed = JSON.parse(res.content);
    return {
      curiosity: clampDelta(parsed.curiosity ?? 0),
      empathy: clampDelta(parsed.empathy ?? 0),
      logic: clampDelta(parsed.logic ?? 0),
      caution: clampDelta(parsed.caution ?? 0),
      attachment: clampDelta(parsed.attachment ?? 0),
    };
  } catch {
    return fallbackDelta(userMessage);
  }
}

/** 変動値を-0.05〜+0.05に収める */
function clampDelta(v: number): number {
  return Math.min(0.05, Math.max(-0.05, v));
}

/**
 * ルールベースのフォールバック
 * LLMが使えない場合の簡易判定
 */
function fallbackDelta(userMessage: string): GrowthDelta {
  const msg = userMessage.toLowerCase();
  const delta = { ...ZERO_DELTA };

  // 質問系 → 好奇心
  if (msg.includes('?') || msg.includes('？') || msg.includes('なぜ') || msg.includes('どう')) {
    delta.curiosity = 0.02;
  }

  // 感情系 → 共感
  if (
    msg.includes('嬉しい') ||
    msg.includes('悲しい') ||
    msg.includes('ありがとう') ||
    msg.includes('つらい')
  ) {
    delta.empathy = 0.02;
  }

  // 論理系 → 論理
  if (
    msg.includes('なぜなら') ||
    msg.includes('理由') ||
    msg.includes('比較') ||
    msg.includes('分析')
  ) {
    delta.logic = 0.02;
  }

  // 注意系 → 慎重さ
  if (
    msg.includes('危険') ||
    msg.includes('注意') ||
    msg.includes('リスク') ||
    msg.includes('大丈夫')
  ) {
    delta.caution = 0.02;
  }

  // 会話するだけで親密度は微増
  delta.attachment = 0.01;

  return delta;
}

/**
 * ページ読解時の固定パラメータ変動
 */
export function pageReadDelta(): GrowthDelta {
  return {
    curiosity: 0.03,
    logic: 0.01,
    attachment: 0.01,
  };
}
