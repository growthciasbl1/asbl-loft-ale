/**
 * Seed ASBL Loft MongoDB with unit inventory.
 * Run: `npm run seed`
 *
 * Pulls from in-memory ASBL_LOFT_DATA and upserts into the `units` collection.
 * Safe to re-run — uses unitId as idempotency key.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { ASBL_LOFT_DATA } from '../lib/utils/asblData';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'asbl_loft';

  if (!uri) {
    console.error('❌ MONGODB_URI not set. Add it to .env.local and try again.');
    process.exit(1);
  }

  console.log(`→ Connecting to ${dbName}…`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Units
  const unitsCol = db.collection('units');
  await unitsCol.createIndex({ unitId: 1 }, { unique: true });
  await unitsCol.createIndex({ available: 1, facing: 1, size: 1 });
  await unitsCol.createIndex({ tower: 1, floor: 1 });

  const now = new Date();
  const bulkOps = ASBL_LOFT_DATA.units.map((u) => ({
    updateOne: {
      filter: { unitId: u.id },
      update: {
        $set: {
          unitId: u.id,
          tower: u.tower,
          floor: u.floor,
          facing: u.facing,
          size: u.size,
          basePrice: u.basePrice,
          gst: u.gst,
          totalPrice: u.totalPrice,
          available: u.available,
          expectedRental: u.expectedRental,
          roiPercentage: u.roiPercentage,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  }));
  if (bulkOps.length > 0) {
    const r = await unitsCol.bulkWrite(bulkOps);
    console.log(`✓ units: ${r.upsertedCount} inserted, ${r.modifiedCount} updated`);
  }

  // Media indexes (collection auto-created on first insert via /api/media/upload)
  const mediaCol = db.collection('media');
  await mediaCol.createIndex({ mediaId: 1 }, { unique: true });
  await mediaCol.createIndex({ intentTags: 1 });
  await mediaCol.createIndex({ audienceTags: 1 });
  console.log('✓ media indexes ensured');

  // Leads indexes
  const leadsCol = db.collection('leads');
  await leadsCol.createIndex({ phone: 1 });
  await leadsCol.createIndex({ createdAt: -1 });
  await leadsCol.createIndex({ utmCampaign: 1 });
  console.log('✓ leads indexes ensured');

  // Conversations indexes
  const convCol = db.collection('conversations');
  await convCol.createIndex({ conversationId: 1 }, { unique: true });
  await convCol.createIndex({ updatedAt: -1 });
  console.log('✓ conversations indexes ensured');

  // Events indexes
  const eventsCol = db.collection('events');
  await eventsCol.createIndex({ sessionId: 1, serverAt: -1 });
  await eventsCol.createIndex({ type: 1, name: 1, serverAt: -1 });
  await eventsCol.createIndex({ utmCampaign: 1, serverAt: -1 });
  await eventsCol.createIndex({ serverAt: -1 });
  console.log('✓ events indexes ensured');

  await client.close();
  console.log('\n✨ Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
