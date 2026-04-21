import { NextRequest, NextResponse } from 'next/server';
import { suggestNext } from '@/lib/llm/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const suggestions = await suggestNext({
      seenArtifacts: Array.isArray(body?.seenArtifacts) ? body.seenArtifacts : undefined,
      pinnedUnits: Array.isArray(body?.pinnedUnits) ? body.pinnedUnits : undefined,
      campaign: typeof body?.campaign === 'string' ? body.campaign : undefined,
    });
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[api/suggest] error:', err);
    return NextResponse.json({ suggestions: [] });
  }
}
