import { NextRequest, NextResponse } from 'next/server';
import { normalisePhone, sendWhatsApp, buildOtpMessage } from '@/lib/wa/periskope';
import { generateOtp, saveOtp } from '@/lib/otp/store';
import { sendMsg91Otp, hasMsg91 } from '@/lib/sms/msg91';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a single OTP and fire it on BOTH channels in parallel:
 *   - WhatsApp via Periskope (primary; always fires — round-robin across 8 business numbers)
 *   - SMS via MSG91 (secondary; only fires if MSG91_TEMPLATE_ID env is set)
 * Same code on both channels so the user can enter whichever arrives first.
 *
 * Body: { phone: string, name?: string }
 * Response: { ok, sentVia: ['whatsapp'] | ['whatsapp', 'sms'], fromE164?, smsOk? }
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

    // Fire both channels in parallel — same OTP code
    const [waResult, smsResult] = await Promise.all([
      sendWhatsApp({ toE164: phoneE164, message }),
      hasMsg91()
        ? sendMsg91Otp({ toE164: phoneE164, otp, name: name ?? undefined })
        : Promise.resolve({ ok: false, reason: 'not_configured' as const }),
    ]);

    // At least one channel must succeed — otherwise the user has no code.
    const sentVia: ('whatsapp' | 'sms')[] = [];
    if (waResult.ok) sentVia.push('whatsapp');
    if (smsResult.ok) sentVia.push('sms');

    if (sentVia.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'all_channels_failed',
          whatsapp: { error: waResult.error, status: waResult.status },
          sms: { reason: (smsResult as { reason?: string }).reason, error: (smsResult as { error?: string }).error },
        },
        { status: 502 },
      );
    }

    const saved = await saveOtp({
      phoneE164,
      otp,
      sentVia,
      lastSenderE164: waResult.fromE164 ?? undefined,
    });

    if (!saved) {
      console.error('[api/otp/send] Channels OK but saveOtp failed', { phoneE164 });
      return NextResponse.json({ ok: false, error: 'otp_store_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      sentVia,
      fromE164: waResult.fromE164 ?? null,
      smsOk: smsResult.ok,
      whatsappOk: waResult.ok,
    });
  } catch (err) {
    console.error('[api/otp/send] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
