import { NextRequest, NextResponse } from 'next/server';
import { upsertLead, markLeadCrmPushed } from '@/lib/db/leads';
import type { LeadBooking, LeadGeo } from '@/lib/db/schemas';
import { wasRecentlyVerified, getLastOtpSender } from '@/lib/otp/store';
import { normalisePhone, sendWhatsApp } from '@/lib/wa/periskope';
import { resolveVisitor, attachLeadToVisitor } from '@/lib/db/visitors';
import { getPersonByPhone, attachLeadToPerson } from '@/lib/db/persons';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRM_INGEST_URL =
  process.env.CRM_INGEST_URL || 'https://asbl-crm-api.vercel.app/api/ingest/website';

interface WebTrackerPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_page_visited?: string;
  last_page_visited?: string;
  total_page_views?: number;
  referrer_url?: string;
  time_spent_minutes?: number;
}

async function pushToCrm(payload: Record<string, unknown>, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CRM_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRM_API_KEY ? { Authorization: `Bearer ${process.env.CRM_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    return { ok, status: res.status, json };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}

function buildConfirmationMessage(input: {
  name?: string;
  reason?: string;
  booking?: { type: string; slotIsoLocal: string; timezone: string } | null;
}): string {
  const firstName = input.name?.split(/\s+/)[0] ?? 'there';
  const when = input.booking
    ? `${input.booking.slotIsoLocal.replace('T', ' at ').replace(/:00$/, '')} (${input.booking.timezone})`
    : null;

  if (input.booking?.type === 'site_visit' && when) {
    return (
      `Hi ${firstName},\n\n` +
      `Your ASBL Loft site visit is confirmed for ${when}.\n\n` +
      `One of our Relationship Managers will share the exact meeting point and their direct contact number shortly.\n\n` +
      `For any questions, please reply to this thread.\n\n` +
      `ASBL Loft`
    );
  }
  if (input.booking?.type === 'call_back' && when) {
    return (
      `Hi ${firstName},\n\n` +
      `Your call back is scheduled for ${when}.\n\n` +
      `One of our Relationship Managers will call you at the scheduled time.\n\n` +
      `ASBL Loft`
    );
  }
  return (
    `Hi ${firstName},\n\n` +
    `Thank you for your interest in ASBL Loft. One of our Relationship Managers will reach out shortly.\n\n` +
    `ASBL Loft`
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.phone || !body?.name) {
      return NextResponse.json({ error: 'name and phone are required' }, { status: 400 });
    }

    const referer = req.headers.get('referer') || '';
    const ua = req.headers.get('user-agent') || '';
    const tracker: WebTrackerPayload = (body.webTracker && typeof body.webTracker === 'object')
      ? body.webTracker as WebTrackerPayload
      : {};

    // Attribution reconciliation — priority order:
    //   form-supplied > client webTracker > person.lastUtm > person.firstUtm
    //     > visitor.lastUtm > visitor.firstUtm
    //
    // The `persons` collection is the authoritative cross-device source for
    // a phone-identified human. It accumulates UTM history across every
    // browser they've ever used. Falls back to visitor-level data only when
    // the person record doesn't exist yet (first-ever submission).
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : null;
    const visitor = visitorId ? await resolveVisitor(visitorId) : null;
    const phoneForPerson = normalisePhone(String(body?.phone ?? ''));
    const person = phoneForPerson ? await getPersonByPhone(phoneForPerson) : null;

    const utmLast = person?.lastUtm ?? visitor?.lastUtm ?? null;
    const utmFirst = person?.firstUtm ?? visitor?.firstUtm ?? null;

    const utmSource =
      body.utmSource ?? tracker.utm_source ?? utmLast?.source ?? utmFirst?.source ?? null;
    const utmCampaign =
      body.utmCampaign ?? tracker.utm_campaign ?? utmLast?.campaign ?? utmFirst?.campaign ?? null;
    const utmMedium =
      body.utmMedium ?? tracker.utm_medium ?? utmLast?.medium ?? utmFirst?.medium ?? null;
    const utmContent = tracker.utm_content ?? utmLast?.content ?? utmFirst?.content ?? null;
    const utmTerm = tracker.utm_term ?? utmLast?.term ?? utmFirst?.term ?? null;

    const normalizeBookingType = (t: unknown): 'site_visit' | 'virtual_visit' | 'call_back' =>
      t === 'call_back' ? 'call_back' : t === 'virtual_visit' ? 'virtual_visit' : 'site_visit';

    const booking =
      body.booking && typeof body.booking === 'object'
        ? {
            type: normalizeBookingType(body.booking.type),
            slotIsoLocal: String(body.booking.slotIsoLocal ?? ''),
            timezone: String(body.booking.timezone ?? 'Asia/Kolkata'),
            timezoneDetected: String(body.booking.timezoneDetected ?? 'Asia/Kolkata'),
            timezoneUserOverridden: Boolean(body.booking.timezoneUserOverridden),
            callPreference:
              body.booking.callPreference === 'now' ||
              body.booking.callPreference === 'tomorrow' ||
              body.booking.callPreference === 'later' ||
              body.booking.callPreference === 'anytime'
                ? body.booking.callPreference
                : undefined,
            isReschedule: Boolean(body.booking.isReschedule),
            previousBooking:
              body.booking.previousBooking && typeof body.booking.previousBooking === 'object'
                ? {
                    type: normalizeBookingType(body.booking.previousBooking.type),
                    slotIsoLocal: String(body.booking.previousBooking.slotIsoLocal ?? ''),
                    slotLabel: body.booking.previousBooking.slotLabel
                      ? String(body.booking.previousBooking.slotLabel)
                      : undefined,
                    dayShortLabel: body.booking.previousBooking.dayShortLabel
                      ? String(body.booking.previousBooking.dayShortLabel)
                      : undefined,
                    timezone: body.booking.previousBooking.timezone
                      ? String(body.booking.previousBooking.timezone)
                      : undefined,
                    capturedAt:
                      typeof body.booking.previousBooking.capturedAt === 'number'
                        ? body.booking.previousBooking.capturedAt
                        : undefined,
                  }
                : undefined,
          }
        : null;

    const geo =
      body.geo && typeof body.geo === 'object'
        ? {
            lat: Number(body.geo.lat),
            lng: Number(body.geo.lng),
            accuracy: Number(body.geo.accuracy ?? 0),
            timezone: body.geo.timezone ? String(body.geo.timezone) : undefined,
          }
        : null;

    // 1) Persist lead in Mongo (no-op if MONGODB_URI missing).
    //    upsertLead merges by phone — resubmissions (reschedule / re-book /
    //    re-share) become an UPDATE on the existing row with bumped
    //    resubmissionCount + appended submissionHistory. No duplicate rows.
    const upsert = await upsertLead({
      name: body.name,
      phone: body.phone,
      email: body.email,
      reason: body.reason ?? body.query ?? undefined,
      initialQuery: body.initialQuery,
      currentQuery: body.query,
      // Attribution — all 5 UTM fields + referrer + landing path + journey
      utmSource: utmSource ?? undefined,
      utmMedium: utmMedium ?? undefined,
      utmCampaign: utmCampaign ?? undefined,
      utmContent: utmContent ?? undefined,
      utmTerm: utmTerm ?? undefined,
      referrer: tracker.referrer_url ?? referer ?? undefined,
      landingPath: visitor?.firstUtm?.landingPath ?? undefined,
      firstPageVisited: tracker.first_page_visited ?? undefined,
      lastPageVisited: tracker.last_page_visited ?? undefined,
      totalPageViews: tracker.total_page_views,
      timeSpentMinutes: tracker.time_spent_minutes,
      preferredChannel: body.preferredChannel === 'call' ? 'call' : 'whatsapp',
      booking: booking as LeadBooking | null,
      geo: geo as LeadGeo | null,
      pinnedUnitIds: Array.isArray(body.pinnedUnitIds) ? body.pinnedUnitIds : undefined,
      conversationId: body.conversationId,
      visitorId: visitorId ?? undefined,
      globalId: visitor?.globalId ?? null,
      otpVerified: body.otpVerified === true,
    });
    const leadId = upsert.id;
    const resubmissionCount = upsert.resubmissionCount;
    const isReturningLead = !upsert.isNew;

    // Link the visitor record to this lead so analytics can pivot the
    // other way (visitorId → leadId). Best-effort, non-blocking.
    if (leadId && visitorId) {
      attachLeadToVisitor(visitorId, new ObjectId(leadId)).catch((err) =>
        console.warn('[webhook] attachLeadToVisitor failed:', err),
      );
    }

    // Also attach to the phone-scoped Person (cross-device aggregation).
    // This is what makes a sales dashboard able to say "Rahul (phone X) has
    // submitted 3 leads, across 2 browsers, from these campaigns..."
    if (leadId && phoneForPerson) {
      attachLeadToPerson(phoneForPerson, new ObjectId(leadId)).catch((err) =>
        console.warn('[webhook] attachLeadToPerson failed:', err),
      );
    }

    // 2) Push to Zoho CRM ingest — tracker fields mirror the payload shape the
    //    ASBL web-tracker would auto-inject elsewhere, so Zoho fields line up.
    const crmPayload: Record<string, unknown> = {
      source: 'asbl-loft-ale',
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      project: 'ASBL Loft',
      reason: body.reason ?? body.query ?? 'Chat lead',
      query: body.query ?? null,
      preferred_channel: body.preferredChannel ?? 'whatsapp',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      // First-touch attribution at the PERSON level (cross-device) \u2014
      // preferred over visitor-level because it accumulates across all
      // browsers the same phone has ever used.
      first_touch_source: utmFirst?.source ?? null,
      first_touch_medium: utmFirst?.medium ?? null,
      first_touch_campaign: utmFirst?.campaign ?? null,
      first_touch_content: utmFirst?.content ?? null,
      first_touch_term: utmFirst?.term ?? null,
      first_touch_landing_path: utmFirst?.landingPath ?? null,
      first_touch_at: utmFirst?.at ?? null,
      visitor_id: visitorId ?? null,
      visitor_global_id: person?.globalId ?? visitor?.globalId ?? null,
      visitor_visit_count: visitor?.visitCount ?? null,
      visitor_first_seen_at: visitor?.firstSeenAt ?? null,
      // Person-level aggregation \u2014 "How many times has this human shown up?"
      person_total_visits: person?.visitCount ?? null,
      person_first_seen_at: person?.firstSeenAt ?? null,
      person_device_count: person?.visitorIds?.length ?? null,
      person_prior_lead_count: person?.leadIds?.length ?? null,
      person_utm_history_count: person?.utmHistory?.length ?? null,
      first_page_visited: tracker.first_page_visited ?? null,
      last_page_visited: tracker.last_page_visited ?? null,
      total_page_views: tracker.total_page_views ?? null,
      referrer_url: tracker.referrer_url ?? visitor?.firstUtm?.referrer ?? referer ?? null,
      time_spent_minutes: tracker.time_spent_minutes ?? null,
      booking_type: booking?.type ?? null,
      booking_slot_local: booking?.slotIsoLocal ?? null,
      booking_timezone: booking?.timezone ?? null,
      booking_timezone_detected: booking?.timezoneDetected ?? null,
      booking_timezone_user_overridden: booking?.timezoneUserOverridden ?? null,
      geo_lat: geo?.lat ?? null,
      geo_lng: geo?.lng ?? null,
      geo_accuracy_meters: geo?.accuracy ?? null,
      geo_timezone: geo?.timezone ?? null,
      pinned_units: body.pinnedUnitIds ?? [],
      referer,
      user_agent: ua,
      lead_db_id: leadId,
      captured_at: new Date().toISOString(),
      // Sales-friendly action flags so Zoho views can filter leads by intent
      site_visit_requested: booking?.type === 'site_visit',
      virtual_visit_requested: booking?.type === 'virtual_visit',
      call_back_requested: booking?.type === 'call_back',
      share_requested:
        typeof body.reason === 'string' && /share|brochure|send|pdf|doc/i.test(body.reason),
      lead_type: booking?.type ? `${booking.type}_booking` : body.reason ?? 'chat_lead',
      otp_verified: body.otpVerified === true,
      booking_readable: body.query ?? null,
      // Reschedule flags — Zoho can use these to update the matching existing
      // booking record instead of creating a duplicate lead.
      is_reschedule: booking?.isReschedule === true,
      previous_booking_slot: booking?.previousBooking?.slotIsoLocal ?? null,
      previous_booking_type: booking?.previousBooking?.type ?? null,
      // Resubmission tracking — the same phone has now hit /api/webhook
      // this many times. 0 on first capture, bumps on every reschedule /
      // re-book / re-share via the same number.
      resubmission_count: resubmissionCount,
      is_returning_lead: isReturningLead,
      call_preference: booking?.callPreference ?? null,
    };

    // 3) Parallelise Zoho CRM push + WhatsApp confirmation send. These were
    //    serial earlier which stacked 2\u20133s of Periskope WhatsApp Web latency
    //    on top of CRM roundtrip. Promise.all takes max(CRM, WA) instead of
    //    sum, cutting user-visible wait from ~7s to ~3s.
    const normalisedPhone = normalisePhone(String(body.phone));
    const wasVerified =
      body.otpVerified === true &&
      !!normalisedPhone &&
      (await wasRecentlyVerified(normalisedPhone));

    // Confirmation is sent ONLY for bookings (site visit / call back).
    // - LeadGate unlocks (price, plans, unit_detail) are trivial reveals \u2014 no
    //   confirmation needed; spamming users with "got it" after a tile unlock
    //   is noise
    // - ShareRequestTile has its own /api/share/send which delivers the PDFs
    //   + Anandita's intro, so webhook confirmation would be a duplicate
    const shouldSendConfirmation = wasVerified && !!normalisedPhone && !!booking?.type;

    const confirmationPromise = (async () => {
      if (!shouldSendConfirmation || !normalisedPhone) return { ok: false, skipped: true };
      const message = buildConfirmationMessage({
        name: body.name,
        reason: body.reason ?? body.query,
        booking: booking as { type: string; slotIsoLocal: string; timezone: string } | null,
      });
      // Use the same sender number that delivered the OTP so the visitor sees
      // one continuous WhatsApp thread from a known number.
      const fromE164 = await getLastOtpSender(normalisedPhone);
      const waResult = await sendWhatsApp({
        toE164: normalisedPhone,
        message,
        fromE164: fromE164 ?? undefined,
      });
      if (!waResult.ok) {
        console.warn('[webhook] confirmation WhatsApp send failed', waResult.error);
      }
      return { ok: waResult.ok, fromE164: waResult.fromE164 };
    })();

    const [crm, confirmation] = await Promise.all([
      pushToCrm(crmPayload),
      confirmationPromise,
    ]);

    // Mark lead as pushed (best-effort, non-blocking)
    if (leadId && crm.ok) {
      markLeadCrmPushed(leadId, crm.json).catch((err) =>
        console.warn('[webhook] markLeadCrmPushed failed:', err),
      );
    }
    if (!crm.ok) console.warn('[webhook] CRM push failed:', crm);

    return NextResponse.json({
      success: true,
      leadId,
      crm: { ok: crm.ok, status: crm.status },
      whatsappConfirmationSent: confirmation.ok,
      confirmationFromE164: 'fromE164' in confirmation ? confirmation.fromE164 : null,
    });
  } catch (err) {
    console.error('[api/webhook] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'asbl-loft-lead-webhook' });
}
