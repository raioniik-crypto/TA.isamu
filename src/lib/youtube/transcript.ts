/**
 * YouTube動画の字幕（transcript）を取得する
 *
 * 手順:
 * 1. Primary: innertube API (/youtubei/v1/player) で captionTracks を取得
 * 2. Fallback: YouTube HTML からブラケットカウントで captionTracks JSON を抽出
 * 3. 取得した字幕URLから XML を fetch → プレーンテキストに変換
 *
 * ASR（自動生成字幕）も候補に含め、手動字幕を優先する
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 字幕取得の失敗理由 */
export type TranscriptError = 'no_captions' | 'fetch_failed';

/** 字幕取得の結果 */
export type TranscriptResult =
  | { ok: true; text: string }
  | { ok: false; error: TranscriptError };

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" = 自動生成
  name?: { simpleText?: string };
}

/**
 * YouTube動画の字幕テキストを取得する
 * 成功時は { ok: true, text } 、失敗時は { ok: false, error } を返す
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  // --- Primary: innertube API ---
  const innertubeResult = await fetchCaptionTracksViaInnertube(videoId);
  if (innertubeResult) {
    const url = pickBestCaptionUrl(innertubeResult);
    if (!url) {
      console.log(`[transcript] innertube: no suitable caption track for ${videoId}`);
      return { ok: false, error: 'no_captions' };
    }
    const text = await fetchAndParseTranscript(url);
    if (text) return { ok: true, text };
    console.warn(`[transcript] innertube: caption URL found but XML fetch failed for ${videoId}`);
    // caption URL はあるが XML 取得に失敗 → fallback へ
  }

  // --- Fallback: HTML scraping ---
  console.log(`[transcript] falling back to HTML scraping for ${videoId}`);
  const htmlResult = await fetchCaptionTracksViaHtml(videoId);
  if (htmlResult) {
    const url = pickBestCaptionUrl(htmlResult);
    if (!url) {
      console.log(`[transcript] html: no suitable caption track for ${videoId}`);
      return { ok: false, error: 'no_captions' };
    }
    const text = await fetchAndParseTranscript(url);
    if (text) return { ok: true, text };
    console.warn(`[transcript] html: caption URL found but XML fetch failed for ${videoId}`);
  }

  // 両方失敗
  console.error(`[transcript] all methods failed for ${videoId}`);
  return { ok: false, error: 'fetch_failed' };
}

// ─── 方法1: innertube API ──────────────────────────────

async function fetchCaptionTracksViaInnertube(
  videoId: string,
): Promise<CaptionTrack[] | null> {
  try {
    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              hl: 'ja',
              gl: 'JP',
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
            },
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) {
      console.warn(`[transcript] innertube API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const tracks: CaptionTrack[] | undefined =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) {
      return null;
    }

    return tracks;
  } catch (e) {
    console.warn('[transcript] innertube API error:', e);
    return null;
  }
}

// ─── 方法2: HTML scraping (bracket-counting) ───────────

async function fetchCaptionTracksViaHtml(
  videoId: string,
): Promise<CaptionTrack[] | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    return extractCaptionTracksFromHtml(html);
  } catch {
    return null;
  }
}

/**
 * HTML内の "captionTracks":[...] をブラケットカウントで正確に抽出する
 * 正規表現の .*? では入れ子の ] で途切れてしまう問題を回避
 */
function extractCaptionTracksFromHtml(html: string): CaptionTrack[] | null {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  const arrayStart = html.indexOf('[', idx + marker.length);
  if (arrayStart === -1) return null;

  // ブラケットカウントで配列末尾を特定
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
    // 文字列内のブラケットをスキップ
    if (ch === '"') {
      i++;
      while (i < html.length && html[i] !== '"') {
        if (html[i] === '\\') i++; // エスケープをスキップ
        i++;
      }
    }
  }

  if (arrayEnd === -1) return null;

  try {
    const json = html.slice(arrayStart, arrayEnd + 1);
    const tracks: CaptionTrack[] = JSON.parse(json);
    return tracks.length > 0 ? tracks : null;
  } catch {
    return null;
  }
}

// ─── 字幕トラック選択 ──────────────────────────────────

/**
 * 最適な字幕トラックのURLを選択する
 * 優先順:
 *   1. 日本語 手動字幕
 *   2. 日本語 ASR（自動生成）
 *   3. 英語 手動字幕
 *   4. 英語 ASR
 *   5. その他の手動字幕
 *   6. その他のASR
 */
function pickBestCaptionUrl(tracks: CaptionTrack[]): string | null {
  if (tracks.length === 0) return null;

  const isAsr = (t: CaptionTrack) => t.kind === 'asr';

  // 日本語 (手動 → ASR)
  const jaManual = tracks.find((t) => t.languageCode === 'ja' && !isAsr(t));
  if (jaManual) return jaManual.baseUrl;
  const jaAsr = tracks.find((t) => t.languageCode === 'ja' && isAsr(t));
  if (jaAsr) return jaAsr.baseUrl;

  // 英語 (手動 → ASR)
  const enManual = tracks.find((t) => t.languageCode === 'en' && !isAsr(t));
  if (enManual) return enManual.baseUrl;
  const enAsr = tracks.find((t) => t.languageCode === 'en' && isAsr(t));
  if (enAsr) return enAsr.baseUrl;

  // その他 (手動 → ASR)
  const anyManual = tracks.find((t) => !isAsr(t));
  if (anyManual) return anyManual.baseUrl;

  // ASR のみ
  return tracks[0].baseUrl;
}

// ─── 字幕XML取得 & パース ──────────────────────────────

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
