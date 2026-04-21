import { NextRequest, NextResponse } from 'next/server';
import { hasMongo, getDb } from '@/lib/db/mongo';
import { COLLECTIONS } from '@/lib/db/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-gated diagnostic endpoint. Reveals the exact reason Mongo inserts are failing.
 * Hit with:
 *   curl -H "authorization: Bearer $ADMIN_TOKEN" https://<domain>/api/admin/diag
 */
export async function GET(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ADMIN_TOKEN not configured on server' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (supplied !== token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const report: Record<string, unknown> = {
    now: new Date().toISOString(),
    runtime: process.env.VERCEL ? 'vercel' : 'local',
    region: process.env.VERCEL_REGION ?? null,
    envCheck: {
      MONGODB_URI_set: !!process.env.MONGODB_URI,
      MONGODB_URI_host_hint: process.env.MONGODB_URI
        ? process.env.MONGODB_URI.replace(/:\/\/[^@]+@/, '://***:***@').replace(/\/.*$/, '/...')
        : null,
      MONGODB_DB: process.env.MONGODB_DB ?? 'asbl_loft (default)',
      GEMINI_API_KEY_set: !!process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash (default)',
      CRM_INGEST_URL: process.env.CRM_INGEST_URL ?? null,
      ADMIN_TOKEN_set: true,
    },
    hasMongo: hasMongo(),
  };

  if (!hasMongo()) {
    report.verdict = 'MONGODB_URI is missing — add it to Vercel environment variables for all scopes (Production + Preview + Development), then redeploy.';
    return NextResponse.json(report);
  }

  // Try to reach Mongo
  try {
    const db = await getDb();
    try {
      const collNames = await db.listCollections().toArray();
      report.listCollections = collNames.map((c) => c.name);
    } catch (e) {
      report.listCollectionsError = (e as Error).message;
    }

    // Try a sample insert + count
    try {
      const col = db.collection(COLLECTIONS.events);
      const r = await col.insertOne({
        sessionId: 'diag',
        type: 'system',
        name: 'diag_ping',
        serverAt: new Date(),
        clientAt: new Date(),
        note: 'diagnostic ping from /api/admin/diag',
      });
      report.insertOk = true;
      report.insertedId = r.insertedId.toHexString();
    } catch (e) {
      report.insertOk = false;
      report.insertError = (e as Error).message;
    }

    // Count events
    try {
      const count = await db.collection(COLLECTIONS.events).countDocuments({});
      report.eventsCount = count;
    } catch (e) {
      report.countError = (e as Error).message;
    }

    if (report.insertOk) {
      report.verdict = 'Mongo reachable + writeable. Events collection is live. Recent insert id: ' + report.insertedId;
    } else {
      report.verdict = 'Mongo reachable for listCollections but insert failed. See insertError.';
    }
  } catch (e) {
    report.mongoError = (e as Error).message;
    report.verdict =
      'Cannot connect to MongoDB. Most likely: IP allowlist blocking Vercel (set Atlas Network Access to 0.0.0.0/0), or MONGODB_URI has wrong credentials, or cluster is paused.';
  }

  return NextResponse.json(report, { status: 200 });
}
