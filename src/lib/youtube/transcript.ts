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
export type TranscriptError =
  | 'no_captions'      // 動画に字幕が設定されていない
  | 'fetch_failed'     // ネットワーク等の取得失敗
  | 'blocked'          // YouTube側にブロック/拒否された
  | 'parsing_failed'   // レスポンスのパースに失敗
  | 'unknown';         // 不明な失敗

/** 字幕取得の結果 */
export type TranscriptResult =
  | { ok: true; text: string }
  | { ok: false; error: TranscriptError; detail: string };

/** 診断ログの1エントリ */
export interface DiagnosticEntry {
  method: 'innertube' | 'html_scraping';
  step: string;
  status?: number;
  ok: boolean;
  detail: string;
  responseSnippet?: string;
}

/** 診断ログ付き結果（デバッグ用） */
export interface TranscriptDiagnostics {
  videoId: string;
  result: TranscriptResult;
  logs: DiagnosticEntry[];
  timestamp: string;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" = 自動生成
  name?: { simpleText?: string };
}

/**
 * YouTube動画の字幕テキストを取得する（診断ログ付き）
 */
export async function fetchTranscriptWithDiagnostics(
  videoId: string,
): Promise<TranscriptDiagnostics> {
  const logs: DiagnosticEntry[] = [];
  const log = (entry: DiagnosticEntry) => {
    logs.push(entry);
    const prefix = `[transcript][${entry.method}]`;
    const statusStr = entry.status ? ` (HTTP ${entry.status})` : '';
    console.log(`${prefix} ${entry.step}${statusStr}: ${entry.ok ? 'OK' : 'FAIL'} — ${entry.detail}`);
    if (entry.responseSnippet) {
      console.log(`${prefix} response snippet: ${entry.responseSnippet}`);
    }
  };

  // --- Primary: innertube API ---
  const innertubeResult = await fetchCaptionTracksViaInnertube(videoId, log);
  if (innertubeResult.tracks) {
    log({
      method: 'innertube',
      step: 'caption_tracks_found',
      ok: true,
      detail: `Found ${innertubeResult.tracks.length} track(s): ${innertubeResult.tracks.map((t) => `${t.languageCode}${t.kind === 'asr' ? '(asr)' : ''}`).join(', ')}`,
    });

    const url = pickBestCaptionUrl(innertubeResult.tracks);
    if (!url) {
      log({ method: 'innertube', step: 'pick_caption', ok: false, detail: 'No suitable caption track in list' });
      const result: TranscriptResult = { ok: false, error: 'no_captions', detail: 'innertube returned tracks but none suitable' };
      return { videoId, result, logs, timestamp: new Date().toISOString() };
    }

    log({ method: 'innertube', step: 'pick_caption', ok: true, detail: `Selected URL: ${url.slice(0, 120)}...` });
    const text = await fetchAndParseTranscript(url, 'innertube', log);
    if (text) {
      const result: TranscriptResult = { ok: true, text };
      return { videoId, result, logs, timestamp: new Date().toISOString() };
    }
    // XML取得失敗 → fallback
  } else if (innertubeResult.noCaptions) {
    // innertube は成功したがcaptionTracksが空 → 字幕なし確定
    log({ method: 'innertube', step: 'no_captions_confirmed', ok: true, detail: 'API response has no captionTracks — video has no captions' });
    const result: TranscriptResult = { ok: false, error: 'no_captions', detail: 'innertube confirmed: no caption tracks' };
    return { videoId, result, logs, timestamp: new Date().toISOString() };
  }

  // --- Fallback: HTML scraping ---
  log({ method: 'html_scraping', step: 'start_fallback', ok: true, detail: 'innertube failed or XML fetch failed, trying HTML scraping' });
  const htmlResult = await fetchCaptionTracksViaHtml(videoId, log);
  if (htmlResult) {
    log({
      method: 'html_scraping',
      step: 'caption_tracks_found',
      ok: true,
      detail: `Found ${htmlResult.length} track(s): ${htmlResult.map((t) => `${t.languageCode}${t.kind === 'asr' ? '(asr)' : ''}`).join(', ')}`,
    });

    const url = pickBestCaptionUrl(htmlResult);
    if (!url) {
      log({ method: 'html_scraping', step: 'pick_caption', ok: false, detail: 'No suitable caption track in list' });
      const result: TranscriptResult = { ok: false, error: 'no_captions', detail: 'html scraping found tracks but none suitable' };
      return { videoId, result, logs, timestamp: new Date().toISOString() };
    }

    log({ method: 'html_scraping', step: 'pick_caption', ok: true, detail: `Selected URL: ${url.slice(0, 120)}...` });
    const text = await fetchAndParseTranscript(url, 'html_scraping', log);
    if (text) {
      const result: TranscriptResult = { ok: true, text };
      return { videoId, result, logs, timestamp: new Date().toISOString() };
    }
  }

  // 両方失敗 — 最後のログから原因を推測
  const lastBlockedLog = logs.find((l) => !l.ok && l.detail.includes('blocked'));
  const lastParsingLog = logs.find((l) => !l.ok && l.step.includes('parse'));
  let error: TranscriptError = 'fetch_failed';
  let detail = 'All methods exhausted';
  if (lastBlockedLog) {
    error = 'blocked';
    detail = lastBlockedLog.detail;
  } else if (lastParsingLog) {
    error = 'parsing_failed';
    detail = lastParsingLog.detail;
  }

  console.error(`[transcript] all methods failed for ${videoId}: ${error} — ${detail}`);
  const result: TranscriptResult = { ok: false, error, detail };
  return { videoId, result, logs, timestamp: new Date().toISOString() };
}

