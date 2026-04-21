import { NextRequest, NextResponse } from 'next/server';
import { insertEvents, IncomingEvent } from '@/lib/db/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validateBatch(body: unknown): IncomingEvent[] {
  if (!body || typeof body !== 'object') return [];
  const arr = (body as { events?: unknown }).events;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((e): e is IncomingEvent => {
      if (!e || typeof e !== 'object') return false;
      const x = e as Partial<IncomingEvent>;
      return (
        typeof x.type === 'string' &&
        typeof x.name === 'string' &&
        typeof x.sessionId === 'string' &&
        typeof x.at === 'number'
      );
    })
    .slice(0, 50); // hard cap per batch
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = validateBatch(body);
    if (!events.length) return NextResponse.json({ ok: true, inserted: 0 });

    const userAgent = req.headers.get('user-agent') ?? undefined;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      undefined;

    const inserted = await insertEvents(events, { userAgent, ip });
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error('[api/events] error:', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
