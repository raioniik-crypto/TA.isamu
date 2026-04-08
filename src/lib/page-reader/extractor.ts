/**
 * URLからページ本文を取得する
 * サーバーサイドで実行し、HTMLからテキストを抽出
 */
export async function extractPageContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TAIsamu/1.0)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status}`);
  }

  const html = await res.text();
  return htmlToText(html);
}

/**
 * HTMLからテキストを抽出する簡易パーサー
 * 将来的にはreadabilityライブラリに置き換え可能
 */
function htmlToText(html: string): string {
  // scriptとstyleタグを除去
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // HTMLタグを除去
  text = text.replace(/<[^>]+>/g, ' ');

  // HTMLエンティティをデコード
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 空白の正規化
  text = text.replace(/\s+/g, ' ').trim();

  // 長すぎる場合は切り詰め（LLMコンテキスト制限考慮）
  return text.slice(0, 6000);
}
