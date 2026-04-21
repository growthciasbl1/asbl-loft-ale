/**
 * Upload every image in a local folder to MongoDB GridFS + register metadata in the `media` collection.
 * Run: `npm run upload-media -- /absolute/path/to/folder`
 *
 * Auto-tags media by filename pattern so the LLM / media picker can find them later.
 * Safe to re-run: updates by mediaId.
 */
import 'dotenv/config';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

interface TaggedMeta {
  mediaId: string;
  title: string;
  kind: 'image' | 'video' | 'pdf' | 'embed' | 'audio';
  mimeType: string;
  intentTags: string[];
  audienceTags?: string[];
  leadGated?: boolean;
}

function mimeOf(ext: string): string {
  const e = ext.toLowerCase();
  if (e === '.webp') return 'image/webp';
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.svg') return 'image/svg+xml';
  if (e === '.mp4') return 'video/mp4';
  if (e === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function kindOf(mime: string): TaggedMeta['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  return 'image';
}

function inferTags(filename: string): { intentTags: string[]; audienceTags?: string[]; title: string } {
  const lower = basename(filename).toLowerCase();
  const tags = new Set<string>();
  let title = basename(filename, extname(filename)).replace(/[-_]+/g, ' ').trim();

  if (lower.includes('master') && lower.includes('plan')) {
    tags.add('master-plan').add('aerial');
    title = 'Master plan · site landscape';
  }
  if (lower.includes('tower-plan') || lower.includes('tower_plan') || /tower.?[ab]/.test(lower)) {
    tags.add('floor-plan').add('tower');
    title = /tower.?a/.test(lower) ? 'Tower A · floor plan' : /tower.?b/.test(lower) ? 'Tower B · floor plan' : 'Tower plan';
  }
  if (/1695.*east/.test(lower) || /east.*1695/.test(lower)) {
    tags.add('floor-plan').add('unit-detail');
    title = '1,695 sq.ft · East facing';
  }
  if (/1695.*west/.test(lower) || /west.*1695/.test(lower)) {
    tags.add('floor-plan').add('unit-detail');
    title = '1,695 sq.ft · West facing';
  }
  if (/1870/.test(lower)) {
    tags.add('floor-plan').add('unit-detail');
    title = '1,870 sq.ft floor plan';
  }
  if (/uc-tower|under.?construction|construction/.test(lower)) {
    tags.add('construction-update').add('exterior');
    title = /tower.?a/.test(lower) ? 'Tower A · construction update' : 'Tower B · construction update';
  }
  if (/rera/.test(lower)) {
    tags.add('legal');
    title = 'TS RERA certificate';
  }
  if (/logo/.test(lower)) {
    tags.add('brand');
    title = 'ASBL Loft logo';
  }
  if (/amenit|pool|gym|club|play|pet|park/.test(lower)) {
    tags.add('amenity').add('lifestyle');
  }
  if (/school/.test(lower)) {
    tags.add('school');
  }
  if (/price|cost|breakdown/.test(lower)) {
    tags.add('price');
  }
  if (/rent|yield/.test(lower)) {
    tags.add('yield').add('rental-market');
  }
  if (/brochure|page-/.test(lower)) {
    tags.add('brochure');
  }

  if (tags.size === 0) tags.add('lifestyle');

  return {
    intentTags: Array.from(tags),
    title,
  };
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: npm run upload-media -- /absolute/path/to/folder');
    process.exit(1);
  }
  try {
    statSync(folder);
  } catch {
    console.error(`Folder not found: ${folder}`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'asbl_loft';
  if (!uri) {
    console.error('MONGODB_URI not set in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const bucket = new GridFSBucket(db, { bucketName: 'media' });
  const mediaCol = db.collection('media');
  await mediaCol.createIndex({ mediaId: 1 }, { unique: true });
  await mediaCol.createIndex({ intentTags: 1 });

  const files = readdirSync(folder).filter((f) => !f.startsWith('.') && !f.startsWith('__'));
  console.log(`Found ${files.length} files in ${folder}\n`);

  let done = 0;
  for (const file of files) {
    const ext = extname(file);
    const mime = mimeOf(ext);
    const kind = kindOf(mime);
    const mediaId = basename(file, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const { intentTags, title } = inferTags(file);
    const buffer = readFileSync(join(folder, file));

    // If existing media doc has a gridFsId, delete it first
    const existing = await mediaCol.findOne({ mediaId });
    if (existing?.gridFsId) {
      try {
        await bucket.delete(existing.gridFsId as ObjectId);
      } catch {
        // ignore
      }
    }

    // Upload new blob
    const gridFsId: ObjectId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(file, { metadata: { contentType: mime } });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id as ObjectId));
      stream.end(buffer);
    });

    await mediaCol.updateOne(
      { mediaId },
      {
        $set: {
          mediaId,
          kind,
          title,
          mimeType: mime,
          gridFsId,
          intentTags,
          uploadedAt: new Date(),
        },
      },
      { upsert: true },
    );

    done++;
    console.log(
      `✓ ${String(done).padStart(2, '0')}/${files.length}  ${mediaId.padEnd(36)}  [${intentTags.join(', ')}]`,
    );
  }

  await client.close();
  console.log(`\n✨ Uploaded ${done} files to GridFS, metadata in db.media.`);
  console.log(`\nAccess each via: GET /api/media/<mediaId>`);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
