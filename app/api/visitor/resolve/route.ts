import { NextRequest, NextResponse } from 'next/server';
import { touchVisitor, resolveVisitor } from '@/lib/db/visitors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called when the chat loads. Given a browser-scoped visitorId, returns the
 * persisted lead data (if any) so the UI can skip the lead form for
 * returning users. Also updates lastSeenAt + visit count.
 *
 * Body: { visitorId: string, utm?: {...}, conversationId?: string }
 * Response: { exists: boolean, verified: boolean, lead?: {name, phoneE164, ...} }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : '';
    if (!visitorId || visitorId.length < 5) {
      return NextResponse.json({ ok: false, error: 'invalid visitorId' }, { status: 400 });
    }

    const utm = body?.utm && typeof body.utm === 'object' ? body.utm : undefined;
    const conversationId =
      typeof body?.conversationId === 'string' ? body.conversationId : null;

    // Touch first so a brand-new visitor gets inserted.
    await touchVisitor({
      visitorId,
      utm: utm
        ? {
            source: typeof utm.source === 'string' ? utm.source : null,
            campaign: typeof utm.campaign === 'string' ? utm.campaign : null,
            medium: typeof utm.medium === 'string' ? utm.medium : null,
          }
        : undefined,
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
