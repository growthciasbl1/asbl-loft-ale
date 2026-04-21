import { NextRequest, NextResponse } from 'next/server';
import { insertMediaMeta, uploadToGridFs } from '@/lib/db/media';
import { hasMongo } from '@/lib/db/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'application/pdf',
];

function checkAdmin(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return supplied === token;
}

export async function POST(req: NextRequest) {
  if (!hasMongo()) {
    return NextResponse.json({ error: 'mongo not configured' }, { status: 503 });
  }
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const mediaId = String(form.get('mediaId') || '').trim();
    const kind = String(form.get('kind') || 'image');
    const title = String(form.get('title') || '').trim();
    const caption = form.get('caption') ? String(form.get('caption')) : undefined;
    const aspect = form.get('aspect') ? String(form.get('aspect')) : undefined;
    const intentTagsRaw = String(form.get('intentTags') || '');
    const audienceTagsRaw = String(form.get('audienceTags') || '');
    const leadGated = form.get('leadGated') === 'true';
    const externalUrl = form.get('externalUrl') ? String(form.get('externalUrl')) : undefined;

    if (!mediaId || !title) {
      return NextResponse.json({ error: 'mediaId and title are required' }, { status: 400 });
    }
    if (!['image', 'video', 'pdf', 'embed', 'audio'].includes(kind)) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
    }

    const intentTags = intentTagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    const audienceTags = audienceTagsRaw
      ? audienceTagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    let gridFsId: ReturnType<typeof uploadToGridFs> extends Promise<infer T> ? T : never = null;
    let mimeType: string | undefined;

    if (file && typeof file !== 'string') {
      const blob = file as unknown as Blob & { name: string; type: string };
      mimeType = blob.type || 'application/octet-stream';
      if (!ALLOWED_MIME.includes(mimeType)) {
        return NextResponse.json({ error: `unsupported mime ${mimeType}` }, { status: 400 });
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      gridFsId = await uploadToGridFs(blob.name || mediaId, mimeType, buffer);
    } else if (!externalUrl) {
      return NextResponse.json(
        { error: 'either `file` or `externalUrl` is required' },
        { status: 400 }
      );
    }

    await insertMediaMeta({
      mediaId,
      kind: kind as 'image' | 'video' | 'pdf' | 'embed' | 'audio',
      title,
      caption,
      aspect,
      intentTags,
      audienceTags,
      leadGated,
      externalUrl,
      gridFsId: gridFsId ?? undefined,
      mimeType,
    });

    return NextResponse.json({ ok: true, mediaId, gridFsId: gridFsId?.toHexString() ?? null });
  } catch (err) {
    console.error('[api/media/upload] error:', err);
    return NextResponse.json({ error: 'upload failed' }, { status: 500 });
  }
}
