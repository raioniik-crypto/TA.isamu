/**
 * YouTube動画の字幕（transcript）を取得する
 *
 * 仕組み:
 * 1. YouTube動画ページのHTMLを取得
 * 2. ytInitialPlayerResponse 内の captionTracks を抽出
 * 3. 字幕XMLをfetchしてプレーンテキストに変換
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * YouTube動画の字幕テキストを取得する
 * @returns 字幕テキスト or null（字幕がない場合）
 */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // 1. 動画ページを取得
    const html = await fetchVideoPage(videoId);
    if (!html) return null;

    // 2. captionTracks を抽出
    const captionUrl = extractCaptionUrl(html);
    if (!captionUrl) return null;

    // 3. 字幕XMLを取得してテキストに変換
    const transcript = await fetchAndParseTranscript(captionUrl);
    return transcript;
  } catch (e) {
    console.error('YouTube transcript fetch failed:', e);
    return null;
  }
}

async function fetchVideoPage(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * HTMLから字幕トラックのURLを抽出する
 * 優先順: 日本語(ja) → 英語(en) → 最初に見つかったもの
 */
function extractCaptionUrl(html: string): string | null {
  // "captionTracks":[...] を探す
  const match = html.match(/"captionTracks"\s*:\s*(\[.*?\])/);
  if (!match) return null;

  try {
    const tracks: { baseUrl: string; languageCode: string }[] = JSON.parse(
      match[1],
    );
    if (tracks.length === 0) return null;

    // 日本語 → 英語 → 最初のトラック
    const ja = tracks.find((t) => t.languageCode === 'ja');
    if (ja) return ja.baseUrl;

    const en = tracks.find((t) => t.languageCode === 'en');
    if (en) return en.baseUrl;

    return tracks[0].baseUrl;
  } catch {
    return null;
  }
}

async function fetchAndParseTranscript(captionUrl: string): Promise<string | null> {
  try {
    const res = await fetch(captionUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    return parseTranscriptXml(xml);
  } catch {
    return null;
  }
}

/**
 * YouTube字幕XMLをプレーンテキストに変換する
 * <text start="0.0" dur="3.5">こんにちは</text> → "こんにちは"
 */
function parseTranscriptXml(xml: string): string | null {
  const segments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m;

  while ((m = regex.exec(xml)) !== null) {
    let text = m[1];
    // HTMLエンティティをデコード
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
    if (text) segments.push(text);
  }

  if (segments.length === 0) return null;

  const full = segments.join(' ');

  // 長すぎる場合は文の切れ目で切り詰め
  if (full.length > 6000) {
    const truncated = full.slice(0, 6000);
    const lastPeriod = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('.'),
    );
    return lastPeriod > 4000
      ? truncated.slice(0, lastPeriod + 1) + '\n\n（以下省略）'
      : truncated + '...';
  }

  return full;
}
