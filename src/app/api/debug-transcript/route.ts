import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscriptWithDiagnostics } from '@/lib/youtube/transcript';
import { apiGuard } from '@/lib/security/api-guard';

/**
 * YouTube字幕取得のデバッグエンドポイント
 *
 * GET /api/debug-transcript?v=VIDEO_ID
 *
 * 診断ログ付きで字幕取得を実行し、各ステップの結果を返す
 * 本番環境では無効化
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const blocked = apiGuard(req, { maxRequests: 10 });
  if (blocked) return blocked;

  const videoId = req.nextUrl.searchParams.get('v');

  if (!videoId) {
    return NextResponse.json(
      { error: 'パラメータ v（動画ID）を指定してください。例: /api/debug-transcript?v=dQw4w9WgXcQ' },
      { status: 400 },
    );
  }

  // 不正なID形式をチェック
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json(
      { error: `不正な動画ID形式: "${videoId}" — 11文字の英数字である必要があります` },
      { status: 400 },
    );
  }

  console.log(`[debug-transcript] Starting diagnostics for video: ${videoId}`);
  const diagnostics = await fetchTranscriptWithDiagnostics(videoId);
  console.log(`[debug-transcript] Done: ${diagnostics.result.ok ? 'SUCCESS' : `FAIL (${diagnostics.result.error})`}`);

  return NextResponse.json(diagnostics);
}
