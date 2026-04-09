/**
 * SSRF 防御: 包括的 URL バリデーション
 *
 * - RFC1918 / RFC6598 全プライベート CIDR
 * - IPv6 ループバック・ULA・リンクローカル・IPv4-mapped
 * - クラウドメタデータエンドポイント
 * - URL 内の認証情報
 */

const BLOCKED_IPV4_CIDRS: [string, number][] = [
  ['127.0.0.0', 8],     // Loopback
  ['10.0.0.0', 8],      // RFC1918 Class A
  ['172.16.0.0', 12],   // RFC1918 Class B
  ['192.168.0.0', 16],  // RFC1918 Class C
  ['169.254.0.0', 16],  // Link-local
  ['0.0.0.0', 8],       // Current network
  ['100.64.0.0', 10],   // Carrier-grade NAT (RFC6598)
  ['192.0.0.0', 24],    // IETF Protocol Assignments
  ['192.0.2.0', 24],    // Documentation TEST-NET-1
  ['198.18.0.0', 15],   // Benchmarking (RFC2544)
  ['198.51.100.0', 24], // Documentation TEST-NET-2
  ['203.0.113.0', 24],  // Documentation TEST-NET-3
  ['224.0.0.0', 4],     // Multicast
  ['240.0.0.0', 4],     // Reserved
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google.internal.',
]);

function ipv4ToUint32(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255 || String(v) !== p) return null;
    n = (n * 256 + v) >>> 0;
  }
  return n;
}

function isBlockedIPv4(host: string): boolean {
  const ip = ipv4ToUint32(host);
  if (ip === null) return false;

  for (const [base, bits] of BLOCKED_IPV4_CIDRS) {
    const baseIp = ipv4ToUint32(base)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    if ((ip & mask) === (baseIp & mask)) return true;
  }
  return false;
}

/**
 * IPv4-mapped IPv6 の末尾から dotted IPv4 文字列を抽出する。
 * dotted 形式 (127.0.0.1) と hex-hextet 形式 (7f00:1) の両方に対応。
 * パース不能な場合は null を返す。
 */
function extractMappedIPv4(tail: string): string | null {
  // Dotted format: "127.0.0.1"
  if (tail.includes('.')) {
    return ipv4ToUint32(tail) !== null ? tail : null;
  }
  // Hex-hextet format: "7f00:1" or "7f00:0001"
  const parts = tail.split(':');
  if (parts.length !== 2) return null;
  // Strict hex validation — prevent parseInt partial parsing (e.g. "7fzz" → 0x7f)
  const HEX = /^[0-9a-f]{1,4}$/i;
  if (!HEX.test(parts[0]) || !HEX.test(parts[1])) return null;
  const hi = parseInt(parts[0], 16);
  const lo = parseInt(parts[1], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isBlockedIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  // IPv6 addresses always contain ':'. Without it, the host is a domain name
  // and must not enter prefix matching (e.g. fcbayern.com, fda.gov).
  if (!h.includes(':')) return false;
  if (h === '::1') return true;
  // ULA fc00::/7
  if (h.startsWith('fc') || h.startsWith('fd')) return true;
  // Link-local fe80::/10
  if (/^fe[89ab]/.test(h)) return true;
  // IPv4-mapped ::ffff:x.x.x.x or ::ffff:HHHH:HHHH
  if (h.startsWith('::ffff:')) {
    const ipv4 = extractMappedIPv4(h.slice(7));
    // Fail-closed: malformed mapped addresses are blocked
    if (ipv4 === null) return true;
    return isBlockedIPv4(ipv4);
  }
  return false;
}

/**
 * URL が SSRF 攻撃に使われうるかチェック。
 * true = ブロック対象。
 */
export function isBlockedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return true;

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (isBlockedIPv4(host)) return true;
  if (isBlockedIPv6(host)) return true;

  // URL 内に認証情報を含むものは拒否
  if (parsed.username || parsed.password) return true;

  return false;
}
