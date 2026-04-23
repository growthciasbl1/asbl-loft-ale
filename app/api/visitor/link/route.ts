import { NextRequest, NextResponse } from 'next/server';
import { normalisePhone, upsertPeriskopeContact } from '@/lib/wa/periskope';
import { linkVisitorPhone } from '@/lib/db/visitors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called right after a successful OTP verification.
 * Links the browser's visitorId to the verified phone number, creates
 * (or reuses) a globalId, and pushes the contact to Periskope so the
 * sales team sees the lead in their WhatsApp inbox immediately.
 *
 * Body: { visitorId, phone, name, preferredChannel? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : '';
    const phoneRaw = typeof body?.phone === 'string' ? body.phone : '';
    const name = typeof body?.name === 'string' ? body.name : '';
    const preferredChannel =
      body?.preferredChannel === 'call' ? 'call' : 'whatsapp';

    const phoneE164 = normalisePhone(phoneRaw);
    if (!visitorId || !phoneE164 || !name) {
      return NextResponse.json({ ok: false, error: 'invalid input' }, { status: 400 });
    }

    // 1. Link visitor → phone → globalId in Mongo
    const { globalId, isReturningUser } = await linkVisitorPhone({
      visitorId,
      phoneE164,
      name,
      preferredChannel,
    });

    // 2. Push contact to Periskope so sales sees the lead in WhatsApp inbox
    const periskope = await upsertPeriskopeContact({
      toE164: phoneE164,
      name,
      labels: [
        'website-lead',
        'asbl-loft',
        preferredChannel === 'call' ? 'prefers-call' : 'prefers-whatsapp',
        isReturningUser ? 'returning-user' : 'new-lead',
      ],
    });

    return NextResponse.json({
      ok: true,
      globalId,
      isReturningUser,
      periskopePushed: periskope.ok,
    });
  } catch (err) {
    console.error('[api/visitor/link] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
