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
// This route chains several Periskope calls (up to 4 docs + 1 intro = 5 WhatsApp
// sends, each 3-5s). Vercel default 10s Hobby timeout kills the function
// mid-send so only the caption text arrives while the actual document never
// attaches. Bumping to 60s so the whole chain can finish.
export const maxDuration = 60;

function resolvePublicHost(req: NextRequest): string {
  // Priority order — MUST resolve to a publicly-reachable URL so Periskope
  // can fetch the PDFs. Critical bug (2026-04-23): we used to prefer
  // process.env.VERCEL_URL which returns the per-deployment URL like
  // `asbl-loft-j0cbuqims-xxx.vercel.app` — that URL is locked behind
  // Vercel's Deployment Protection, so Periskope would queue the send but
  // fail to fetch the file, delivering only the caption text.
  // Now: explicit env override > request's host header (canonical domain
  // like asbl-loft-ale.vercel.app) > hardcoded canonical > deploy URL.
  const envHost = process.env.NEXT_PUBLIC_SITE_HOST;
  if (envHost) return envHost.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const hostHeader = req.headers.get('host');
  // Accept real production / project domains. Reject per-deployment URLs
  // (they contain short hashes like -j0cbuqims-).
  if (hostHeader && !/-[a-z0-9]{9}-.*\.vercel\.app$/i.test(hostHeader)) {
    return hostHeader;
  }

  // Last resort — the stable project alias
  return 'asbl-loft-ale.vercel.app';
}

function buildIntroMessage(name: string | null | undefined, assetCount: number): string {
  const firstName = name?.split(/\s+/)[0] ?? 'there';
  const s = assetCount === 1 ? 'document' : `${assetCount} documents`;
  return (
    `Hi ${firstName},\n\n` +
    `Sharing the ${s} you requested.\n\n` +
    `I am ${ANANDITA_NAME}, your dedicated Relationship Manager at ASBL Loft. ` +
    `Please feel free to reply to this thread with any questions about pricing, ` +
    `availability, floor plans, or anything else. I will respond within a few hours.\n\n` +
    `${ANANDITA_NAME}\n` +
    `ASBL Loft`
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

    // 1) Send all documents in parallel from Anandita's number. Periskope's
    //    own queue handles delivery ordering on WhatsApp's side, so we don't
    //    need to serialise on our end. Parallel cuts total latency from
    //    sum(per-doc) to max(per-doc) — critical for staying under Vercel's
    //    serverless limit when there are 3-4 PDFs.
    const results = await Promise.all(
      assets.map(async (a) => {
        const publicUrl = `${baseUrl}${encodeURI(a.url)}`;
        const res = await sendWhatsAppDocument({
          toE164: phoneE164,
          fromE164: ANANDITA_E164,
          url: publicUrl,
          filename: a.filename,
          caption: a.caption,
          timeoutMs: 15000,
        });
        if (!res.ok) {
          console.warn('[api/share/send] document send failed:', a.id, publicUrl, res.error);
        }
        return { asset: a.id, ok: res.ok, status: res.status, error: res.error, url: publicUrl };
      }),
    );

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
