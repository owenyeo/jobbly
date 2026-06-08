const IORedis = require('ioredis');
const fs = require('fs');
const path = require('path');

// 1. Parse .env file manually
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.trim();
});

const redisUrl = envVars.REDIS_URL || 'redis://127.0.0.1:6379';
console.log(`Attempting to connect to: ${redisUrl.split('@')[1] || redisUrl} (password masked)`);

const client = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

async function run() {
  try {
    // 2. Ping Valkey
    const pingRes = await client.ping();
    console.log(`✅ Connection Success! Ping Response: ${pingRes}`);

    // 3. Search for keys
    const keys = await client.keys('*');
    console.log(`\nFound ${keys.length} total keys in database:`);
    if (keys.length > 0) {
      keys.forEach(k => console.log(` - ${k}`));
    } else {
      console.log(' (No keys found. The database is empty.)');
    }

    // 4. Look for BullMQ specific keys
    const queueKeys = keys.filter(k => k.startsWith('bull:evaluation-queue'));
    if (queueKeys.length > 0) {
      console.log(`\n📋 BullMQ 'evaluation-queue' structures are active.`);
      
      // Get job counts
      const waitingCount = await client.zcard('bull:evaluation-queue:waiting');
      const activeCount = await client.scard('bull:evaluation-queue:active');
      const failedCount = await client.zcard('bull:evaluation-queue:failed');
      
      console.log(` - Waiting jobs (unprocessed): ${waitingCount}`);
      console.log(` - Active jobs (in progress): ${activeCount}`);
      console.log(` - Failed jobs: ${failedCount}`);
    } else {
      console.log(`\n⚠️ No BullMQ structures found for 'evaluation-queue' on this database instance.`);
    }

  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
  } finally {
    client.disconnect();
  }
}

run();