/**
 * 既存の簡易インターフェース（extract route 用）
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const diagnostics = await fetchTranscriptWithDiagnostics(videoId);
  return diagnostics.result;
}

// ─── 方法1: innertube API ──────────────────────────────

interface InnertubeResult {
  tracks: CaptionTrack[] | null;
  noCaptions: boolean; // APIは成功したが字幕トラックが空
}

async function fetchCaptionTracksViaInnertube(
  videoId: string,
  log: (entry: DiagnosticEntry) => void,
): Promise<InnertubeResult> {
  const fail = { tracks: null, noCaptions: false };

  try {
    log({ method: 'innertube', step: 'fetch_start', ok: true, detail: `POST /youtubei/v1/player for ${videoId}` });

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

    const bodyText = await res.text();

    if (!res.ok) {
      const isBlocked = res.status === 403 || res.status === 429;
      log({
        method: 'innertube',
        step: 'fetch_response',
        status: res.status,
        ok: false,
        detail: isBlocked
          ? `blocked by YouTube (HTTP ${res.status})`
          : `HTTP ${res.status} error`,
        responseSnippet: bodyText.slice(0, 300),
      });
      return fail;
    }

    log({
      method: 'innertube',
      step: 'fetch_response',
      status: res.status,
      ok: true,
      detail: `Response OK, body length: ${bodyText.length}`,
    });

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(bodyText);
    } catch {
      log({
        method: 'innertube',
        step: 'parse_json',
        ok: false,
        detail: 'Failed to parse innertube response as JSON',
        responseSnippet: bodyText.slice(0, 300),
      });
      return fail;
    }

    // playabilityStatus をチェック（動画がブロックされていないか）
    const playability = data?.playabilityStatus as Record<string, unknown> | undefined;
    if (playability) {
      const playStatus = playability.status as string | undefined;
      log({
        method: 'innertube',
        step: 'playability_check',
        ok: playStatus === 'OK',
        detail: `playabilityStatus.status = "${playStatus || 'undefined'}"${playability.reason ? ` — reason: ${playability.reason}` : ''}`,
      });
      if (playStatus !== 'OK') {
        return fail;
      }
    }

    // captions を探す
    const captions = data?.captions as Record<string, unknown> | undefined;
    if (!captions) {
      log({
        method: 'innertube',
        step: 'find_captions',
        ok: false,
        detail: 'No "captions" key in response — video likely has no captions',
      });
      return { tracks: null, noCaptions: true };
    }

    const renderer = captions.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
    const tracks = renderer?.captionTracks as CaptionTrack[] | undefined;

    if (!tracks || tracks.length === 0) {
      log({
        method: 'innertube',
        step: 'find_caption_tracks',
        ok: false,
        detail: 'captionTracks is empty or missing in renderer',
      });
      return { tracks: null, noCaptions: true };
    }

    log({
      method: 'innertube',
      step: 'find_caption_tracks',
      ok: true,
      detail: `${tracks.length} caption track(s) found`,
    });

    return { tracks, noCaptions: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isTimeout = message.includes('timeout') || message.includes('abort');
    log({
      method: 'innertube',
      step: 'fetch_error',
      ok: false,
      detail: `${isTimeout ? 'Timeout/abort' : 'Network error'}: ${message}`,
    });
    return fail;
  }
}

// ─── 方法2: HTML scraping (bracket-counting) ───────────

async function fetchCaptionTracksViaHtml(
  videoId: string,
  log: (entry: DiagnosticEntry) => void,
): Promise<CaptionTrack[] | null> {
  try {
    log({ method: 'html_scraping', step: 'fetch_start', ok: true, detail: `GET /watch?v=${videoId}` });

    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => '(read failed)');
      const isBlocked = res.status === 403 || res.status === 429;
      log({
        method: 'html_scraping',
        step: 'fetch_response',
        status: res.status,
        ok: false,
        detail: isBlocked
          ? `blocked by YouTube (HTTP ${res.status})`
          : `HTTP ${res.status} error`,
        responseSnippet: bodySnippet,
      });
      return null;
    }

    const html = await res.text();
    log({
      method: 'html_scraping',
      step: 'fetch_response',
      status: res.status,
      ok: true,
      detail: `Response OK, HTML length: ${html.length}`,
    });

    // consent ページ検出
    if (html.includes('consent.youtube.com') || html.includes('CONSENT')) {
      log({
        method: 'html_scraping',
        step: 'consent_check',
        ok: false,
        detail: 'YouTube returned a consent/cookie wall page instead of video page',
        responseSnippet: html.slice(0, 300),
      });
      return null;
    }

    // ytInitialPlayerResponse 存在チェック
    const hasPlayerResponse = html.includes('ytInitialPlayerResponse');
    log({
      method: 'html_scraping',
      step: 'player_response_check',
      ok: hasPlayerResponse,
      detail: hasPlayerResponse
        ? 'ytInitialPlayerResponse found in HTML'
        : 'ytInitialPlayerResponse NOT found — page may be a shell/consent page',
    });

    const tracks = extractCaptionTracksFromHtml(html);
    if (!tracks) {
      log({
        method: 'html_scraping',
        step: 'extract_caption_tracks',
        ok: false,
        detail: '"captionTracks" not found or parsing failed',
      });
      return null;
    }

    log({
      method: 'html_scraping',
      step: 'extract_caption_tracks',
      ok: true,
      detail: `Extracted ${tracks.length} track(s)`,
    });

    return tracks;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log({
      method: 'html_scraping',
      step: 'fetch_error',
      ok: false,
      detail: `Error: ${message}`,
    });
    return null;
  }
}

/**
 * HTML内の "captionTracks":[...] をブラケットカウントで正確に抽出する
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

async function fetchAndParseTranscript(
  captionUrl: string,
  method: 'innertube' | 'html_scraping',
  log: (entry: DiagnosticEntry) => void,
): Promise<string | null> {
  try {
    log({ method, step: 'xml_fetch_start', ok: true, detail: `Fetching caption XML: ${captionUrl.slice(0, 120)}...` });

    const res = await fetch(captionUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => '(read failed)');
      log({
        method,
        step: 'xml_fetch_response',
        status: res.status,
        ok: false,
        detail: `HTTP ${res.status}`,
        responseSnippet: bodySnippet,
      });
      return null;
    }

    const xml = await res.text();
    log({
      method,
      step: 'xml_fetch_response',
      status: res.status,
      ok: true,
      detail: `XML length: ${xml.length}`,
      responseSnippet: xml.slice(0, 200),
    });

    const text = parseTranscriptXml(xml);
    if (!text) {
      log({ method, step: 'xml_parse', ok: false, detail: 'parseTranscriptXml returned null — no <text> elements found' });
      return null;
    }

    log({ method, step: 'xml_parse', ok: true, detail: `Parsed transcript: ${text.length} chars` });
    return text;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log({ method, step: 'xml_fetch_error', ok: false, detail: `Error: ${message}` });
    return null;
  }
}

/**
 * YouTube字幕XMLをプレーンテキストに変換する
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
