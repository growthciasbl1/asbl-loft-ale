import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from './mongo';

export interface UtmSnapshot {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  landingPath: string | null;
  at: Date;
}

export interface VisitorDoc {
  _id?: ObjectId;
  visitorId: string; // browser-scoped UUID ("v-xyz"), stable per device
  globalId: string | null; // personal id, links multiple visitorIds via phone
  phoneE164: string | null;
  name: string | null;
  email: string | null;
  preferredChannel: 'whatsapp' | 'call' | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  visitCount: number;
  /** First-touch attribution — set once on insert, never overwritten. */
  firstUtm: UtmSnapshot | null;
  /** Last-touch attribution — overwritten on every visit with fresh UTM. */
  lastUtm: UtmSnapshot | null;
  /** Ordered trail of ALL utm-bearing visits. Cap at 20 to bound growth. */
  utmHistory: UtmSnapshot[];
  lastConversationId: string | null;
  verifiedAt: Date | null;
  /** Set once the visitor converts to a lead. */
  leadId: ObjectId | null;
}

export interface UtmInput {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
}

function hasAnyUtmValue(u: UtmInput | undefined): boolean {
  if (!u) return false;
  return Boolean(u.source || u.medium || u.campaign || u.content || u.term);
}

function snapshotFromInput(u: UtmInput, at: Date): UtmSnapshot {
  return {
    source: u.source ?? null,
    medium: u.medium ?? null,
    campaign: u.campaign ?? null,
    content: u.content ?? null,
    term: u.term ?? null,
    referrer: u.referrer ?? null,
    landingPath: u.landingPath ?? null,
    at,
  };
}

/**
 * Upsert a visitor record seen on this browser. Attribution model:
 *  - firstUtm: set ONLY on insert when the very first visit had UTM params.
 *    Never overwritten after that — preserves "what brought them in first".
 *  - lastUtm: overwritten on every visit that carries fresh UTM params.
 *    Represents the most recent campaign attribution.
 *  - utmHistory: append-only audit (capped at 20 entries) — lets us see
 *    the full campaign journey (e.g., landed from paid WhatsApp, came back
 *    via email retarget, converted on direct).
 */
export async function touchVisitor(input: {
  visitorId: string;
  utm?: UtmInput;
  conversationId?: string | null;
}): Promise<VisitorDoc | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<VisitorDoc>('visitors');
    const now = new Date();

    // Ensure indexes for scale — idempotent.
    await col.createIndex({ visitorId: 1 }, { unique: true }).catch(() => {});
    await col.createIndex({ phoneE164: 1 }).catch(() => {});
    await col.createIndex({ 'lastUtm.campaign': 1, lastSeenAt: -1 }).catch(() => {});

    const hasUtm = hasAnyUtmValue(input.utm);
    const snap = hasUtm && input.utm ? snapshotFromInput(input.utm, now) : null;

    const existing = await col.findOne({ visitorId: input.visitorId });
    if (existing) {
      const update: Record<string, unknown> = {
        lastSeenAt: now,
      };
      if (snap) update.lastUtm = snap;
      if (input.conversationId) update.lastConversationId = input.conversationId;
      await col.updateOne(
        { visitorId: input.visitorId },
        {
          $set: update,
          $inc: { visitCount: 1 },
          ...(snap
            ? {
                $push: {
                  utmHistory: {
                    $each: [snap],
                    $slice: -20, // keep newest 20 only
                  },
                },
              }
            : {}),
        },
      );

      // Cross-device attribution: if this browser is already linked to a
      // known person (phoneE164 + globalId set from a prior OTP verify),
      // push the fresh UTM up to the person level too — so when they later
      // submit another lead, the full campaign journey is available.
      if (snap && existing.phoneE164 && existing.globalId) {
        try {
          const { appendPersonUtm } = await import('./persons');
          await appendPersonUtm(existing.phoneE164, snap);
        } catch (err) {
          console.error('[db/visitors] appendPersonUtm failed:', err);
        }
      }

      return { ...existing, lastSeenAt: now, visitCount: existing.visitCount + 1 };
    }

    const doc: VisitorDoc = {
      visitorId: input.visitorId,
      globalId: null,
      phoneE164: null,
      name: null,
      email: null,
      preferredChannel: null,
      firstSeenAt: now,
      lastSeenAt: now,
      visitCount: 1,
      firstUtm: snap, // set once on first visit
      lastUtm: snap,
      utmHistory: snap ? [snap] : [],
      lastConversationId: input.conversationId ?? null,
      verifiedAt: null,
      leadId: null,
    };
    await col.insertOne(doc);
    return doc;
  } catch (err) {
    console.error('[db/visitors] touchVisitor failed:', err);
    return null;
  }
}

