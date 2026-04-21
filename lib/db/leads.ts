import { getDb, hasMongo } from './mongo';
import { COLLECTIONS, LeadDoc } from './schemas';

export async function insertLead(lead: Omit<LeadDoc, '_id' | 'createdAt'>): Promise<string | null> {
  if (!hasMongo()) {
    console.warn('[db/leads] MONGODB_URI not set — lead logged but not stored:', lead);
    return null;
  }
  try {
    const db = await getDb();
    const r = await db
      .collection<LeadDoc>(COLLECTIONS.leads)
      .insertOne({ ...lead, createdAt: new Date() });
    return r.insertedId.toHexString();
  } catch (err) {
    console.error('[db/leads] insert failed:', err);
    return null;
  }
}

export async function markLeadCrmPushed(
  leadId: string,
  crmResponse: unknown
): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db
      .collection<LeadDoc>(COLLECTIONS.leads)
      .updateOne(
        { _id: new ObjectId(leadId) },
        { $set: { crmPushedAt: new Date(), crmResponse } }
      );
  } catch (err) {
    console.error('[db/leads] crm update failed:', err);
  }
}
