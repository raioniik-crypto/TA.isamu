/**
 * API ルート共通ガード
 *
 * 1. IP ベースレート制限
 * 2. POST リクエストの Origin チェック（CSRF 防御）
 *
 * 使い方:
 *   const blocked = apiGuard(req, { maxRequests: 20 });
 *   if (blocked) return blocked;
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from './rate-limit';

interface GuardOptions {
  /** 1ウィンドウ内の最大リクエスト数 (default 30) */
  maxRequests?: number;
  /** ウィンドウ幅 ms (default 60 000 = 1分) */
  windowMs?: number;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function apiGuard(
  req: NextRequest,
  options: GuardOptions = {},
): NextResponse | null {
  const { maxRequests = 30, windowMs = 60_000 } = options;

  // ── Rate limit ──
  const ip = clientIp(req);
  const rl = checkRateLimit(`api:${ip}`, maxRequests, windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらく待ってからもう一度試してください。' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // ── Origin check (production POST only) ──
  if (req.method === 'POST' && process.env.NODE_ENV === 'production') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      const allowed = [`https://${host}`, `http://${host}`];
      if (!allowed.includes(origin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  return null; // すべて通過
}
