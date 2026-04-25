import { NextRequest, NextResponse } from 'next/server';
import { routeQuery, type RouterResult, type ArtifactKind } from '@/lib/utils/queryRouter';
import { routeWithLLM, routeWithLLMStream, shouldUseLLM, type ChatHistoryMsg } from '@/lib/llm/gemini';
import { classifyIntentRAG } from '@/lib/llm/freeRag';
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

    // 1.5  Free RAG intent classifier — runs ONLY when regex didn't match
    //      a concrete artifact. Classifies the query into one of the 19
    //      ArtifactKind tokens via a free local model (qwen2.5:1.5b on
    //      our internal RAG server). Hard 3s timeout. If the server is
    //      down (maintenance) or returns "unsure" / off-list, this is
    //      silently null and we fall through to Gemini doing both
    //      routing + prose — exact same behaviour as before.
    let ragArtifact: ArtifactKind | null = null;
    if (regex.artifact === 'none') {
      ragArtifact = await classifyIntentRAG(query);
      if (ragArtifact === 'none') ragArtifact = null;
    }

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

        // Emit conversationId + any regex-predicted artifact immediately.
        // If the regex router already matched a concrete artifact for this
        // query, send it NOW so the client can render the tile while the
        // LLM's text is still streaming in above. Gives a much smoother
        // "tile + prose both appear together" experience instead of the
        // previous "text streams in, then tile jumps in at the end".
        // Pre-classified artifact = whichever the regex matched. If the
        // regex returned 'none', use whatever the free RAG classifier
        // returned (could still be null if RAG was down or unsure — that
        // case falls through to Gemini deciding artifact in its final
        // event). Either source produces the same client meta payload
        // shape, so the tile renders immediately on stream start.
        const earlyArtifact: ArtifactKind | null =
          regex.artifact !== 'none' ? regex.artifact : ragArtifact;

        sendEvent('meta', {
          conversationId,
          regexArtifact:
            earlyArtifact !== null
              ? {
                  artifact: earlyArtifact,
                  artifactLabel:
                    regex.artifact !== 'none'
                      ? regex.artifactLabel
                      : undefined,
                  unitId: regex.unitId,
                  salaryLakh: regex.salaryLakh,
                  existingEmi: regex.existingEmi,
                  visitIntro: regex.visitIntro,
                  shareSubject: regex.shareSubject,
                  initialBookingType: regex.initialBookingType,
                  focus: regex.focus,
                  preferredChannel: regex.preferredChannel,
                  originalQuery: regex.originalQuery,
                  source:
                    regex.artifact !== 'none' ? 'regex' : 'free_rag',
                }
              : null,
        });

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

          // CRITICAL: when regex OR free RAG identified an artifact, use
          // it. Regex wins (most deterministic). RAG wins when regex was
          // 'none'. Don't let the LLM drop or swap to a different kind —
          // models occasionally skip render_artifact or pick a wrong tile.
          //
          // Text-merging rule: use LLM's richer text when it's genuinely
          // richer than the curated intro. Fall back to the regex/RAG
          // text on known fallbacks ("Happy to dig deeper", "Here you go").
          if (regex.artifact !== 'none') {
            const llmText = (finalResult.text ?? '').trim();
            const stripped = llmText.replace(/<[^>]+>/g, '').trim();
            const regexStripped = (regex.text ?? '').replace(/<[^>]+>/g, '').trim();
            const isFallback =
              !stripped ||
              /^happy to dig deeper/i.test(stripped) ||
              /^here you go\.?$/i.test(stripped);
            const isRicher = stripped.length > 80 && stripped.length >= regexStripped.length * 0.8;
            const useLlmText = !isFallback && isRicher;
            finalResult = {
              ...regex,
              text: useLlmText ? finalResult.text : regex.text,
              signal: finalResult.signal,
              usage: finalResult.usage,
              model: finalResult.model,
            };
          } else if (ragArtifact && finalResult.artifact === 'none') {
            // RAG classified it but LLM didn't render an artifact. Trust
            // the RAG label — keep the LLM's prose, attach the RAG-picked
            // tile so the user sees both.
            finalResult = {
              ...finalResult,
              artifact: ragArtifact,
              artifactLabel: undefined, // let the tile self-label
            };
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
