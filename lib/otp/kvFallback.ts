/**
 * Vercel KV (Upstash Redis) fallback for OTP storage.
 *
 * Architecture:
 *   - Mongo is the PRIMARY store (audit trail, admin dashboard, analytics).
 *   - KV is the SECONDARY store that keeps OTP verify working even if Mongo
 *     is down, crashed, or paused. KV operations are ~5ms vs ~40ms Mongo
 *     and have built-in TTL semantics — ideal for 5-minute OTP codes.
 *
 * Write path:   saveOtp -> writes to Mongo AND KV in parallel
 * Read path:    verifyOtp -> tries Mongo first, falls back to KV on miss/error
 *               wasRecentlyVerified -> same cascade
 *
 * Graceful degradation: if KV_REST_API_URL / KV_REST_API_TOKEN env vars
 * are not set (i.e. user hasn't provisioned Vercel KV yet), every KV call
 * returns null/false without throwing. Code runs identically to pre-KV
 * behaviour — just without the extra resilience.
 *
 * Scale sanity-check: at 10 lakh visitors/month (~500K-1M leads), OTP
 * ops are ~2M/month ≈ 66K/day. Vercel KV (Upstash Redis) handles this
 * trivially — free tier is 3K/day, basic paid tier is unlimited. Per-op
 * cost ~$0.0000002, so monthly ~$5-10.
 */

import { kv } from '@vercel/kv';

const OTP_TTL_SECONDS = 5 * 60;
const VERIFIED_TTL_SECONDS = 10 * 60;

export function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

interface KvOtpPayload {
  codeHash: string;
  salt: string;
  attempts: number;
  sentVia: ('whatsapp' | 'sms')[];
  lastSenderE164?: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

interface KvVerifiedPayload {
  phoneE164: string;
  lastSenderE164?: string;
  verifiedAt: number;
}

const otpKey = (phoneE164: string) => `otp:${phoneE164}`;
const verifiedKey = (phoneE164: string) => `otp:verified:${phoneE164}`;

/**
 * Mirror a freshly-generated OTP record to KV so verify can work even if
 * Mongo is down. TTL matches the 5-min validity window — Redis expires
 * the key automatically, no cleanup required.
 */
export async function kvSaveOtp(
  phoneE164: string,
  payload: KvOtpPayload,
): Promise<boolean> {
  if (!hasKv()) return false;
  try {
    await kv.set(otpKey(phoneE164), payload, { ex: OTP_TTL_SECONDS });
    return true;
  } catch (err) {
    console.warn('[otp/kv] save failed:', (err as Error).message);
    return false;
  }
}

/**
 * Read the most recent OTP record for this phone from KV. Used as a
 * fallback when Mongo verifyOtp returns not_found or db_error.
 */
export async function kvGetOtp(phoneE164: string): Promise<KvOtpPayload | null> {
  if (!hasKv()) return null;
  try {
    const v = await kv.get<KvOtpPayload>(otpKey(phoneE164));
    return v ?? null;
  } catch (err) {
    console.warn('[otp/kv] get failed:', (err as Error).message);
    return null;
  }
}

/**
 * Increment the attempts counter on a KV OTP record. Mirrors Mongo's
 * rate-limit-on-wrong-guess behaviour so brute force is bounded across
 * both stores.
 */
export async function kvIncrementAttempts(phoneE164: string): Promise<void> {
  if (!hasKv()) return;
  try {
    const existing = await kv.get<KvOtpPayload>(otpKey(phoneE164));
    if (!existing) return;
    const ttlSec = Math.max(
      1,
      Math.ceil((existing.expiresAt - Date.now()) / 1000),
    );
    await kv.set(
      otpKey(phoneE164),
      { ...existing, attempts: existing.attempts + 1 },
      { ex: ttlSec },
    );
  } catch (err) {
    console.warn('[otp/kv] incrementAttempts failed:', (err as Error).message);
  }
}

/**
 * Mark a phone as verified in KV with a 10-min TTL. The webhook uses this
 * as a gate before pushing leads to Zoho — "was this user's phone actually
 * OTP-verified recently?"
 */
export async function kvMarkVerified(
  phoneE164: string,
  lastSenderE164?: string,
): Promise<boolean> {
  if (!hasKv()) return false;
  try {
    await kv.set(
      verifiedKey(phoneE164),
      {
        phoneE164,
        lastSenderE164,
        verifiedAt: Date.now(),
      } as KvVerifiedPayload,
      { ex: VERIFIED_TTL_SECONDS },
    );
    // Also delete the OTP record so it can't be verified twice.
    await kv.del(otpKey(phoneE164));
    return true;
  } catch (err) {
    console.warn('[otp/kv] markVerified failed:', (err as Error).message);
    return false;
  }
}

export async function kvWasRecentlyVerified(phoneE164: string): Promise<boolean> {
  if (!hasKv()) return false;
  try {
    const v = await kv.get<KvVerifiedPayload>(verifiedKey(phoneE164));
    return !!v;
  } catch (err) {
    console.warn('[otp/kv] wasRecentlyVerified failed:', (err as Error).message);
    return false;
  }
}

export async function kvGetLastSender(phoneE164: string): Promise<string | null> {
  if (!hasKv()) return null;
  try {
    const v = await kv.get<KvVerifiedPayload>(verifiedKey(phoneE164));
    return v?.lastSenderE164 ?? null;
  } catch {
    return null;
  }
}
