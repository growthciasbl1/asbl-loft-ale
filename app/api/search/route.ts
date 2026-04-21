import { NextRequest, NextResponse } from 'next/server';
import { parseSearch, determinePrimaryPath } from '@/lib/utils/searchParser';
import { calculateModuleOrder } from '@/lib/utils/moduleOrder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query ?? '';

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const { intent, confidence } = parseSearch(query);
    const primaryPath = determinePrimaryPath(intent);
    const moduleOrder = calculateModuleOrder(primaryPath, confidence);

    return NextResponse.json({
      intent,
      confidence,
      primaryPath,
      moduleOrder,
    });
  } catch (err) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
