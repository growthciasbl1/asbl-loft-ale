import { NextResponse } from 'next/server';
import { hasMongo, getDb } from '@/lib/db/mongo';
import { COLLECTIONS } from '@/lib/db/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public health check. Reveals enough to diagnose whether Mongo is reachable and
 * events are being inserted, WITHOUT leaking any credentials or URIs.
 */
export async function GET() {
  const report: Record<string, unknown> = {
    now: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? 'local',
    env: {
      mongo_uri_configured: !!process.env.MONGODB_URI,
      gemini_api_key_configured: !!process.env.GEMINI_API_KEY,
      crm_ingest_configured: !!process.env.CRM_INGEST_URL,
      admin_token_configured: !!process.env.ADMIN_TOKEN,
    },
  };

  if (!hasMongo()) {
    report.mongo = { status: 'not_configured', message: 'MONGODB_URI is not set on this deployment. Add it to Vercel env vars (all scopes), then redeploy.' };
    return NextResponse.json(report, { status: 200 });
  }

  try {
    const db = await getDb();
    try {
      const collNames = (await db.listCollections().toArray()).map((c) => c.name);
      const eventsCount = collNames.includes('events')
        ? await db.collection(COLLECTIONS.events).countDocuments({})
        : 0;
      const leadsCount = collNames.includes('leads')
        ? await db.collection(COLLECTIONS.leads).countDocuments({})
        : 0;
      report.mongo = {
        status: 'reachable',
        collections: collNames,
        eventsCount,
        leadsCount,
      };
    } catch (e) {
      report.mongo = {
        status: 'connected_but_read_failed',
        error: String((e as Error).message).slice(0, 280),
      };
    }
  } catch (e) {
    report.mongo = {
      status: 'unreachable',
      error: String((e as Error).message).slice(0, 280),
      hint: 'Most likely: (1) IP allowlist in Atlas Network Access blocking Vercel, set to 0.0.0.0/0. (2) MONGODB_URI password wrong. (3) Cluster paused.',
    };
  }

  return NextResponse.json(report, { status: 200 });
}
