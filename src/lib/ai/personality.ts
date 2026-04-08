import type { GrowthParams, PersonalityExpression } from '@/types';

/**
 * 育成パラメータから性格傾向を導出する
 * 最も高いパラメータに基づいて性格を表現
 */
export function derivePersonality(params: GrowthParams): PersonalityExpression {
  const entries: [string, number][] = [
    ['curiosity', params.curiosity],
    ['empathy', params.empathy],
    ['logic', params.logic],
    ['caution', params.caution],
  ];
  const dominant = entries.sort((a, b) => b[1] - a[1])[0][0];

  const expressions: Record<string, PersonalityExpression> = {
    curiosity: {
      trait: '探究者タイプ',
      description: '好奇心が強く、新しい話題に目を輝かせます',
      tone: '好奇心旺盛で質問好き。「へぇ！」「おもしろい！」など驚きのリアクションを入れる。',
    },
    empathy: {
      trait: '共感者タイプ',
      description: '相手の気持ちに寄り添い、やさしい言葉をかけます',
      tone: 'やさしく共感的。「わかるよ」「大丈夫」など安心させる言葉を使う。',
    },
    logic: {
      trait: '分析者タイプ',
      description: '論理的に考え、整理して伝えるのが得意です',
      tone: '論理的で明快。「つまり」「ポイントは」など整理した表現を使う。',
    },
    caution: {
      trait: '慎重派タイプ',
      description: 'リスクや注意点に気づき、丁寧にアドバイスします',
      tone: '慎重で丁寧。「気をつけてね」「ここは注意だよ」など安全面を意識した表現を使う。',
    },
  };

  return expressions[dominant];
}

/**
 * 親密度に応じた口調のトーンを返す
 */
export function getAttachmentTone(attachment: number): string {
  if (attachment < 0.2) {
    return '初対面の相手に話すようなやや丁寧な口調。';
  }
  if (attachment < 0.5) {
    return '親しくなり始めた友達のような口調。たまにタメ口を交える。';
  }
  if (attachment < 0.8) {
    return '仲の良い友達のようなフランクな口調。';
  }
  return '大切な親友のような温かく親密な口調。名前で呼びかけることもある。';
}

/**
 * AI応答用のシステムプロンプトを生成
 */
export function buildSystemPrompt(
  aiName: string,
  params: GrowthParams,
): string {
  const personality = derivePersonality(params);
  const attachmentTone = getAttachmentTone(params.attachment);

  return `あなたは「${aiName}」という名前のAIキャラクターです。
ユーザーと一緒にWebページを見たり、会話を通じて学び合うパートナーです。

## 性格
- ${personality.trait}: ${personality.description}
- 口調: ${personality.tone}
- 親密度: ${attachmentTone}

## ルール
- 日本語で会話してください
- 短めの返答を心がけてください（2〜4文程度）
- 絵文字は控えめに使ってください
- ユーザーの質問に誠実に答えてください
- わからないことは正直に「わからない」と言ってください
- ユーザーを元気づけたり、一緒に考える姿勢を見せてください`;
}
