import { NextResponse } from 'next/server';
import { getDb, hasMongo } from '@/lib/db/mongo';
import { COLLECTIONS } from '@/lib/db/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Aggregate traffic + engagement + GPU-cost metrics for the /admin/traffic
 * dashboard. Everything lives in the `events` + `llm_usage` + `leads`
 * Mongo collections — this endpoint fans out a handful of aggregation
 * pipelines in parallel and returns the shaped data.
 *
 * Windows: last 1h, 24h, 7d, 30d + all-time total.
 * - Events per window (total, by type, by name, unique sessions)
 * - LLM usage per window (calls, tokens, cost)
 * - Lead + booking conversion funnel per window
 */

function windowStart(hoursBack: number): Date {
  return new Date(Date.now() - hoursBack * 3600 * 1000);
}

async function aggregateEventCounts(cutoff: Date) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.events);
  const [total, bySession, byTypeAgg, byNameAgg] = await Promise.all([
    col.countDocuments({ serverAt: { $gte: cutoff } }),
    col
      .aggregate([
        { $match: { serverAt: { $gte: cutoff } } },
        { $group: { _id: '$sessionId' } },
        { $count: 'count' },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { serverAt: { $gte: cutoff } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { serverAt: { $gte: cutoff } } },
        { $group: { _id: '$name', count: { $sum: 1 }, type: { $first: '$type' } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
  ]);
  return {
    total,
    uniqueSessions: (bySession[0]?.count as number) ?? 0,
    byType: byTypeAgg.map((r) => ({ type: r._id, count: r.count })),
    topNames: byNameAgg.map((r) => ({ name: r._id, type: r.type, count: r.count })),
  };
}

async function aggregateFunnel(cutoff: Date) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.events);
  const stages = [
    { key: 'page_view', filter: { type: 'view', name: { $regex: /^tile:|^landing_|^bot_response$/ } } },
    { key: 'form_focus', filter: { type: 'focus', name: { $regex: /_focus$/ } } },
    { key: 'otp_send', filter: { name: { $regex: /_otp_send_click$|^otp_send_success$/ } } },
    { key: 'lead_success', filter: { name: 'lead_success' } },
    { key: 'booking', filter: { name: { $in: ['visit_booking', 'virtual_visit_booking', 'call_booking'] } } },
  ];
  const results = await Promise.all(
    stages.map(async (s) => {
      const unique = await col
        .aggregate([
          { $match: { serverAt: { $gte: cutoff }, ...s.filter } },
          { $group: { _id: '$sessionId' } },
          { $count: 'n' },
        ])
        .toArray();
      return { key: s.key, uniqueSessions: (unique[0]?.n as number) ?? 0 };
    }),
  );
  return results;
}

async function aggregateLlmUsage(cutoff: Date) {
  const db = await getDb();
  const col = db.collection('llm_usage');
  const agg = await col
    .aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          costUsd: { $sum: '$costUsd' },
        },
      },
    ])
    .toArray();
  const row = agg[0] as { calls?: number; totalTokens?: number; costUsd?: number } | undefined;
  return {
    calls: row?.calls ?? 0,
    totalTokens: row?.totalTokens ?? 0,
    costUsd: row?.costUsd ?? 0,
    costInr: Math.round((row?.costUsd ?? 0) * 95 * 100) / 100,
  };
}

async function aggregateLeads(cutoff: Date) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.leads);
  const [leads, bookings, reschedules] = await Promise.all([
    col.countDocuments({ createdAt: { $gte: cutoff } }),
    col.countDocuments({
      createdAt: { $gte: cutoff },
      'booking.type': { $in: ['site_visit', 'virtual_visit', 'call_back'] },
    }),
    col.countDocuments({
      updatedAt: { $gte: cutoff },
      resubmissionCount: { $gte: 1 },
    }),
  ]);
  return { leads, bookings, reschedules };
}

async function windowSnapshot(hoursBack: number) {
  const cutoff = windowStart(hoursBack);
  if (!hasMongo()) {
    return {
      events: { total: 0, uniqueSessions: 0, byType: [], topNames: [] },
      funnel: [],
      llm: { calls: 0, totalTokens: 0, costUsd: 0, costInr: 0 },
      leads: { leads: 0, bookings: 0, reschedules: 0 },
    };
  }
  const [events, funnel, llm, leads] = await Promise.all([
    aggregateEventCounts(cutoff),
    aggregateFunnel(cutoff),
    aggregateLlmUsage(cutoff),
    aggregateLeads(cutoff),
  ]);
  return { events, funnel, llm, leads };
}

export async function GET() {
  try {
    const [h1, h24, h24x7, h24x30, allTime] = await Promise.all([
      windowSnapshot(1),
      windowSnapshot(24),
      windowSnapshot(24 * 7),
      windowSnapshot(24 * 30),
      windowSnapshot(24 * 365 * 10), // effectively all
    ]);
    return NextResponse.json({
      ok: true,
      mongoConnected: hasMongo(),
      now: new Date().toISOString(),
      windows: {
        lastHour: h1,
        last24h: h24,
        last7d: h24x7,
        last30d: h24x30,
        allTime,
      },
    });
  } catch (err) {
    console.error('[api/admin/traffic] error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
