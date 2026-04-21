import { MongoClient, Db, GridFSBucket } from 'mongodb';

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'asbl_loft';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env.local (dev) or Vercel env (prod).'
    );
  }

  if (process.env.NODE_ENV === 'development') {
    // Reuse across hot-reloads in dev
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(URI).connect();
    }
    return global._mongoClientPromise;
  }

  // One client per lambda cold-start in prod
  return new MongoClient(URI).connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

export async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: 'media' });
}

export function hasMongo(): boolean {
  return !!URI;
}
