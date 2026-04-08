import { NextRequest, NextResponse } from 'next/server';
import { extractPage, PageReadError } from '@/lib/page-reader/extractor';
import { fetchTranscript } from '@/lib/youtube/transcript';

export async function POST(req: NextRequest) {
  try {
    const { url }: { url: string } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URLを入力してください。' }, { status: 400 });
    }

    // YouTube判定
    const ytId = extractYouTubeId(url);
    if (ytId) {
      // 字幕の取得を試みる
      const transcript = await fetchTranscript(ytId);

      return NextResponse.json({
        url,
        title: 'YouTube動画',
        type: 'youtube' as const,
        youtubeId: ytId,
        body: transcript ?? undefined,
      });
    }

    // 通常ページ: HTML取得→テキスト＋タイトル抽出（1回のfetchで両方取得）
    const { text, title } = await extractPage(url);

    return NextResponse.json({
      url,
      title: title || url,
      type: 'article' as const,
      body: text,
    });
  } catch (error) {
    console.error('Extract API error:', error);

    if (error instanceof PageReadError) {
      return NextResponse.json({ error: error.userMessage }, { status: 422 });
    }

    return NextResponse.json(
      { error: 'ページの読み取りに失敗しました。' },
      { status: 500 },
    );
  }
}

/**
 * YouTube URLからvideo IDを抽出
 */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      u.pathname === '/watch'
    ) {
      return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null;
    }
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      u.pathname.startsWith('/embed/')
    ) {
      return u.pathname.split('/')[2] || null;
    }
  } catch {
    // invalid URL
  }
  return null;
}
