import { getDb, getBucket, hasMongo } from './mongo';
import { COLLECTIONS, MediaDoc } from './schemas';
import { MEDIA_LIBRARY, MediaItem, IntentTag, pickMedia as pickStatic } from '@/lib/utils/mediaLibrary';
import { ObjectId } from 'mongodb';

/**
 * Resolve a media item URL the client can actually render.
 * - If stored via GridFS: /api/media/<mediaId>
 * - If stored with externalUrl: that URL
 */
function urlFor(doc: Pick<MediaDoc, 'mediaId' | 'gridFsId' | 'externalUrl'>): string {
  if (doc.externalUrl) return doc.externalUrl;
  return `/api/media/${doc.mediaId}`;
}

function docToItem(doc: MediaDoc): MediaItem {
  return {
    id: doc.mediaId,
    kind: doc.kind,
    title: doc.title,
    caption: doc.caption,
    src: urlFor(doc),
    aspect: doc.aspect,
    intentTags: doc.intentTags as IntentTag[],
    audienceTags: doc.audienceTags as MediaItem['audienceTags'],
    leadGated: doc.leadGated,
  };
}

export async function findMediaById(mediaId: string): Promise<MediaItem | null> {
  if (hasMongo()) {
    try {
      const db = await getDb();
      const doc = await db.collection<MediaDoc>(COLLECTIONS.media).findOne({ mediaId });
      if (doc) return docToItem(doc);
    } catch (err) {
      console.error('[db/media] mongo lookup failed:', err);
    }
  }
  return MEDIA_LIBRARY.find((m) => m.id === mediaId) ?? null;
}

export interface MediaPickCtx {
  intent: IntentTag | IntentTag[];
  audience?: MediaItem['audienceTags'];
  gated?: boolean;
  limit?: number;
}

export async function pickMediaFromDb(ctx: MediaPickCtx): Promise<MediaItem[]> {
  const intents = Array.isArray(ctx.intent) ? ctx.intent : [ctx.intent];
  const limit = ctx.limit ?? 3;

  if (hasMongo()) {
    try {
      const db = await getDb();
      const filter: Record<string, unknown> = { intentTags: { $in: intents } };
      if (ctx.gated === false) filter.leadGated = { $ne: true };
      const docs = await db
        .collection<MediaDoc>(COLLECTIONS.media)
        .find(filter)
        .limit(limit * 3)
        .toArray();
      if (docs.length > 0) {
        const scored = docs
          .map((d) => {
            const intentHit = d.intentTags.filter((t) => intents.includes(t as IntentTag)).length;
            let score = intentHit * 10;
            if (ctx.audience && d.audienceTags) {
              score += d.audienceTags.filter((a) => ctx.audience!.includes(a as any)).length * 4;
            }
            return { d, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        return scored.map((s) => docToItem(s.d));
      }
    } catch (err) {
      console.error('[db/media] mongo pick failed:', err);
    }
  }

  return pickStatic({ intent: intents, audience: ctx.audience, gated: ctx.gated, limit });
}

/**
 * Stream the GridFS-backed blob. Meant for the Next API route.
 * Returns the Node stream plus content-type + length if known.
 */
export async function openMediaStream(mediaId: string) {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const doc = await db.collection<MediaDoc>(COLLECTIONS.media).findOne({ mediaId });
    if (!doc?.gridFsId) return null;
    const bucket = await getBucket();
    const stream = bucket.openDownloadStream(doc.gridFsId);
    return { stream, mimeType: doc.mimeType || 'application/octet-stream', title: doc.title };
  } catch (err) {
    console.error('[db/media] openMediaStream failed:', err);
    return null;
  }
}

export async function insertMediaMeta(
  meta: Omit<MediaDoc, '_id' | 'uploadedAt'>
): Promise<string | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    await db
      .collection<MediaDoc>(COLLECTIONS.media)
      .insertOne({ ...meta, uploadedAt: new Date() });
    return meta.mediaId;
  } catch (err) {
    console.error('[db/media] insertMediaMeta failed:', err);
    return null;
  }
}

export async function uploadToGridFs(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<ObjectId | null> {
  if (!hasMongo()) return null;
  try {
    const bucket = await getBucket();
    return new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, { metadata: { contentType: mimeType } });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id as ObjectId));
      stream.end(buffer);
    });
  } catch (err) {
    console.error('[db/media] uploadToGridFs failed:', err);
    return null;
  }
}
