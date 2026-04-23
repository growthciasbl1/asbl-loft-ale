import { NextRequest, NextResponse } from 'next/server';
import { touchVisitor, resolveVisitor, type UtmInput } from '@/lib/db/visitors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pickString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed && trimmed.length <= 200 ? trimmed : null;
}

/**
 * Called on every page load (homepage, chat, variant routes). Given a
 * browser-scoped visitorId + current URL UTM params + referrer, touches
 * the visitors collection.
 *
 * Attribution model is first-touch + last-touch + full history (see
 * touchVisitor in lib/db/visitors.ts).
 *
 * Body: {
 *   visitorId: string,
 *   utm?: { source, medium, campaign, content, term },
 *   referrer?: string,
 *   landingPath?: string,
 *   conversationId?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : '';
    if (!visitorId || visitorId.length < 5) {
      return NextResponse.json({ ok: false, error: 'invalid visitorId' }, { status: 400 });
    }

    const utmRaw = body?.utm && typeof body.utm === 'object' ? body.utm : {};
    const utm: UtmInput = {
      source: pickString(utmRaw.source),
      medium: pickString(utmRaw.medium),
      campaign: pickString(utmRaw.campaign),
      content: pickString(utmRaw.content),
      term: pickString(utmRaw.term),
      referrer: pickString(body?.referrer),
      landingPath: pickString(body?.landingPath),
    };

    const conversationId = pickString(body?.conversationId);

    await touchVisitor({
      visitorId,
      utm,
      conversationId,
    });

    const visitor = await resolveVisitor(visitorId);
    if (!visitor) {
      return NextResponse.json({ ok: true, exists: false, verified: false });
    }

    return NextResponse.json({
      ok: true,
      exists: true,
      verified: !!visitor.verifiedAt,
      visitCount: visitor.visitCount,
      firstSeenAt: visitor.firstSeenAt,
      firstUtm: visitor.firstUtm,
      lastUtm: visitor.lastUtm,
      lead: visitor.verifiedAt
        ? {
            name: visitor.name,
            phoneE164: visitor.phoneE164,
            email: visitor.email,
            preferredChannel: visitor.preferredChannel,
            globalId: visitor.globalId,
          }
        : null,
    });
  } catch (err) {
    console.error('[api/visitor/resolve] error:', err);
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
}
