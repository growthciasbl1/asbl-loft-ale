import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from '@/lib/db/mongo';
import {
  kvSaveOtp,
  kvGetOtp,
  kvIncrementAttempts,
  kvMarkVerified,
  kvWasRecentlyVerified,
  kvGetLastSender,
  hasKv,
} from './kvFallback';

const OTP_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

export interface OtpDoc {
  _id?: ObjectId;
  phoneE164: string; // normalised to country-code-digits, no +
  codeHash: string; // sha256 of OTP + salt
  salt: string;
  attempts: number;
  verified: boolean;
  sentVia: ('whatsapp' | 'sms')[]; // which channels were used
  lastSenderE164?: string; // which business number sent WhatsApp (for debugging)
  createdAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;

  // Audit context — filled by /api/otp/send from LeadGate
  reason?: string; // e.g. "brochure download", "site visit booking", "share price sheet"
  form?: string; // e.g. "lead_gate", "share_request_tile", "visit_tile"
  name?: string; // captured at send time (for readability in admin dashboard)
  visitorId?: string; // browser-scoped id — joins to visitors collection
  campaign?: string; // UTM campaign bucket
  artifactKind?: string; // which tile was the gate on (price / visit / share_request / etc.)
}

function hashOtp(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
}

export function generateOtp(): string {
  // 6-digit numeric. crypto.randomInt ensures non-biased.
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

export async function saveOtp(input: {
  phoneE164: string;
  otp: string;
  sentVia: ('whatsapp' | 'sms')[];
  lastSenderE164?: string;
  // audit context
  reason?: string;
  form?: string;
  name?: string;
  visitorId?: string;
  campaign?: string;
  artifactKind?: string;
}): Promise<boolean> {
  // Dual-write: Mongo primary (audit trail, dashboard) + KV secondary
  // (survives Mongo outages). Both get the same salt + hash so verifyOtp
  // can find the OTP in either store. We consider the save successful if
  // EITHER layer persisted — that way a Mongo-down scenario still keeps
  // the OTP flow alive via KV.
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashOtp(input.otp, salt);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);

  // Fire both stores in parallel.
  const [mongoOk, kvOk] = await Promise.all([
    saveOtpToMongo({ ...input, salt, codeHash, now, expiresAt }),
    kvSaveOtp(input.phoneE164, {
      codeHash,
      salt,
      attempts: 0,
      sentVia: input.sentVia,
      lastSenderE164: input.lastSenderE164,
      createdAt: now.getTime(),
      expiresAt: expiresAt.getTime(),
    }),
  ]);

  if (!mongoOk && !kvOk) {
    console.error('[otp/saveOtp] BOTH Mongo and KV failed');
    return false;
  }
  if (!mongoOk) console.warn('[otp/saveOtp] Mongo leg failed, KV backup saved');
  if (!kvOk && hasKv()) console.warn('[otp/saveOtp] KV leg failed, Mongo primary saved');
  return true;
}

/**
 * Internal — Mongo-only persistence. Extracted from saveOtp so the dual-
 * write path stays readable. Returns false on any Mongo error.
 */
async function saveOtpToMongo(input: {
  phoneE164: string;
  sentVia: ('whatsapp' | 'sms')[];
  lastSenderE164?: string;
  reason?: string;
  form?: string;
  name?: string;
  visitorId?: string;
  campaign?: string;
  artifactKind?: string;
  salt: string;
  codeHash: string;
  now: Date;
  expiresAt: Date;
}): Promise<boolean> {
  if (!hasMongo()) return false;
  try {
    const db = await getDb();
    const col = db.collection<OtpDoc>('otp_codes');

    try {
      const indexes = await col.indexes();
      const ttl = indexes.find(
        (i: { name?: string; expireAfterSeconds?: number }) =>
          typeof i.expireAfterSeconds === 'number',
      );
      if (ttl?.name) await col.dropIndex(ttl.name);
    } catch {
      // no-op
    }

    await col.createIndex({ phoneE164: 1, createdAt: -1 }).catch(() => {});
    await col.createIndex({ visitorId: 1, createdAt: -1 }).catch(() => {});
    await col.createIndex({ createdAt: -1 }).catch(() => {});

    await col.insertOne({
      phoneE164: input.phoneE164,
      codeHash: input.codeHash,
      salt: input.salt,
      attempts: 0,
      verified: false,
      sentVia: input.sentVia,
      lastSenderE164: input.lastSenderE164,
      createdAt: input.now,
      expiresAt: input.expiresAt,
      reason: input.reason,
      form: input.form,
      name: input.name,
      visitorId: input.visitorId,
      campaign: input.campaign,
      artifactKind: input.artifactKind,
    });
    return true;
  } catch (err) {
    console.error('[otp/saveOtpToMongo] failed:', err);
    return false;
  }
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'not_found' | 'expired' | 'too_many_attempts' | 'wrong_code' | 'already_verified' | 'db_error';
}

