import { NextRequest, NextResponse } from 'next/server';
import { insertLead, markLeadCrmPushed } from '@/lib/db/leads';
import type { LeadBooking, LeadGeo } from '@/lib/db/schemas';
import { wasRecentlyVerified } from '@/lib/otp/store';
import { normalisePhone, sendWhatsApp } from '@/lib/wa/periskope';

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
      `Hi ${firstName} — your *ASBL Loft site visit* is confirmed for ${when}.\n\n` +
      `One of our RMs will WhatsApp you the exact meeting point + their direct number.\n\n` +
      `Questions? Just reply to this chat.\n\n— ASBL Loft`
    );
  }
  if (input.booking?.type === 'call_back' && when) {
    return (
      `Hi ${firstName} — a call-back is booked for ${when}.\n\n` +
      `One of our RMs will ring you on the dot.\n\n— ASBL Loft`
    );
  }
  return (
    `Hi ${firstName} — got it. One of our RMs will reach out on WhatsApp shortly regarding "${input.reason ?? 'your request'}".\n\n— ASBL Loft`
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

    // UTMs: form-supplied beats tracker-supplied beats empty
    const utmSource = body.utmSource ?? tracker.utm_source ?? null;
    const utmCampaign = body.utmCampaign ?? tracker.utm_campaign ?? null;
    const utmMedium = body.utmMedium ?? tracker.utm_medium ?? null;
    const utmContent = tracker.utm_content ?? null;
    const utmTerm = tracker.utm_term ?? null;

    const booking =
      body.booking && typeof body.booking === 'object'
        ? {
            type: body.booking.type === 'call_back' ? 'call_back' : 'site_visit',
            slotIsoLocal: String(body.booking.slotIsoLocal ?? ''),
            timezone: String(body.booking.timezone ?? 'Asia/Kolkata'),
            timezoneDetected: String(body.booking.timezoneDetected ?? 'Asia/Kolkata'),
            timezoneUserOverridden: Boolean(body.booking.timezoneUserOverridden),
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

    // 1) Persist lead in Mongo (no-op if MONGODB_URI missing)
    const leadId = await insertLead({
      name: body.name,
      phone: body.phone,
      email: body.email,
      reason: body.reason ?? body.query ?? undefined,
      initialQuery: body.initialQuery,
      currentQuery: body.query,
      utmSource: utmSource ?? undefined,
      utmCampaign: utmCampaign ?? undefined,
      utmMedium: utmMedium ?? undefined,
      preferredChannel: body.preferredChannel === 'call' ? 'call' : 'whatsapp',
      booking: booking as LeadBooking | null,
      geo: geo as LeadGeo | null,
      pinnedUnitIds: Array.isArray(body.pinnedUnitIds) ? body.pinnedUnitIds : undefined,
      conversationId: body.conversationId,
    });

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
      utm_campaign: utmCampaign,
      utm_medium: utmMedium,
      utm_content: utmContent,
      utm_term: utmTerm,
      first_page_visited: tracker.first_page_visited ?? null,
      last_page_visited: tracker.last_page_visited ?? null,
      total_page_views: tracker.total_page_views ?? null,
      referrer_url: tracker.referrer_url ?? referer ?? null,
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
      call_back_requested: booking?.type === 'call_back',
      share_requested:
        typeof body.reason === 'string' && /share|brochure|send|pdf|doc/i.test(body.reason),
      lead_type: booking?.type ? `${booking.type}_booking` : body.reason ?? 'chat_lead',
      otp_verified: body.otpVerified === true,
      booking_readable: body.query ?? null,
    };

    const crm = await pushToCrm(crmPayload);

    // 3) Mark lead as pushed (best-effort)
    if (leadId && crm.ok) {
      await markLeadCrmPushed(leadId, crm.json);
    }

    if (!crm.ok) {
      console.warn('[webhook] CRM push failed:', crm);
    }

    // 4) Send a WhatsApp confirmation via Periskope — best effort, non-blocking.
    //    Runs only when the lead came through the verified-OTP path so we don't
    //    ping unverified numbers (WhatsApp ToS + avoids spam-flag risk).
    let whatsappConfirmationSent = false;
    const normalisedPhone = normalisePhone(String(body.phone));

    // Bug fix: OTP store saves phoneE164 in E.164-normalised form ("919XXXXXXXXX").
    // Previously we queried wasRecentlyVerified(body.phone) which could be
    // "9415117000" (10 digits) \u2192 zero matches \u2192 confirmation never sent.
    const wasVerified =
      body.otpVerified === true &&
      !!normalisedPhone &&
      (await wasRecentlyVerified(normalisedPhone));

    if (wasVerified && normalisedPhone) {
      const message = buildConfirmationMessage({
        name: body.name,
        reason: body.reason ?? body.query,
        booking: booking as { type: string; slotIsoLocal: string; timezone: string } | null,
      });
      const waResult = await sendWhatsApp({ toE164: normalisedPhone, message });
      whatsappConfirmationSent = waResult.ok;
      if (!waResult.ok) {
        console.warn('[webhook] confirmation WhatsApp send failed', waResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      crm: { ok: crm.ok, status: crm.status },
      whatsappConfirmationSent,
    });
  } catch (err) {
    console.error('[api/webhook] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'asbl-loft-lead-webhook' });
}