/**
 * Called when a visitor verifies their phone — links visitorId → phone/globalId.
 * If another visitor already exists with the same phone, they share the globalId.
 * ALSO upserts the phone-scoped `persons` record so cross-device attribution
 * works: all browsers for the same phone merge into one Person with the
 * full utmHistory across sessions.
 */
export async function linkVisitorPhone(input: {
  visitorId: string;
  phoneE164: string;
  name: string;
  email?: string | null;
  preferredChannel?: 'whatsapp' | 'call' | null;
}): Promise<{ globalId: string; isReturningUser: boolean }> {
  const db = await getDb();
  const col = db.collection<VisitorDoc>('visitors');
  const now = new Date();

  // Does anyone already have this phone?
  const existingByPhone = await col.findOne({ phoneE164: input.phoneE164, globalId: { $ne: null } });
  let globalId: string;
  let isReturningUser = false;
  if (existingByPhone?.globalId) {
    globalId = existingByPhone.globalId;
    isReturningUser = true;
  } else {
    globalId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Read THIS visitor's UTM state before we write — we'll propagate it up
  // to the person-level record so the cross-device utmHistory builds up.
  const thisVisitor = await col.findOne({ visitorId: input.visitorId });

  await col.updateOne(
    { visitorId: input.visitorId },
    {
      $set: {
        globalId,
        phoneE164: input.phoneE164,
        name: input.name,
        email: input.email ?? null,
        preferredChannel: input.preferredChannel ?? null,
        verifiedAt: now,
        lastSeenAt: now,
      },
      $setOnInsert: {
        visitorId: input.visitorId,
        firstSeenAt: now,
        visitCount: 1,
        firstUtm: null,
        lastUtm: null,
        utmHistory: [],
        lastConversationId: null,
        leadId: null,
      },
    },
    { upsert: true },
  );

  // Upsert the person-level record. Import lazily to avoid circular import.
  try {
    const { upsertPerson } = await import('./persons');
    await upsertPerson({
      globalId,
      phoneE164: input.phoneE164,
      name: input.name,
      email: input.email ?? null,
      preferredChannel: input.preferredChannel ?? null,
      visitorId: input.visitorId,
      visitorFirstUtm: thisVisitor?.firstUtm ?? null,
      visitorLastUtm: thisVisitor?.lastUtm ?? null,
    });
  } catch (err) {
    console.error('[db/visitors] upsertPerson failed:', err);
  }

  return { globalId, isReturningUser };
}

export async function attachLeadToVisitor(visitorId: string, leadId: ObjectId): Promise<void> {
  if (!hasMongo() || !visitorId) return;
  try {
    const db = await getDb();
    const col = db.collection<VisitorDoc>('visitors');
    await col.updateOne(
      { visitorId },
      { $set: { leadId, verifiedAt: new Date() } },
    );
  } catch (err) {
    console.error('[db/visitors] attachLeadToVisitor failed:', err);
  }
}

export async function resolveVisitor(visitorId: string): Promise<VisitorDoc | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<VisitorDoc>('visitors');
    return await col.findOne({ visitorId });
  } catch (err) {
    console.error('[db/visitors] resolveVisitor failed:', err);
    return null;
  }
}