/**
 * Check if a given phone recently completed OTP verification. Used by the
 * webhook to confirm a form submission is backed by a verified OTP rather
 * than trusting the client's `otpVerified: true` flag blindly.
 */
export async function wasRecentlyVerified(
  phoneE164: string,
  withinMs = 10 * 60 * 1000,
): Promise<boolean> {
  // Check Mongo first (authoritative audit), fall back to KV when Mongo is
  // offline or the record doesn't exist (e.g. because the original save
  // only made it to KV). Either positive result counts as verified.
  try {
    if (hasMongo()) {
      const db = await getDb();
      const col = db.collection<OtpDoc>('otp_codes');
      const cutoff = new Date(Date.now() - withinMs);
      const doc = await col.findOne({
        phoneE164,
        verified: true,
        verifiedAt: { $gte: cutoff },
      });
      if (doc) return true;
    }
  } catch {
    // swallow — fall through to KV
  }
  return kvWasRecentlyVerified(phoneE164);
}

/**
 * Fetch the business-sender phone used for the most recent verified OTP for
 * this user. The booking confirmation is sent from the same number so the
 * visitor sees a single continuous thread in their WhatsApp inbox rather
 * than two unrelated numbers.
 */
export async function getLastOtpSender(phoneE164: string): Promise<string | null> {
  try {
    if (hasMongo()) {
      const db = await getDb();
      const col = db.collection<OtpDoc>('otp_codes');
      const doc = await col.findOne(
        { phoneE164, verified: true, lastSenderE164: { $exists: true } },
        { sort: { verifiedAt: -1 } },
      );
      if (doc?.lastSenderE164) return doc.lastSenderE164;
    }
  } catch {
    // fall through to KV
  }
  return kvGetLastSender(phoneE164);
}

export async function verifyOtp(phoneE164: string, code: string): Promise<VerifyResult> {
  // Try Mongo first — it has the full audit trail. Fall back to KV when
  // Mongo is offline or the record wasn't there (e.g. because saveOtp only
  // made it to KV). We also mark verified in BOTH stores on success so a
  // subsequent webhook call (which checks wasRecentlyVerified) sees green
  // regardless of which layer it lands on.
  const cleanCode = code.trim();

  // Attempt 1: Mongo
  try {
    if (hasMongo()) {
      const db = await getDb();
      const col = db.collection<OtpDoc>('otp_codes');
      const doc = await col.findOne(
        { phoneE164 },
        { sort: { createdAt: -1 } },
      );
      if (doc) {
        if (doc.verified) return { ok: false, reason: 'already_verified' };
        if (doc.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
        if (doc.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

        const incomingHash = hashOtp(cleanCode, doc.salt);
        if (incomingHash !== doc.codeHash) {
          await col.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } }).catch(() => {});
          await kvIncrementAttempts(phoneE164);
          return { ok: false, reason: 'wrong_code' };
        }

        await col.updateOne(
          { _id: doc._id },
          { $set: { verified: true, verifiedAt: new Date() } },
        ).catch(() => {});
        // Mirror verified state to KV so wasRecentlyVerified can answer
        // from either layer.
        await kvMarkVerified(phoneE164, doc.lastSenderE164 ?? undefined);
        return { ok: true };
      }
      // Mongo returned no doc — fall through to KV.
    }
  } catch (err) {
    console.warn('[otp/verifyOtp] Mongo leg failed, falling back to KV:', (err as Error).message);
  }

  // Attempt 2: KV (works even if Mongo is completely offline)
  const kvDoc = await kvGetOtp(phoneE164);
  if (!kvDoc) return { ok: false, reason: 'not_found' };
  if (kvDoc.expiresAt < Date.now()) return { ok: false, reason: 'expired' };
  if (kvDoc.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

  const kvIncoming = hashOtp(cleanCode, kvDoc.salt);
  if (kvIncoming !== kvDoc.codeHash) {
    await kvIncrementAttempts(phoneE164);
    return { ok: false, reason: 'wrong_code' };
  }

  await kvMarkVerified(phoneE164, kvDoc.lastSenderE164);
  return { ok: true };
}
