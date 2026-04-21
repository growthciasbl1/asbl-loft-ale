import { getDb, hasMongo } from './mongo';
import { COLLECTIONS, EventDoc } from './schemas';

export interface IncomingEvent {
  type: EventDoc['type'];
  name: string;
  props?: Record<string, unknown>;
  at: number;
  sessionId: string;
  path?: string;
  referer?: string;
  utmCampaign?: string | null;
}

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    const col = db.collection<EventDoc>(COLLECTIONS.events);
    await Promise.all([
      col.createIndex({ sessionId: 1, serverAt: -1 }),
      col.createIndex({ type: 1, name: 1, serverAt: -1 }),
      col.createIndex({ utmCampaign: 1, serverAt: -1 }),
      col.createIndex({ serverAt: -1 }),
    ]);
    indexesEnsured = true;
  } catch (err) {
    // Non-fatal — log and keep going; next request will try again
    console.warn('[db/events] index creation deferred:', err);
  }
}

export async function insertEvents(
  events: IncomingEvent[],
  reqMeta: { userAgent?: string; ip?: string }
): Promise<number> {
  if (!hasMongo()) {
    console.warn('[db/events] MONGODB_URI not set — events dropped:', events.length);
    return 0;
  }
  if (!events.length) return 0;

  try {
    const db = await getDb();
    await ensureIndexes();
    const serverAt = new Date();
    const docs: EventDoc[] = events.map((e) => ({
      sessionId: e.sessionId,
      type: e.type,
      name: e.name,
      props: e.props,
      path: e.path,
      referer: e.referer,
      utmCampaign: e.utmCampaign ?? null,
      userAgent: reqMeta.userAgent,
      ip: reqMeta.ip,
      clientAt: new Date(e.at),
      serverAt,
    }));
    const r = await db.collection<EventDoc>(COLLECTIONS.events).insertMany(docs, { ordered: false });
    return r.insertedCount;
  } catch (err) {
    console.error('[db/events] insertMany failed:', err);
    return 0;
  }
}
