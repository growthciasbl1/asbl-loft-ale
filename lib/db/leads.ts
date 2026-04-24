import { getDb, hasMongo } from './mongo';
import { COLLECTIONS, LeadBooking, LeadDoc } from './schemas';

/**
 * Upsert a lead by phone. If no lead exists for the given phone, insert a
 * fresh row. If one already exists, UPDATE it with the new data + bump
 * resubmissionCount and append the latest submission to submissionHistory.
 *
 * Returns the lead's Mongo ObjectId hex string (new OR existing).
 *
 * Business rationale: a single person rescheduling a site visit, re-booking a
 * call, or re-sharing a doc should produce ONE row with a counter, not N
 * duplicate rows. Sales sees how many times this lead has engaged and which
 * booking is the latest at a glance.
 */
export async function upsertLead(
  lead: Omit<LeadDoc, '_id' | 'createdAt' | 'resubmissionCount' | 'submissionHistory'>,
): Promise<{ id: string | null; isNew: boolean; resubmissionCount: number }> {
  if (!hasMongo()) {
    console.warn('[db/leads] MONGODB_URI not set — lead logged but not stored:', lead);
    return { id: null, isNew: true, resubmissionCount: 0 };
  }
  const phone = (lead.phone ?? '').trim();
  if (!phone) {
    // No phone to key off — fall back to fresh insert so we don't merge
    // unrelated anonymous leads.
    try {
      const db = await getDb();
      const r = await db
        .collection<LeadDoc>(COLLECTIONS.leads)
        .insertOne({ ...lead, createdAt: new Date(), resubmissionCount: 0 });
      return { id: r.insertedId.toHexString(), isNew: true, resubmissionCount: 0 };
    } catch (err) {
      console.error('[db/leads] phone-less insert failed:', err);
      return { id: null, isNew: true, resubmissionCount: 0 };
    }
  }

  try {
    const db = await getDb();
    const coll = db.collection<LeadDoc>(COLLECTIONS.leads);
    const existing = await coll.findOne({ phone });

    const historyEntry = {
      at: new Date(),
      reason: lead.reason,
      booking: (lead.booking ?? null) as LeadBooking | null,
      query: lead.currentQuery,
      isReschedule: lead.booking?.isReschedule === true,
    };

    if (existing?._id) {
      // UPDATE path — bump counter, push to history, overwrite latest fields.
      const nextCount = (existing.resubmissionCount ?? 0) + 1;
      await coll.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: lead.name,
            email: lead.email,
            reason: lead.reason,
            currentQuery: lead.currentQuery,
            utmSource: lead.utmSource,
            utmMedium: lead.utmMedium,
            utmCampaign: lead.utmCampaign,
            utmContent: lead.utmContent,
            utmTerm: lead.utmTerm,
            referrer: lead.referrer,
            landingPath: lead.landingPath,
            firstPageVisited: lead.firstPageVisited,
            lastPageVisited: lead.lastPageVisited,
            totalPageViews: lead.totalPageViews,
            timeSpentMinutes: lead.timeSpentMinutes,
            preferredChannel: lead.preferredChannel,
            booking: lead.booking,
            geo: lead.geo,
            pinnedUnitIds: lead.pinnedUnitIds,
            conversationId: lead.conversationId,
            visitorId: lead.visitorId,
            globalId: lead.globalId,
            otpVerified: lead.otpVerified,
            resubmissionCount: nextCount,
            updatedAt: new Date(),
          },
          $push: { submissionHistory: historyEntry },
        },
      );
      return {
        id: existing._id.toHexString(),
        isNew: false,
        resubmissionCount: nextCount,
      };
    }

    // INSERT path — brand-new lead.
    const r = await coll.insertOne({
      ...lead,
      createdAt: new Date(),
      resubmissionCount: 0,
      submissionHistory: [historyEntry],
    });
    return { id: r.insertedId.toHexString(), isNew: true, resubmissionCount: 0 };
  } catch (err) {
    console.error('[db/leads] upsert failed:', err);
    return { id: null, isNew: true, resubmissionCount: 0 };
  }
}

/**
 * Legacy insert kept for callers that specifically want a fresh row without
 * merging (e.g. one-off admin flows). All form webhooks should use upsertLead.
 */
export async function insertLead(
  lead: Omit<LeadDoc, '_id' | 'createdAt'>,
): Promise<string | null> {
  const res = await upsertLead(lead);
  return res.id;
}

export async function markLeadCrmPushed(
  leadId: string,
  crmResponse: unknown,
): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    await db
      .collection<LeadDoc>(COLLECTIONS.leads)
      .updateOne(
        { _id: new ObjectId(leadId) },
        { $set: { crmPushedAt: new Date(), crmResponse } },
      );
  } catch (err) {
    console.error('[db/leads] crm update failed:', err);
  }
}
