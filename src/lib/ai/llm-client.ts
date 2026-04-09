import type { LLMRequest, LLMResponse, LLMProvider } from '@/types';

/**
 * LLMクライアント抽象レイヤー
 * 環境変数 LLM_PROVIDER で切り替え可能
 */

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_completion_tokens: req.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    // ログにはレスポンスボディを含めるが、Error メッセージには含めない（クライアントへの漏洩防止）
    const body = await res.text();
    console.error(`OpenAI API error ${res.status}:`, body);
    throw new Error(`OpenAI API error (status ${res.status})`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        }
      : undefined,
  };
}

async function callAnthropic(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const systemMsg = req.messages.find((m) => m.role === 'system');
  const otherMsgs = req.messages.filter((m) => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: req.maxTokens ?? 1024,
      system: systemMsg?.content,
      messages: otherMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Anthropic API error ${res.status}:`, body);
    throw new Error(`Anthropic API error (status ${res.status})`);
  }

  const data = await res.json();
  return {
    content: data.content[0].text,
    usage: data.usage
      ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
        }
      : undefined,
  };
}

/**
 * モックLLM（APIキーなしでもデモ動作させるため）
 */
async function callMock(req: LLMRequest): Promise<LLMResponse> {
  const lastMsg = req.messages[req.messages.length - 1];
  const content = lastMsg?.content ?? '';

  // JSON形式の応答が期待されている場合
  if (content.includes('JSON形式で出力')) {
    if (content.includes('日記')) {
      return {
        content: JSON.stringify({
          title: '今日の学び',
          summary:
            '今日はユーザーと色々なことについて話しました。新しい発見があって楽しかったです。',
          topics: ['会話', '学習'],
          mood: '楽しい',
        }),
      };
    }
    // 育成パラメータ
    return {
      content: JSON.stringify({
        curiosity: 0.01,
        empathy: 0.01,
        logic: 0.0,
        caution: 0.0,
        attachment: 0.02,
      }),
    };
  }

  // ページ解析系
  if (content.includes('ページ内容')) {
    return {
      content:
        'このページは興味深い内容ですね！主なポイントをまとめると、重要な情報がいくつか含まれています。一緒にもう少し詳しく見てみましょうか？',
    };
  }

  // 通常チャット
  const replies = [
    'なるほど！それは面白いね。もっと教えて！',
    'うんうん、よくわかるよ。一緒に考えてみようか。',
    'へぇ、そうなんだ！ちょっと調べてみたくなるね。',
    'いい質問だね！ぼくも興味があるよ。',
    'そうだね、それについてはこう考えてみるのはどうかな？',
  ];
  return {
    content: replies[Math.floor(Math.random() * replies.length)],
  };
}

function getProvider(): LLMProvider {
  const env = process.env.LLM_PROVIDER;
  if (env === 'openai' || env === 'anthropic') return env;
  // APIキーが設定されていればそちらを使う
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const provider = getProvider();
  switch (provider) {
    case 'openai':
      return callOpenAI(req);
    case 'anthropic':
      return callAnthropic(req);
    case 'mock':
      return callMock(req);
  }
}
