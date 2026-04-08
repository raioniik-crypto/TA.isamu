import type { AnalysisType } from '@/types';

/**
 * ページ解析用プロンプト
 */
export function buildAnalysisPrompt(
  content: string,
  type: AnalysisType,
  url: string,
): string {
  const instructions: Record<AnalysisType, string> = {
    summary:
      'このページの内容を、わかりやすく3〜5文で要約してください。重要なポイントを押さえてください。',
    simplify:
      'このページの難しい表現や専門用語を、中学生でもわかるようにやさしく言い換えてください。',
    caution:
      'このページの内容について、注意すべき点や鵜呑みにしない方がいい部分を指摘してください。',
    perspective:
      'このページの内容について、別の角度からの見方や、関連する話題を提示してください。',
  };

  return `以下はURL「${url}」のページ内容です。

---
${content.slice(0, 4000)}
---

${instructions[type]}

短く、わかりやすく、日本語で答えてください。`;
}

/**
 * 日記生成用プロンプト
 */
export function buildDiaryPrompt(
  recentMessages: { role: string; content: string }[],
): string {
  const summary = recentMessages
    .slice(-20)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  return `以下は今日のユーザーとの会話の抜粋です。

---
${summary}
---

この会話を元に、AIキャラクターの視点で「今日の学習日記」を書いてください。

以下のJSON形式で出力してください:
{
  "title": "日記のタイトル（15文字以内）",
  "summary": "今日学んだことや感じたこと（100文字程度）",
  "topics": ["話題1", "話題2"],
  "mood": "嬉しい/楽しい/真剣/考え中/ワクワク のいずれか"
}

JSONのみを出力し、他の文章は含めないでください。`;
}

/**
 * 育成パラメータ変動の判定用プロンプト
 */
export function buildGrowthAnalysisPrompt(
  userMessage: string,
  assistantReply: string,
): string {
  return `以下のユーザーとAIの会話を分析し、AIの育成パラメータへの影響を判定してください。

ユーザー: ${userMessage}
AI: ${assistantReply}

以下のJSON形式で出力してください。各値は -0.05〜+0.05 の範囲で:
{
  "curiosity": 0.0,
  "empathy": 0.0,
  "logic": 0.0,
  "caution": 0.0,
  "attachment": 0.0
}

- 新しい話題や質問が多い → curiosity上昇
- 感情的な話題や共感 → empathy上昇
- 論理的な議論 → logic上昇
- リスクや注意の話題 → caution上昇
- 会話が続くほど → attachment微増

JSONのみを出力してください。`;
}
