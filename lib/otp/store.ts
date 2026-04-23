import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from '@/lib/db/mongo';

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
  if (!hasMongo()) return false;
  try {
    const db = await getDb();
    const col = db.collection<OtpDoc>('otp_codes');

    // One-time migration: drop the legacy TTL index on expiresAt if present
    // (earlier the collection auto-deleted docs 5 min after creation, which
    // broke the audit log). Now we keep docs forever and rely on
    // verifyOtp()'s expiresAt check for security.
    try {
      const indexes = await col.indexes();
      const ttl = indexes.find(
        (i: { name?: string; expireAfterSeconds?: number }) =>
          typeof i.expireAfterSeconds === 'number',
      );
      if (ttl?.name) await col.dropIndex(ttl.name);
    } catch {
      // no-op — safe to skip if collection is new or index already gone
    }

    await col.createIndex({ phoneE164: 1, createdAt: -1 }).catch(() => {});
    await col.createIndex({ visitorId: 1, createdAt: -1 }).catch(() => {});
    await col.createIndex({ createdAt: -1 }).catch(() => {});

    const salt = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    await col.insertOne({
      phoneE164: input.phoneE164,
      codeHash: hashOtp(input.otp, salt),
      salt,
      attempts: 0,
      verified: false,
      sentVia: input.sentVia,
      lastSenderE164: input.lastSenderE164,
      createdAt: now,
      expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      reason: input.reason,
      form: input.form,
      name: input.name,
      visitorId: input.visitorId,
      campaign: input.campaign,
      artifactKind: input.artifactKind,
    });
    return true;
  } catch (err) {
    console.error('[otp/saveOtp] failed:', err);
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
  if (!hasMongo()) return false;
  try {
    const db = await getDb();
    const col = db.collection<OtpDoc>('otp_codes');
    const cutoff = new Date(Date.now() - withinMs);
    const doc = await col.findOne({
      phoneE164,
      verified: true,
      verifiedAt: { $gte: cutoff },
    });
    return !!doc;
  } catch {
    return false;
  }
}

export async function verifyOtp(phoneE164: string, code: string): Promise<VerifyResult> {
  if (!hasMongo()) return { ok: false, reason: 'db_error' };
  try {
    const db = await getDb();
    const col = db.collection<OtpDoc>('otp_codes');
    const doc = await col.findOne(
      { phoneE164 },
      { sort: { createdAt: -1 } },
    );
    if (!doc) return { ok: false, reason: 'not_found' };
    if (doc.verified) return { ok: false, reason: 'already_verified' };
    if (doc.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
    if (doc.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

    // Compute expected hash with the stored salt
    const incomingHash = hashOtp(code.trim(), doc.salt);
    if (incomingHash !== doc.codeHash) {
      await col.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
      return { ok: false, reason: 'wrong_code' };
    }

    await col.updateOne(
      { _id: doc._id },
      { $set: { verified: true, verifiedAt: new Date() } },
    );
    return { ok: true };
  } catch (err) {
    console.error('[otp/verifyOtp] failed:', err);
    return { ok: false, reason: 'db_error' };
  }
}
