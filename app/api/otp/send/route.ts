import { NextRequest, NextResponse } from 'next/server';
import { normalisePhone, sendWhatsApp, buildOtpMessage } from '@/lib/wa/periskope';
import { generateOtp, saveOtp } from '@/lib/otp/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate and send an OTP via WhatsApp (Periskope round-robin).
 * SMS fallback happens client-side via Firebase Phone Auth separately —
 * that flow has its own OTP that's verified via Firebase ID token.
 *
 * Body: { phone: string, name?: string }
 * Response: { ok: boolean, sentVia: 'whatsapp' | null, fromE164?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = typeof body?.phone === 'string' ? body.phone : '';
    const name = typeof body?.name === 'string' ? body.name : null;

    const phoneE164 = normalisePhone(phoneRaw);
    if (!phoneE164) {
      return NextResponse.json({ ok: false, error: 'invalid phone' }, { status: 400 });
    }

    const otp = generateOtp();
    const message = buildOtpMessage(name, otp);

    const result = await sendWhatsApp({ toE164: phoneE164, message });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: 'whatsapp_send_failed', detail: result.error ?? result.status },
        { status: 502 },
      );
    }

    const saved = await saveOtp({
      phoneE164,
      otp,
      sentVia: ['whatsapp'],
      lastSenderE164: result.fromE164 ?? undefined,
    });

    if (!saved) {
      // Periskope sent the OTP but DB write failed — user got the code but we can't verify it.
      // Log and return a clear error so the user retries.
      console.error('[api/otp/send] Periskope OK but saveOtp failed', { phoneE164 });
      return NextResponse.json({ ok: false, error: 'otp_store_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      sentVia: 'whatsapp',
      fromE164: result.fromE164,
      // Do not return the OTP itself — client doesn't need it.
    });
  } catch (err) {
    console.error('[api/otp/send] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
