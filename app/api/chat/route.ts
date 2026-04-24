import { NextRequest, NextResponse } from 'next/server';
import { routeQuery, type RouterResult } from '@/lib/utils/queryRouter';
import { routeWithLLM, shouldUseLLM, type ChatHistoryMsg } from '@/lib/llm/gemini';
import { insertSignal } from '@/lib/db/signals';
import { appendConversationTurn } from '@/lib/db/conversations';
import { insertUsage } from '@/lib/db/usage';
import { checkRateLimit, getClientKey, rateLimitHeaders } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function coerceHistory(input: unknown): ChatHistoryMsg[] {
  if (!Array.isArray(input)) return [];
  const out: ChatHistoryMsg[] = [];
  for (const x of input) {
    if (!x || typeof x !== 'object') continue;
    const rec = x as { role?: unknown; text?: unknown };
    const role: 'user' | 'bot' = rec.role === 'bot' ? 'bot' : 'user';
    const text = typeof rec.text === 'string' ? rec.text : '';
    if (text.trim()) out.push({ role, text });
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Rate limit: 1000 chat messages per minute per client. Loose cap —
  // just a runaway-loop circuit breaker. Office NAT shares one IP across
  // many users, so keep this generous.
  const rl = checkRateLimit('chat', getClientKey(req), { maxRequests: 1000, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }
  try {
    const body = await req.json();
    const query: string = body?.query ?? '';

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const conversationId: string =
      typeof body?.conversationId === 'string' && body.conversationId
        ? body.conversationId
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const history = coerceHistory(body?.history);
    const turnNumber = history.filter((m) => m.role === 'user').length + 1;

    // 1. Regex-first: fast, deterministic, zero-cost
    const regex = routeQuery(query);

    // 2. LLM path when regex can't confidently match or query is comparison/info-shaped
    let finalResult: RouterResult = regex;
    if (shouldUseLLM(query, regex.artifact === 'none')) {
      const llm = await routeWithLLM(query, {
        seenArtifacts: Array.isArray(body?.seenArtifacts) ? body.seenArtifacts : undefined,
        pinnedUnits: Array.isArray(body?.pinnedUnits) ? body.pinnedUnits : undefined,
        campaign: typeof body?.campaign === 'string' ? body.campaign : undefined,
        history,
      });
      if (llm) finalResult = llm;
    }

    // 3. Extract signal + usage, strip internals before returning.
    const { signal, usage, model: usedModel, ...publicResult } = finalResult;

    // CRITICAL: Mongo writes are now non-blocking. Previously we awaited
    // Promise.allSettled of 3 Mongo writes here — if Mongo stalled (sick
    // cluster, IP-allowlist miss, paused Atlas) the user waited 30+ seconds
    // on every chat reply. Now: race each write against a 2.5s budget, log
    // if they time out, but DO NOT hold up the response. Each inner call
    // is already try/catch wrapped, so the race loses silently.
    const raceWrite = <T>(p: Promise<T>, label: string): Promise<T | null> =>
      Promise.race([
        p.catch((e) => {
          console.warn(`[api/chat] mongo write failed (${label}):`, (e as Error).message);
          return null;
        }),
        new Promise<null>((resolve) =>
          setTimeout(() => {
            console.warn(`[api/chat] mongo write timed out (${label})`);
            resolve(null);
          }, 2500),
        ),
      ]);

    // Kick off — no await. Vercel will keep the lambda alive for these
    // briefly after the response; they're expected to land within ~2.5s
    // or be logged as timed-out and dropped.
    void Promise.all([
      raceWrite(
        insertSignal(
          conversationId,
          turnNumber,
          query,
          publicResult.text,
          signal ?? null,
          publicResult.artifact,
        ),
        'insertSignal',
      ),
      raceWrite(
        appendConversationTurn(conversationId, {
          campaign: typeof body?.campaign === 'string' ? body.campaign : undefined,
          userText: query,
          botText: publicResult.text,
          botArtifact: publicResult.artifact,
          botArtifactLabel: publicResult.artifactLabel,
        }),
        'appendConversationTurn',
      ),
      usage
        ? raceWrite(
            insertUsage(
              conversationId,
              turnNumber,
              usedModel ?? 'unknown',
              usage,
              publicResult.artifact,
            ),
            'insertUsage',
          )
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ ...publicResult, conversationId });
  } catch (err) {
    console.error('[api/chat] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
