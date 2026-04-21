import { NextRequest, NextResponse } from 'next/server';
import { routeQuery } from '@/lib/utils/queryRouter';
import { routeWithLLM, shouldUseLLM } from '@/lib/llm/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query ?? '';

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // 1. Regex-first: fast, deterministic, zero-cost
    const regex = routeQuery(query);

    // 2. Only reach for OpenAI when:
    //    - regex couldn't confidently match, OR
    //    - the query is comparison / market-insight / judgment-ish
    if (shouldUseLLM(query, regex.artifact === 'none')) {
      const llm = await routeWithLLM(query, {
        seenArtifacts: Array.isArray(body?.seenArtifacts) ? body.seenArtifacts : undefined,
        pinnedUnits: Array.isArray(body?.pinnedUnits) ? body.pinnedUnits : undefined,
        campaign: typeof body?.campaign === 'string' ? body.campaign : undefined,
      });
      if (llm) return NextResponse.json(llm);
    }

    return NextResponse.json(regex);
  } catch (err) {
    console.error('[api/chat] error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
