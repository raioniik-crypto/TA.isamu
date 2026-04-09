/**
 * ページ読解エラーのユーザー向けメッセージ
 */
import { isBlockedUrl } from '@/lib/security/ssrf';

export class PageReadError extends Error {
  public readonly userMessage: string;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

/**
 * URLのバリデーション（SSRF 防御付き）
 */
function validateUrl(url: string): void {
  if (isBlockedUrl(url)) {
    // isBlockedUrl は URL パースに失敗した場合も true を返す
    let reason = 'ローカルネットワークのページは読み取れません。公開されているWebページのURLを入力してください。';
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        reason = 'httpまたはhttpsから始まるURLを入力してください。';
      }
    } catch {
      reason = 'URLの形式が正しくないようです。「https://」から始まるURLを入力してください。';
    }
    throw new PageReadError(reason);
  }
}

/**
 * URLからページ本文を取得する
 */
export async function extractPageContent(url: string): Promise<string> {
  const { text } = await extractPage(url);
  return text;
}

/**
 * URLからページのタイトルを取得する（ビューア用）
 */
export async function extractPageTitle(url: string): Promise<string> {
  const html = await fetchHtml(url);
  return extractTitleFromHtml(html);
}

/**
 * URLからページ本文とタイトルの両方を取得する
 */
export async function extractPage(url: string): Promise<{ text: string; title: string }> {
  const html = await fetchHtml(url);
  const text = htmlToText(html, url);

  if (text.length < 50) {
    throw new PageReadError(
      'ページから十分なテキストを取得できませんでした。JavaScriptで内容を表示しているページ（YouTube、Twitterなど）は読み取りが難しい場合があります。ニュース記事やブログなどを試してみてください。',
    );
  }

  const title = extractTitleFromHtml(html);
  return { text, title };
}

/**
 * HTMLを取得してバリデーション済みで返す
 */
const MAX_REDIRECTS = 5;

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en;q=0.9',
};

/**
 * リダイレクトを手動で追跡し、各ホップ先を SSRF チェック
 */
async function fetchWithRedirects(startUrl: string): Promise<Response> {
  let currentUrl = startUrl;
  for (let hop = 0; ; hop++) {
    const res = await fetch(currentUrl, {
      headers: FETCH_HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });

    if (![301, 302, 303, 307, 308].includes(res.status)) {
      return res;
    }

    const location = res.headers.get('location');
    if (!location) return res;

    const nextUrl = new URL(location, currentUrl).href;

    if (isBlockedUrl(nextUrl)) {
      throw new PageReadError(
        'リダイレクト先がブロック対象のアドレスです。安全でないURLへの転送を検出しました。',
      );
    }

    if (hop >= MAX_REDIRECTS) {
      throw new PageReadError(
        'リダイレクトが多すぎます。URLを確認してください。',
      );
    }

    currentUrl = nextUrl;
  }
}

