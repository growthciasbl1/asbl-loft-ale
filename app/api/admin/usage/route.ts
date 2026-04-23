import { NextRequest, NextResponse } from 'next/server';
import { hasMongo, getDb } from '@/lib/db/mongo';
import { PRICING, USD_TO_INR } from '@/lib/db/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TotalsAgg {
  prompt: number;
  cached: number;
  candidates: number;
  total: number;
  usd: number;
  inr: number;
  calls: number;
}

function emptyTotals(): TotalsAgg {
  return { prompt: 0, cached: 0, candidates: 0, total: 0, usd: 0, inr: 0, calls: 0 };
}

function addToTotals(t: TotalsAgg, doc: Record<string, number>) {
  t.prompt += doc.promptTokens ?? 0;
  t.cached += doc.cachedContentTokens ?? 0;
  t.candidates += doc.candidatesTokens ?? 0;
  t.total += doc.totalTokens ?? 0;
  t.usd += doc.costUsd ?? 0;
  // Always compute INR from USD × current rate. The stored costInr on each
  // Mongo doc was written at whatever rate was active when the call
  // happened (old docs at 87, new docs at 95) — for the dashboard we want
  // a single consistent rate applied to all historical data. costUsd is
  // rate-agnostic, so we re-price here.
  t.inr += (doc.costUsd ?? 0) * USD_TO_INR;
  t.calls += 1;
}

export async function GET(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ADMIN_TOKEN not configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const urlToken = req.nextUrl.searchParams.get('token');
  if (supplied !== token && urlToken !== token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasMongo()) {
    return NextResponse.json({ error: 'Mongo not configured' }, { status: 503 });
  }

  const db = await getDb();
  const col = db.collection('llm_usage');

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);
  startOfMonth.setHours(0, 0, 0, 0);

  // Aggregate via $facet — one query returns all windows + artifact breakdown.
  const pipeline = [
    {
      $facet: {
        today: [
          { $match: { createdAt: { $gte: startOfDay } } },
          {
            $group: {
              _id: null,
              promptTokens: { $sum: '$promptTokens' },
              cachedContentTokens: { $sum: '$cachedContentTokens' },
              candidatesTokens: { $sum: '$candidatesTokens' },
              totalTokens: { $sum: '$totalTokens' },
              costUsd: { $sum: '$costUsd' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
              calls: { $sum: 1 },
            },
          },
        ],
        week: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          {
            $group: {
              _id: null,
              promptTokens: { $sum: '$promptTokens' },
              cachedContentTokens: { $sum: '$cachedContentTokens' },
              candidatesTokens: { $sum: '$candidatesTokens' },
              totalTokens: { $sum: '$totalTokens' },
              costUsd: { $sum: '$costUsd' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
              calls: { $sum: 1 },
            },
          },
        ],
        month: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              promptTokens: { $sum: '$promptTokens' },
              cachedContentTokens: { $sum: '$cachedContentTokens' },
              candidatesTokens: { $sum: '$candidatesTokens' },
              totalTokens: { $sum: '$totalTokens' },
              costUsd: { $sum: '$costUsd' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
              calls: { $sum: 1 },
            },
          },
        ],
        allTime: [
          {
            $group: {
              _id: null,
              promptTokens: { $sum: '$promptTokens' },
              cachedContentTokens: { $sum: '$cachedContentTokens' },
              candidatesTokens: { $sum: '$candidatesTokens' },
              totalTokens: { $sum: '$totalTokens' },
              costUsd: { $sum: '$costUsd' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
              calls: { $sum: 1 },
            },
          },
        ],
        byArtifact: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: '$artifactKind',
              calls: { $sum: 1 },
              totalTokens: { $sum: '$totalTokens' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
            },
          },
          { $sort: { calls: -1 } },
          { $limit: 20 },
        ],
        byDay: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
              },
              calls: { $sum: 1 },
              totalTokens: { $sum: '$totalTokens' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byConversation: [
          {
            $group: {
              _id: '$conversationId',
              calls: { $sum: 1 },
              totalTokens: { $sum: '$totalTokens' },
              costInr: { $sum: { $multiply: ['$costUsd', USD_TO_INR] } },
              lastAt: { $max: '$createdAt' },
            },
          },
          { $sort: { costInr: -1 } },
          { $limit: 15 },
        ],
      },
    },
  ];

  const [res] = await col.aggregate(pipeline).toArray();

  // Project a 20k/day linear scaled monthly estimate from today's numbers
  const today = res.today[0] ?? emptyTotals();
  const callsToday = today.calls ?? 0;
  const usdToday = today.costUsd ?? 0;
  const scalingAssumption = {
    assumed_daily_users_at_scale: 20000,
    daily_calls_today: callsToday,
    projected_monthly_usd:
      callsToday > 0
        ? Number(((usdToday / Math.max(callsToday, 1)) * 100_000 * 30).toFixed(2))
        : null,
    note:
      'Projection = (avg cost/call today) × 100,000 LLM calls/day (20K users × 5 turns avg) × 30 days.',
  };

  return NextResponse.json({
    now: now.toISOString(),
    pricing: {
      input_per_1m_tokens_usd: (PRICING.input * 1_000_000).toFixed(4),
      cached_input_per_1m_tokens_usd: (PRICING.cachedInput * 1_000_000).toFixed(5),
      output_per_1m_tokens_usd: (PRICING.output * 1_000_000).toFixed(4),
      usd_to_inr: USD_TO_INR,
    },
    windows: {
      today: today,
      last7days: res.week[0] ?? emptyTotals(),
      last30days: res.month[0] ?? emptyTotals(),
      allTime: res.allTime[0] ?? emptyTotals(),
    },
    byArtifact: res.byArtifact,
    byDay: res.byDay,
    topConversationsByCost: res.byConversation,
    scalingAssumption,
  });
}
