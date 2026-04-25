import { NextRequest, NextResponse } from 'next/server';
import { hasMongo, getDb } from '@/lib/db/mongo';
import { COLLECTIONS } from '@/lib/db/schemas';
import { pickNextSender } from '@/lib/wa/numbers';

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
      PAID_LLM_API_KEY_set: !!(process.env.PAID_LLM_API_KEY || process.env.RAG_API_KEY),
      PERISKOPE_API_TOKEN_set: !!process.env.PERISKOPE_API_TOKEN,
      PERISKOPE_API_BASE: process.env.PERISKOPE_API_BASE ?? 'https://api.periskope.app/v1 (default)',
      MSG91_TEMPLATE_ID_set: !!process.env.MSG91_TEMPLATE_ID,
      CRM_INGEST_URL: process.env.CRM_INGEST_URL ?? null,
      ADMIN_TOKEN_set: true,
    },
    hasMongo: hasMongo(),
  };

  // Periskope probe — sends a no-op API call to verify the token works
  // and a sender number can be picked. Does NOT send a real message
  // unless ?testPhone=919... query param is supplied (then it sends a
  // throwaway "diag ping" so you can confirm end-to-end delivery).
  const periskopeReport: Record<string, unknown> = {};
  try {
    if (!process.env.PERISKOPE_API_TOKEN) {
      periskopeReport.skipped = 'PERISKOPE_API_TOKEN not set';
    } else {
      const sender = await pickNextSender();
      periskopeReport.pickedSender = sender;
      const base = process.env.PERISKOPE_API_BASE || 'https://api.periskope.app/v1';
      // Lightweight token-validity check: fetch the contacts list with limit=1.
      // Returns 401/403 if the token is dead, 200 if alive.
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(`${base}/contacts?limit=1`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.PERISKOPE_API_TOKEN}`,
            ...(sender ? { 'x-phone': sender } : {}),
          },
          signal: ctrl.signal,
        });
        const text = await res.text().catch(() => '');
        periskopeReport.tokenProbe = {
          status: res.status,
          ok: res.ok,
          bodyPreview: text.slice(0, 300),
        };
      } catch (e) {
        periskopeReport.tokenProbe = { error: (e as Error).message };
      } finally {
        clearTimeout(t);
      }
      // Optional real send — only if ?testPhone=919XXXXXXXXX in URL
      const url = new URL(req.url);
      const testPhone = url.searchParams.get('testPhone');
      if (testPhone && /^\d{11,14}$/.test(testPhone) && sender) {
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), 12000);
        try {
          const res = await fetch(`${base}/message/send`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.PERISKOPE_API_TOKEN}`,
              'Content-Type': 'application/json',
              'x-phone': sender,
            },
            body: JSON.stringify({
              chat_id: `${testPhone}@c.us`,
              message: `[ASBL Loft diag] test ping at ${new Date().toISOString()}. Reply ignored.`,
            }),
            signal: ctrl2.signal,
          });
          const text = await res.text().catch(() => '');
          periskopeReport.testSend = {
            toE164: testPhone,
            fromE164: sender,
            status: res.status,
            ok: res.ok,
            bodyPreview: text.slice(0, 500),
          };
        } catch (e) {
          periskopeReport.testSend = { error: (e as Error).message };
        } finally {
          clearTimeout(t2);
        }
      } else if (testPhone) {
        periskopeReport.testSend = { skipped: 'invalid testPhone (expect 11-14 digits, no +)' };
      }
    }
  } catch (e) {
    periskopeReport.error = (e as Error).message;
  }
  report.periskope = periskopeReport;

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
