import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from './mongo';
import type { UtmSnapshot } from './visitors';

/**
 * A `persons` record is the canonical, phone-identified human.
 *
 * Relationship model:
 *   - visitors (keyed by browser visitorId) → many-to-one → persons (keyed by phone)
 *   - persons → many-to-many → leads (one person can submit multiple lead forms)
 *
 * UTM attribution at the person level answers:
 *   "Where did Rahul originally come from, and what brought him back?"
 * — across ALL devices he ever used. This is impossible at visitor-level
 *   alone because different browsers = different visitorIds.
 */
export interface PersonDoc {
  _id?: ObjectId;
  globalId: string;
  phoneE164: string;
  name: string | null;
  email: string | null;
  preferredChannel: 'whatsapp' | 'call' | null;

  firstSeenAt: Date; // first time any browser with this phone touched us
  lastSeenAt: Date;
  visitCount: number;

  /** First-touch attribution at the PERSON level — never overwritten */
  firstUtm: UtmSnapshot | null;
  /** Last-touch attribution — updated on every return visit with fresh UTM */
  lastUtm: UtmSnapshot | null;
  /** Full ordered trail, capped at 50, across ALL browsers/devices */
  utmHistory: UtmSnapshot[];

  /** Every visitorId (browser session) that has identified as this person */
  visitorIds: string[];
  /** Every lead document this person has submitted */
  leadIds: ObjectId[];

  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

async function ensurePersonIndexes(): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    await col.createIndex({ phoneE164: 1 }, { unique: true }).catch(() => {});
    await col.createIndex({ globalId: 1 }).catch(() => {});
    await col.createIndex({ 'lastUtm.campaign': 1, lastSeenAt: -1 }).catch(() => {});
  } catch {
    // no-op
  }
}

/**
 * Create or update the person record for this phone. Merges:
 *   - Identity (name/email/channel) — updated every call
 *   - UTM from the current visitor's firstUtm / lastUtm
 *   - Appends the current UTM snapshot to utmHistory (dedup'd if identical
 *     to the most recent entry)
 *   - Adds the current visitorId to visitorIds (dedup'd)
 *
 * Returns the final PersonDoc after upsert.
 */
export async function upsertPerson(input: {
  globalId: string;
  phoneE164: string;
  name: string;
  email?: string | null;
  preferredChannel?: 'whatsapp' | 'call' | null;
  visitorId: string;
  visitorFirstUtm?: UtmSnapshot | null;
  visitorLastUtm?: UtmSnapshot | null;
}): Promise<PersonDoc | null> {
  if (!hasMongo()) return null;
  await ensurePersonIndexes();

  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    const now = new Date();

    const existing = await col.findOne({ phoneE164: input.phoneE164 });

    // The UTM snapshot we want to record on this verification event.
    // Prefer the visitor's LAST-touch (most recent campaign attribution).
    // Fall back to first-touch if this is a fresh visitor with only one.
    const incomingSnap = input.visitorLastUtm ?? input.visitorFirstUtm ?? null;

    if (existing) {
      // UPDATE path — appended fields + last-touch UTM refresh
      const updates: Record<string, unknown> = {
        name: input.name,
        email: input.email ?? existing.email,
        preferredChannel: input.preferredChannel ?? existing.preferredChannel,
        lastSeenAt: now,
        updatedAt: now,
        verifiedAt: now,
      };

      // Only overwrite lastUtm if we actually have a new snapshot
      if (incomingSnap) updates.lastUtm = incomingSnap;

      // Dedupe utmHistory push: skip if identical to the latest entry
      const latestInHistory = existing.utmHistory?.[existing.utmHistory.length - 1];
      const isDuplicate =
        latestInHistory &&
        incomingSnap &&
        latestInHistory.source === incomingSnap.source &&
        latestInHistory.campaign === incomingSnap.campaign &&
        latestInHistory.medium === incomingSnap.medium &&
        latestInHistory.content === incomingSnap.content;

      const pushOp =
        incomingSnap && !isDuplicate
          ? { utmHistory: { $each: [incomingSnap], $slice: -50 } }
          : undefined;

      const visitorAlreadyLinked = existing.visitorIds.includes(input.visitorId);

      await col.updateOne(
        { phoneE164: input.phoneE164 },
        {
          $set: updates,
          $inc: { visitCount: 1 },
          ...(pushOp || !visitorAlreadyLinked
            ? {
                $addToSet: !visitorAlreadyLinked
                  ? { visitorIds: input.visitorId }
                  : undefined,
                ...(pushOp ? { $push: pushOp } : {}),
              }
            : {}),
        } as Record<string, unknown>,
      );

      return col.findOne({ phoneE164: input.phoneE164 });
    }

    // INSERT path — new person
    const doc: PersonDoc = {
      globalId: input.globalId,
      phoneE164: input.phoneE164,
      name: input.name,
      email: input.email ?? null,
      preferredChannel: input.preferredChannel ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
      visitCount: 1,
      firstUtm: input.visitorFirstUtm ?? incomingSnap,
      lastUtm: incomingSnap,
      utmHistory: incomingSnap ? [incomingSnap] : [],
      visitorIds: [input.visitorId],
      leadIds: [],
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await col.insertOne(doc);
    return doc;
  } catch (err) {
    console.error('[db/persons] upsertPerson failed:', err);
    return null;
  }
}

/**
 * Append a fresh UTM snapshot to an existing person. Called when a known
 * visitor (globalId set) comes back via a new campaign — even without
 * re-verifying OTP, their campaign attribution is captured at the person
 * level via their visitorId linkage.
 *
 * Dedup: skips if identical to the most recent history entry.
 */
export async function appendPersonUtm(
  phoneE164: string,
  snap: UtmSnapshot,
): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    const existing = await col.findOne({ phoneE164 });
    if (!existing) return;

    const latest = existing.utmHistory?.[existing.utmHistory.length - 1];
    const isDuplicate =
      latest &&
      latest.source === snap.source &&
      latest.campaign === snap.campaign &&
      latest.medium === snap.medium &&
      latest.content === snap.content;
    if (isDuplicate) return;

    await col.updateOne(
      { phoneE164 },
      {
        $set: { lastUtm: snap, lastSeenAt: new Date(), updatedAt: new Date() },
        $inc: { visitCount: 1 },
        $push: { utmHistory: { $each: [snap], $slice: -50 } },
      },
    );
  } catch (err) {
    console.error('[db/persons] appendPersonUtm failed:', err);
  }
}

export async function getPersonByPhone(phoneE164: string): Promise<PersonDoc | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    return await col.findOne({ phoneE164 });
  } catch {
    return null;
  }
}

export async function getPersonByGlobalId(globalId: string): Promise<PersonDoc | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    return await col.findOne({ globalId });
  } catch {
    return null;
  }
}

export async function attachLeadToPerson(phoneE164: string, leadId: ObjectId): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const col = db.collection<PersonDoc>('persons');
    await col.updateOne(
      { phoneE164 },
      {
        $addToSet: { leadIds: leadId },
        $set: { updatedAt: new Date() },
      },
    );
  } catch (err) {
    console.error('[db/persons] attachLeadToPerson failed:', err);
  }
}
