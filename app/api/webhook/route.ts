import { NextRequest, NextResponse } from 'next/server';
import { insertLead, markLeadCrmPushed } from '@/lib/db/leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRM_INGEST_URL =
  process.env.CRM_INGEST_URL || 'https://asbl-crm-api.vercel.app/api/ingest/website';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.phone || !body?.name) {
      return NextResponse.json({ error: 'name and phone are required' }, { status: 400 });
    }

    const referer = req.headers.get('referer') || '';
    const ua = req.headers.get('user-agent') || '';

    // 1) Persist lead in Mongo (no-op if MONGODB_URI missing)
    const leadId = await insertLead({
      name: body.name,
      phone: body.phone,
      email: body.email,
      reason: body.reason ?? body.query ?? undefined,
      initialQuery: body.initialQuery,
      currentQuery: body.query,
      utmSource: body.utmSource,
      utmCampaign: body.utmCampaign,
      utmMedium: body.utmMedium,
      pinnedUnitIds: Array.isArray(body.pinnedUnitIds) ? body.pinnedUnitIds : undefined,
      conversationId: body.conversationId,
    });

    // 2) Push to Zoho CRM ingest endpoint
    const crmPayload = {
      source: 'asbl-loft-ale',
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      project: 'ASBL Loft',
      reason: body.reason ?? body.query ?? 'Chat lead',
      query: body.query ?? null,
      utm_source: body.utmSource ?? null,
      utm_campaign: body.utmCampaign ?? null,
      utm_medium: body.utmMedium ?? null,
      pinned_units: body.pinnedUnitIds ?? [],
      referer,
      user_agent: ua,
      lead_db_id: leadId,
      captured_at: new Date().toISOString(),
    };

    const crm = await pushToCrm(crmPayload);

    // 3) Mark lead as pushed (best-effort)
    if (leadId && crm.ok) {
      await markLeadCrmPushed(leadId, crm.json);
    }

    if (!crm.ok) {
      console.warn('[webhook] CRM push failed:', crm);
    }

    return NextResponse.json({
      success: true,
      leadId,
      crm: { ok: crm.ok, status: crm.status },
    });
  } catch (err) {
    console.error('[api/webhook] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'asbl-loft-lead-webhook' });
}
