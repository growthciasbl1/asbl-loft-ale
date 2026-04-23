import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from './mongo';

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
  lastUtm: {
    source: string | null;
    campaign: string | null;
    medium: string | null;
  };
  lastConversationId: string | null;
  verifiedAt: Date | null;
}

/**
 * Upsert a visitor record seen on this browser. Called on every chat load
 * so we track lastSeenAt and visitCount without bumping on trivial events.
 */
export async function touchVisitor(input: {
  visitorId: string;
  utm?: { source?: string | null; campaign?: string | null; medium?: string | null };
  conversationId?: string | null;
}): Promise<VisitorDoc | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<VisitorDoc>('visitors');
    const now = new Date();

    const existing = await col.findOne({ visitorId: input.visitorId });
    if (existing) {
      await col.updateOne(
        { visitorId: input.visitorId },
        {
          $set: {
            lastSeenAt: now,
            ...(input.utm
              ? {
                  lastUtm: {
                    source: input.utm.source ?? existing.lastUtm?.source ?? null,
                    campaign: input.utm.campaign ?? existing.lastUtm?.campaign ?? null,
                    medium: input.utm.medium ?? existing.lastUtm?.medium ?? null,
                  },
                }
              : {}),
            ...(input.conversationId ? { lastConversationId: input.conversationId } : {}),
          },
          $inc: { visitCount: 1 },
        },
      );
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
      lastUtm: {
        source: input.utm?.source ?? null,
        campaign: input.utm?.campaign ?? null,
        medium: input.utm?.medium ?? null,
      },
      lastConversationId: input.conversationId ?? null,
      verifiedAt: null,
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
        lastUtm: { source: null, campaign: null, medium: null },
        lastConversationId: null,
      },
    },
    { upsert: true },
  );

  return { globalId, isReturningUser };
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
