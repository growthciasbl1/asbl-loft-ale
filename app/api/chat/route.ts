import { NextRequest, NextResponse } from 'next/server';
import { routeQuery, type RouterResult } from '@/lib/utils/queryRouter';
import { routeWithLLM, shouldUseLLM, type ChatHistoryMsg } from '@/lib/llm/gemini';
import { insertSignal } from '@/lib/db/signals';
import { appendConversationTurn } from '@/lib/db/conversations';

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

    // 3. Extract signal, save to conversation_signals and conversations collections
    const { signal, ...publicResult } = finalResult;

    // Await the Mongo writes — fire-and-forget was getting orphaned on Vercel
    // Lambda cold starts (promises dropped when handler returned). Adds ~100-500ms
    // but guarantees persistence. Both calls are already try/catch wrapped so
    // failures log and return null without throwing.
    await Promise.allSettled([
      insertSignal(
        conversationId,
        turnNumber,
        query,
        publicResult.text,
        signal ?? null,
        publicResult.artifact,
      ),
      appendConversationTurn(conversationId, {
        campaign: typeof body?.campaign === 'string' ? body.campaign : undefined,
        userText: query,
        botText: publicResult.text,
        botArtifact: publicResult.artifact,
        botArtifactLabel: publicResult.artifactLabel,
      }),
    ]);

    return NextResponse.json({ ...publicResult, conversationId });
  } catch (err) {
    console.error('[api/chat] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
