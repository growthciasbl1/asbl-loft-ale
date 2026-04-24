import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'asbl_loft';

if (!URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const t0 = Date.now();
const client = new MongoClient(URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

try {
  await client.connect();
  const connectMs = Date.now() - t0;
  console.log(`\n✅ CONNECTED in ${connectMs}ms`);

  const db = client.db(DB_NAME);
  const admin = db.admin();

  const ping = await admin.ping();
  console.log('  ping:', ping);

  const collections = await db.listCollections().toArray();
  console.log(`\n📂 Collections in "${DB_NAME}" (${collections.length}):`);
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments({});
    console.log(`   - ${c.name.padEnd(24)} ${count.toLocaleString()} docs`);
  }

  // Diagnostic reads on critical paths
  console.log('\n🔎 Critical checks:');

  const wa = await db.collection('wa_numbers').find({}).limit(20).toArray();
  console.log(`   wa_numbers:     ${wa.length} numbers, ${wa.filter(n => n.active).length} active`);
  if (wa.length === 0) console.log('   ⚠️  wa_numbers EMPTY — OTP sender pool is unseeded');

  const leads = await db.collection('leads').countDocuments({});
  const events = await db.collection('events').countDocuments({});
  const convs = await db.collection('conversations').countDocuments({});
  console.log(`   leads:          ${leads.toLocaleString()}`);
  console.log(`   events:         ${events.toLocaleString()}`);
  console.log(`   conversations:  ${convs.toLocaleString()}`);

  // Latest write timestamp across events
  const lastEvent = await db.collection('events').find({}).sort({ serverAt: -1 }).limit(1).toArray();
  if (lastEvent[0]) {
    const lag = Date.now() - new Date(lastEvent[0].serverAt).getTime();
    console.log(`   last event:     ${new Date(lastEvent[0].serverAt).toISOString()}  (${Math.round(lag/60000)} min ago)`);
  }

  // Test write latency
  const w0 = Date.now();
  await db.collection('events').insertOne({
    sessionId: 'diag_cli',
    type: 'system',
    name: 'cli_ping',
    serverAt: new Date(),
    clientAt: new Date(),
    note: 'diagnostic from local CLI',
  });
  console.log(`   test insert:    ${Date.now() - w0}ms`);

  const serverStatus = await admin.serverStatus();
  console.log(`\n🖥  Server: ${serverStatus.host}  v${serverStatus.version}`);
  console.log(`   connections:   current=${serverStatus.connections?.current}  available=${serverStatus.connections?.available}`);

} catch (err) {
  console.error(`\n❌ FAILED after ${Date.now() - t0}ms:`, err.message);
  console.error('   name:', err.name);
  if (err.code) console.error('   code:', err.code);
} finally {
  await client.close();
}
