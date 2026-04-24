/**
 * In-memory rate limiter — token-bucket style, per-lambda-instance.
 *
 * This is NOT distributed. Vercel can spin up multiple lambda instances
 * across regions, and cold starts reset the bucket. What this buys us is
 * a cheap first line of defence against single-client abuse (e.g. a
 * browser firing 100 OTP send requests in 10 seconds). For real
 * distributed rate limiting we'd plug in Vercel KV / Upstash Redis.
 *
 * Usage:
 *   const { allowed, remaining } = checkRateLimit('otp:send', clientKey, {
 *     maxRequests: 5,
 *     windowMs: 60_000,
 *   });
 *   if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Bucket>();

// Cap map size so a single lambda can't leak memory from adversarial
// client-id spray. 10k distinct keys per instance ≈ 2 MB retained.
const MAX_BUCKETS = 10_000;

interface Options {
  /** Max requests allowed in the window. */
  maxRequests: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
  /** Requests used in the current window. */
  used: number;
  /** Window cap. */
  limit: number;
}

export function checkRateLimit(
  scope: string,
  clientKey: string,
  opts: Options,
): RateLimitResult {
  const now = Date.now();
  const key = `${scope}::${clientKey}`;
  const existing = BUCKETS.get(key);

  // GC expired buckets opportunistically on every call — amortised O(1).
  if (BUCKETS.size > MAX_BUCKETS) {
    for (const [k, b] of BUCKETS) {
      if (b.resetAt < now) BUCKETS.delete(k);
      if (BUCKETS.size <= MAX_BUCKETS / 2) break;
    }
  }

  if (!existing || existing.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    BUCKETS.set(key, fresh);
    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetAt: fresh.resetAt,
      used: 1,
      limit: opts.maxRequests,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= opts.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, opts.maxRequests - existing.count),
    resetAt: existing.resetAt,
    used: existing.count,
    limit: opts.maxRequests,
  };
}

/** Stable client key for a request — IP + session fingerprint. */
export function getClientKey(req: Request | { headers: Headers }): string {
  const h = req.headers;
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown-ip';
  // Session cookie if visitor has one (the asbl_session_id cookie is set
  // client-side but not always echoed — fall back to IP alone).
  return ip;
}

/** Headers the route should include on a 429 so clients can back off. */
export function rateLimitHeaders(r: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
    'Retry-After': String(Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000))),
  };
}
