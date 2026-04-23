import { NextRequest, NextResponse } from 'next/server';
import {
  normalisePhone,
  sendWhatsApp,
  sendWhatsAppDocument,
  ANANDITA_E164,
  ANANDITA_NAME,
} from '@/lib/wa/periskope';
import { wasRecentlyVerified } from '@/lib/otp/store';
import { resolveAssets } from '@/lib/share/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolvePublicHost(req: NextRequest): string {
  // Priority: explicit env > Vercel URL > request host
  const envHost = process.env.NEXT_PUBLIC_SITE_HOST;
  if (envHost) return envHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL; // automatically set on Vercel
  if (vercelUrl) return vercelUrl;
  const hostHeader = req.headers.get('host') ?? 'asbl-loft-ale.vercel.app';
  return hostHeader;
}

function buildIntroMessage(name: string | null | undefined, assetCount: number): string {
  const firstName = name?.split(/\s+/)[0] ?? 'there';
  const s = assetCount === 1 ? 'document' : `${assetCount} documents`;
  return (
    `Hi ${firstName}, sharing the ${s} you asked for.\n\n` +
    `Main *${ANANDITA_NAME}* from ASBL Loft hoon — aapki personal RM assigned. ` +
    `Koi bhi question ho, yahi reply kar do — I'll get back within a few hours.\n\n` +
    `— ${ANANDITA_NAME} · ASBL Loft`
  );
}

/**
 * Deliver the assets the user asked for via WhatsApp. Gated by recent OTP
 * verification — client MUST have completed /api/otp/verify for this phone
 * in the last 10 minutes, otherwise we refuse and sales never gets pinged.
 *
 * Everything (documents + handoff intro) goes from Anandita's number so
 * the visitor sees one continuous WhatsApp thread with their RM.
 *
 * Body: { phone, name, subject }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneRaw = typeof body?.phone === 'string' ? body.phone : '';
    const name = typeof body?.name === 'string' ? body.name : null;
    const subject = typeof body?.subject === 'string' ? body.subject : null;

    const phoneE164 = normalisePhone(phoneRaw);
    if (!phoneE164) {
      return NextResponse.json({ ok: false, error: 'invalid phone' }, { status: 400 });
    }

    // Server-side OTP gate — cannot be bypassed by client claims.
    const verified = await wasRecentlyVerified(phoneE164);
    if (!verified) {
      return NextResponse.json({ ok: false, error: 'otp_not_verified' }, { status: 403 });
    }

    const assets = resolveAssets(subject);
    if (assets.length === 0) {
      return NextResponse.json({ ok: false, error: 'no_assets_matched' }, { status: 404 });
    }

    const host = resolvePublicHost(req);
    const baseUrl = `https://${host}`;

    // 1) Send each document one by one, from Anandita's number.
    //    Periskope needs a publicly reachable URL — we use our own Vercel host.
    const results = [];
    for (const a of assets) {
      const publicUrl = `${baseUrl}${a.url}`;
      const res = await sendWhatsAppDocument({
        toE164: phoneE164,
        fromE164: ANANDITA_E164,
        url: publicUrl,
        filename: a.filename,
        caption: a.caption,
      });
      results.push({ asset: a.id, ok: res.ok, status: res.status, error: res.error });
      if (!res.ok) {
        console.warn('[api/share/send] document send failed:', a.id, res.error);
      }
    }

    // 2) Anandita's personal handoff message — so user knows who will follow up
    const introMsg = buildIntroMessage(name, assets.length);
    const introRes = await sendWhatsApp({
      toE164: phoneE164,
      message: introMsg,
      fromE164: ANANDITA_E164,
    });

    const allDocsSent = results.every((r) => r.ok);
    return NextResponse.json({
      ok: allDocsSent && introRes.ok,
      sent: results,
      introSent: introRes.ok,
      fromE164: ANANDITA_E164,
      assignedTo: ANANDITA_NAME,
      assetCount: assets.length,
    });
  } catch (err) {
    console.error('[api/share/send] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
