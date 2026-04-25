import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from '@/lib/db/mongo';

export interface WaNumberDoc {
  _id?: ObjectId;
  phoneE164: string; // e.g. "919063141693" — no + or spaces, used as `x-phone` header
  label: string; // e.g. "Angad" — for admin dashboard readability
  active: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Initial green-dot WhatsApp numbers connected in Periskope (as of 2026-04-23).
 * Red ones (Bala Sk, 92475-24774) intentionally excluded.
 * Round-robin distribution reduces per-number rate-limit risk and spreads load.
 */
const SEED_NUMBERS: { phoneE164: string; label: string }[] = [
  { phoneE164: '919063141693', label: 'Angad' },
  { phoneE164: '917794028484', label: 'Kapil' },
  { phoneE164: '919059555164', label: 'Reddy' },
  { phoneE164: '918977537630', label: '89775-37630' },
  { phoneE164: '917207048181', label: 'Varun' },
  { phoneE164: '917396130606', label: 'Mayur' },
  { phoneE164: '917386023002', label: '73860-23002' },
  { phoneE164: '917995284040', label: 'Anandita' },
];

/**
 * Ensures the wa_numbers collection contains the seed list, marks them active.
 * Idempotent — safe to call on every request (cheap since we use upsert).
 */
export async function ensureNumbersSeeded(): Promise<void> {
  if (!hasMongo()) return;
  const db = await getDb();
  const col = db.collection<WaNumberDoc>('wa_numbers');
  const now = new Date();
  await Promise.all(
    SEED_NUMBERS.map((n) =>
      col.updateOne(
        { phoneE164: n.phoneE164 },
        {
          $setOnInsert: {
            phoneE164: n.phoneE164,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: now,
          },
          $set: { label: n.label, active: true, updatedAt: now },
        },
        { upsert: true },
      ),
    ),
  );
}

/**
 * Atomically pick the least-recently-used active sender number and
 * bump its counter. Round-robin distribution via `sort: lastUsedAt asc`.
 * Returns the phoneE164 to use in the Periskope `x-phone` header.
 *
 * MONGO-DOWN SAFE: If Mongo is unreachable or slow, we fall back to a
 * randomised pick from the seed list (which is the same source of truth)
 * instead of returning null. OTP delivery keeps working even if the
 * wa_numbers collection is offline — at the cost of losing the round-
 * robin usage counter for that invocation.
 */
function fallbackSender(): string {
  return SEED_NUMBERS[Math.floor(Math.random() * SEED_NUMBERS.length)].phoneE164;
}

export async function pickNextSender(): Promise<string | null> {
  if (!hasMongo()) return fallbackSender();
  try {
    await ensureNumbersSeeded();
    const db = await getDb();
    const col = db.collection<WaNumberDoc>('wa_numbers');
    const picked = await col.findOneAndUpdate(
      { active: true },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date(), updatedAt: new Date() },
      },
      {
        sort: { lastUsedAt: 1, usageCount: 1 }, // nulls sort first → brand-new numbers tried first
        returnDocument: 'after',
      },
    );
    return picked?.phoneE164 ?? fallbackSender();
  } catch (err) {
    console.warn('[wa/numbers] pickNextSender Mongo failed, using seed fallback:', (err as Error).message);
    return fallbackSender();
  }
}

/**
 * Return every active sender number, ordered by least-recently-used first.
 * Used as the sender pool for `sendWhatsApp` retries — when one number is
 * dead (e.g. Periskope phone instance switched off), we walk the rest of
 * the pool until something delivers, instead of bailing after 3 attempts.
 *
 * Mongo-down safe: returns the seed list shuffled randomly when Mongo is
 * unreachable so OTP delivery doesn't depend on a healthy DB.
 */
export async function getAllActiveSenders(): Promise<string[]> {
  const seeds = SEED_NUMBERS.map((n) => n.phoneE164);
  if (!hasMongo()) {
    return seeds.sort(() => Math.random() - 0.5);
  }
  try {
    await ensureNumbersSeeded();
    const db = await getDb();
    const col = db.collection<WaNumberDoc>('wa_numbers');
    const docs = await col
      .find({ active: true })
      .sort({ lastUsedAt: 1, usageCount: 1 })
      .toArray();
    const fromMongo = docs.map((d) => d.phoneE164).filter(Boolean);
    if (fromMongo.length > 0) return fromMongo;
    return seeds.sort(() => Math.random() - 0.5);
  } catch (err) {
    console.warn('[wa/numbers] getAllActiveSenders Mongo failed, using seeds:', (err as Error).message);
    return seeds.sort(() => Math.random() - 0.5);
  }
}
