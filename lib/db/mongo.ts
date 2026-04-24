import { MongoClient, Db, GridFSBucket, MongoClientOptions } from 'mongodb';

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'asbl_loft';

// Aggressive timeouts so a sick cluster does NOT hang the whole Vercel
// lambda for 30 seconds (the driver default). Production symptoms: chat
// responses stalling at 30-40s, OTP sends failing because pickNextSender
// was awaiting a dead Mongo. With these, Mongo operations fail fast and
// callers can degrade gracefully instead of blocking the user.
const MONGO_OPTS: MongoClientOptions = {
  // Fail server selection (connect, pick primary) in 3s instead of 30s.
  serverSelectionTimeoutMS: 3000,
  // Underlying TCP connect gets 5s — still generous for cross-region.
  connectTimeoutMS: 5000,
  // Individual ops (find/insert) fail after 8s rather than hanging.
  socketTimeoutMS: 8000,
  // Small pool per lambda — Atlas free/shared tiers choke on too many.
  maxPoolSize: 10,
  minPoolSize: 0,
  // Keep the connection warm across invocations.
  maxIdleTimeMS: 60_000,
};

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

  // Cache the client promise on globalThis in BOTH dev and prod. Previously
  // prod created a new MongoClient per cold-start, but warm lambdas still
  // re-used the module-level variable via Node's require cache — except
  // that's fragile on Vercel where the module can be re-evaluated across
  // invocations. A `global.` cache is the bulletproof pattern.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(URI, MONGO_OPTS).connect();
  }
  return global._mongoClientPromise;
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
