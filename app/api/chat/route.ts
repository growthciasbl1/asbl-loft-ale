import { NextRequest, NextResponse } from 'next/server';
import { routeQuery, type RouterResult } from '@/lib/utils/queryRouter';
import { routeWithLLM, routeWithLLMStream, shouldUseLLM, type ChatHistoryMsg } from '@/lib/llm/gemini';
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

/**
 * Persist chat turn to Mongo in the background. Non-blocking — the response
 * has already been sent by the time this fires. Each write is raced against
 * a 2.5s budget and logged if it times out.
 */
function persistTurnAsync(args: {
  conversationId: string;
  turnNumber: number;
  query: string;
  publicResult: Omit<RouterResult, 'signal' | 'usage' | 'model'>;
  signal: Record<string, unknown> | null;
  usage: ReturnType<typeof getUsage>;
  usedModel: string;
  campaign?: string;
}) {
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

  void Promise.all([
    raceWrite(
      insertSignal(
        args.conversationId,
        args.turnNumber,
        args.query,
        args.publicResult.text,
        args.signal,
        args.publicResult.artifact,
      ),
      'insertSignal',
    ),
    raceWrite(
      appendConversationTurn(args.conversationId, {
        campaign: args.campaign,
        userText: args.query,
        botText: args.publicResult.text,
        botArtifact: args.publicResult.artifact,
        botArtifactLabel: args.publicResult.artifactLabel,
      }),
      'appendConversationTurn',
    ),
    args.usage
      ? raceWrite(
          insertUsage(
            args.conversationId,
            args.turnNumber,
            args.usedModel,
            args.usage,
            args.publicResult.artifact,
          ),
          'insertUsage',
        )
      : Promise.resolve(null),
  ]);
}

// Helper to avoid `any` — we just need the type of whatever insertUsage accepts.
type ExtractUsageParam<T> = T extends (conv: string, turn: number, model: string, usage: infer U, ...rest: unknown[]) => unknown ? U : never;
function getUsage(u: RouterResult['usage']): ExtractUsageParam<typeof insertUsage> | null {
  return (u ?? null) as ExtractUsageParam<typeof insertUsage> | null;
}

export async function POST(req: NextRequest) {
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
    const campaign = typeof body?.campaign === 'string' ? body.campaign : undefined;

    // 1. Regex-first — fast, deterministic, zero-cost. If regex produced a
    //    confident match AND the query isn't comparison/info-shaped, return
    //    as plain JSON (no need to stream a static text blob).
    const regex = routeQuery(query);

    const wantLLM = shouldUseLLM(query, regex.artifact === 'none');
    if (!wantLLM) {
      // Persist in background, return immediately.
      const { signal, usage, model: usedModel, ...publicResult } = regex;
      persistTurnAsync({
        conversationId, turnNumber, query, publicResult,
        signal: (signal ?? null) as Record<string, unknown> | null,
        usage: getUsage(usage),
        usedModel: usedModel ?? 'regex',
        campaign,
      });
      return NextResponse.json({ ...publicResult, conversationId });
    }

    // 2. LLM path — STREAMING. Return SSE so the client can render text
    //    as it arrives (~1-2s TTFT vs 8-15s for full response).
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        // Emit conversationId immediately so the client can scope follow-ups.
        sendEvent('meta', { conversationId });

        try {
          let finalResult: RouterResult | null = null;
          let hadError = false;

          for await (const ev of routeWithLLMStream(query, {
            seenArtifacts: Array.isArray(body?.seenArtifacts) ? body.seenArtifacts : undefined,
            pinnedUnits: Array.isArray(body?.pinnedUnits) ? body.pinnedUnits : undefined,
            campaign,
            history,
          })) {
            if (ev.type === 'text') {
              sendEvent('text', { chunk: ev.chunk });
            } else if (ev.type === 'final') {
              finalResult = ev.result;
            } else if (ev.type === 'error') {
              hadError = true;
              break;
            }
          }

          // If the stream errored, fall back to regex result so the user
          // at least gets something (same behaviour as previous non-stream
          // path when LLM failed).
          if (hadError || !finalResult) {
            finalResult = regex;
          }

          const { signal, usage, model: usedModel, ...publicResult } = finalResult;

          // Terminal event — artifact, label, extras.
          sendEvent('final', { ...publicResult, conversationId });

          // Close stream (client's reader.read() will return done).
          controller.close();

          // Persist to Mongo in the BACKGROUND — happens after the response
          // body is flushed. Same non-blocking pattern as before.
          persistTurnAsync({
            conversationId, turnNumber, query, publicResult,
            signal: (signal ?? null) as Record<string, unknown> | null,
            usage: getUsage(usage),
            usedModel: usedModel ?? 'unknown',
            campaign,
          });
        } catch (err) {
          console.error('[api/chat] stream error:', err);
          sendEvent('error', { message: (err as Error).message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // defeat Nginx buffering if ever proxied
      },
    });
  } catch (err) {
    console.error('[api/chat] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}

// Legacy non-streaming path retained for callers that explicitly ask via
// ?nostream=1. We still default to streaming everywhere else. Left as an
// escape hatch for debugging or for any future consumer that can't read SSE.
// Not used by the web client.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get('nostream') !== '1') {
    return NextResponse.json({ error: 'use POST with SSE, or ?nostream=1 for debug' }, { status: 400 });
  }
  const query = url.searchParams.get('q') ?? '';
  if (!query) return NextResponse.json({ error: 'q required' }, { status: 400 });
  const regex = routeQuery(query);
  if (!shouldUseLLM(query, regex.artifact === 'none')) {
    return NextResponse.json(regex);
  }
  const llm = await routeWithLLM(query, {});
  return NextResponse.json(llm ?? regex);
}
