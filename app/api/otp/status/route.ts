import { NextRequest, NextResponse } from 'next/server';
import { normalisePhone } from '@/lib/wa/periskope';
import { wasRecentlyVerified } from '@/lib/otp/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Query whether a given phone already completed OTP verification within the
 * recent window (default 10 min). Used by LeadGate / VisitTile / ShareRequest
 * to skip the OTP step when the user already verified in this session on a
 * prior tile — they should not have to redo it for every form.
 *
 * Body: { phone: string }
 * Response: { verified: boolean }
 *
 * Security note: the actual action endpoints (/api/webhook, /api/share/send)
 * independently revalidate wasRecentlyVerified server-side before saving a
 * lead or sending documents. This route is for UX hinting only — skipping
 * the OTP prompt requires the server-side gate to then agree.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = typeof body?.phone === 'string' ? body.phone : '';
    const phoneE164 = normalisePhone(phoneRaw);
    if (!phoneE164) {
      return NextResponse.json({ ok: false, error: 'invalid phone' }, { status: 400 });
    }
    const verified = await wasRecentlyVerified(phoneE164);
    return NextResponse.json({ ok: true, verified });
  } catch (err) {
    console.error('[api/otp/status] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
