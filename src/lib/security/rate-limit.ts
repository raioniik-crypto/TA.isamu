/**
 * インメモリ固定ウィンドウ レート制限
 *
 * 本番のスケールアウト環境では Redis 等に置き換えてください。
 * Vercel Serverless / 単一プロセス dev ではこのまま使えます。
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// 期限切れエントリの定期クリーンアップ
if (typeof globalThis !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k);
    }
  }, 60_000);
  // Node.js: unref で プロセス終了を阻害しない
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
  };
}
