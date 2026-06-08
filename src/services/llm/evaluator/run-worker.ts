import { evaluatorWorker } from './worker';

console.log('==================================================');
console.log('   Jobbly Agentic Evaluator BullMQ Worker is Active');
console.log('   Listening for enqueued evaluation tasks...');
console.log('   Redis/Valkey: ' + (process.env.REDIS_URL ? 'Connected to Aiven Cloud' : '127.0.0.1:6379'));
console.log('==================================================');

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received. Shutting down worker gracefully...');
  await evaluatorWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received. Shutting down worker gracefully...');
  await evaluatorWorker.close();
  process.exit(0);
});
