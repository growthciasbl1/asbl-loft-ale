import { NextRequest, NextResponse } from 'next/server';
import { openMediaStream, findMediaById } from '@/lib/db/media';
import { hasMongo } from '@/lib/db/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (!hasMongo()) {
    return NextResponse.json({ error: 'mongo not configured' }, { status: 503 });
  }

  // If item has an externalUrl, redirect there instead of streaming.
  const meta = await findMediaById(id);
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (meta.src && !meta.src.startsWith('/api/media/')) {
    return NextResponse.redirect(meta.src, 302);
  }

  const result = await openMediaStream(id);
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Node stream → Web ReadableStream for Next.js response
  const nodeStream = result.stream as unknown as NodeJS.ReadableStream;
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk as Uint8Array));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      (nodeStream as any).destroy?.();
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