async function fetchHtml(url: string): Promise<string> {
  validateUrl(url);

  let res: Response;
  try {
    res = await fetchWithRedirects(url);
  } catch (e) {
    if (e instanceof PageReadError) throw e;
    const isTimeout =
      e instanceof DOMException && e.name === 'TimeoutError';
    throw new PageReadError(
      isTimeout
        ? 'ページの読み込みに時間がかかりすぎました。ページが重いか、サーバーが応答していない可能性があります。'
        : 'ページに接続できませんでした。URLが正しいか、ページが公開されているか確認してください。',
      e,
    );
  }

  if (!res.ok) {
    const messages: Record<number, string> = {
      403: 'このページはアクセスが制限されています。ログインが必要なページや、外部からの読み取りを禁止しているページの可能性があります。',
      404: 'ページが見つかりませんでした。URLが正しいか確認してください。',
      429: 'アクセスが多すぎるため、しばらくしてからもう一度試してください。',
      500: 'ページのサーバーでエラーが発生しています。しばらくしてからもう一度試してください。',
    };
    throw new PageReadError(
      messages[res.status] ??
        `ページを読み取れませんでした（エラー ${res.status}）。別のページで試してみてください。`,
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new PageReadError(
      'このURLはWebページではないようです（PDF、画像など）。記事やブログなどのWebページのURLを入力してください。',
    );
  }

  return await res.text();
}

/**
 * HTMLからテキストを抽出する
 * <article> や <main> があれば優先的に抽出（セマンティック対応）
 */
function htmlToText(html: string, url?: string): string {
  // Wikipedia の場合は専用クリーニングを先に適用
  const isWiki = url ? isWikipediaUrl(url) : false;
  const cleaned = isWiki ? stripWikipediaElements(html) : html;

  // まず<article>または<main>の中身を探す
  const semanticContent = extractSemanticContent(cleaned, url);
  const target = semanticContent || cleaned;

  // 不要タグを除去
  let text = target;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // nav/aside/footer はセマンティック有無に関わらず常時除去
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // ブロック要素の前後に改行を入れ、段落を保持
  text = text.replace(/<\/?(?:p|div|br|h[1-6]|li|tr|blockquote|section)[^>]*>/gi, '\n');

  // HTMLタグを除去
  text = text.replace(/<[^>]+>/g, ' ');

  // HTMLエンティティをデコード
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));

  // 空行の正規化（段落構造は残す）
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n+/g, '\n\n');
  text = text.trim();

  // 長すぎる場合は文の切れ目で切り詰め
  if (text.length > 6000) {
    const truncated = text.slice(0, 6000);
    const lastSentence = truncated.lastIndexOf('。');
    const lastPeriod = truncated.lastIndexOf('.');
    const cutPoint = Math.max(lastSentence, lastPeriod);
    text = cutPoint > 4000
      ? truncated.slice(0, cutPoint + 1) + '\n\n（以下省略）'
      : truncated + '...';
  }

  return text;
}

/**
 * <article>または<main>タグの中身を抽出
 * 記事ページの本文を優先的に取得するため
 */
function extractSemanticContent(html: string, url?: string): string | null {
  // Wikipedia の場合は #mw-content-text を最優先
  if (url && isWikipediaUrl(url)) {
    const mwMatch = html.match(/<div[^>]+id=["']mw-content-text["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|$)/i);
    if (mwMatch && mwMatch[1].length > 200) {
      return mwMatch[1];
    }
  }

  // <article>を最優先
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && articleMatch[1].length > 200) {
    return articleMatch[1];
  }

  // 次に<main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch && mainMatch[1].length > 200) {
    return mainMatch[1];
  }

  // role="main" 属性
  const roleMatch = html.match(/<[^>]+role=["']main["'][^>]*>([\s\S]*?)<\/\w+>/i);
  if (roleMatch && roleMatch[1].length > 200) {
    return roleMatch[1];
  }

  return null;
}

/**
 * HTMLから<title>タグのテキストを抽出
 */
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return '';
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Wikipedia の URL かどうか判定
 */
function isWikipediaUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return /(?:^|\.)wikipedia\.org$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Wikipedia 固有の非本文 HTML 要素を除去
 */
function stripWikipediaElements(html: string): string {
  let result = html;

  // id ベースの除去
  const idPatterns = ['toc', 'p-lang', 'catlinks'];
  for (const id of idPatterns) {
    result = result.replace(new RegExp(`<[^>]+id=["']${id}["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi'), '');
  }

  // class ベースの除去（部分一致）
  const classPatterns = [
    'toc',
    'interlanguage-links',
    'reflist',
    'references',
    'mw-editsection',
    'navbox',
    'sisternav',
    'infobox',
    'noprint',
  ];
  for (const cls of classPatterns) {
    result = result.replace(
      new RegExp(`<[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi'),
      '',
    );
  }

  return result;
}
