import { NextRequest, NextResponse } from 'next/server';
import { normalisePhone } from '@/lib/wa/periskope';
import { verifyOtp } from '@/lib/otp/store';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify an OTP. Accepts two proofs — either one is enough:
 *  (a) WhatsApp path: {phone, code} — we check our own Mongo hash.
 *  (b) SMS path: {phone, firebaseIdToken} — we verify the token via Firebase Admin,
 *      and confirm the token's phone_number matches the submitted phone.
 * This lets the user enter an OTP they received on either channel.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = typeof body?.phone === 'string' ? body.phone : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const firebaseIdToken =
      typeof body?.firebaseIdToken === 'string' ? body.firebaseIdToken : null;

    const phoneE164 = normalisePhone(phoneRaw);
    if (!phoneE164) {
      return NextResponse.json({ ok: false, error: 'invalid phone' }, { status: 400 });
    }

    // Path A — Firebase ID token (user already verified with Firebase on the client)
    if (firebaseIdToken) {
      const decoded = await verifyFirebaseIdToken(firebaseIdToken);
      if (decoded?.phone_number) {
        const tokenPhoneDigits = decoded.phone_number.replace(/[^\d]/g, '');
        if (tokenPhoneDigits === phoneE164) {
          return NextResponse.json({
            ok: true,
            verifiedVia: 'firebase_sms',
            phoneE164,
            uid: decoded.uid,
          });
        }
      }
      // Fall through to WhatsApp check if token didn't match
    }

    // Path B — WhatsApp OTP hash
    if (code) {
      const res = await verifyOtp(phoneE164, code);
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          verifiedVia: 'whatsapp_otp',
          phoneE164,
        });
      }
      return NextResponse.json(
        { ok: false, error: res.reason ?? 'wrong_code' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: 'provide either `code` or `firebaseIdToken`' },
      { status: 400 },
    );
  } catch (err) {
    console.error('[api/otp/verify] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
