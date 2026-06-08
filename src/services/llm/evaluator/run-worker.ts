import fs from 'fs';
import path from 'path';

// Programmatically load .env variables for standalone Node runtimes (like the BullMQ worker)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  console.log(`[Diagnostic] Resolved .env path: ${envPath}`);
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    console.log('[Diagnostic] .env file exists. Parsing...');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex !== -1) {
        const key = trimmed.substring(0, delimiterIndex).trim();
        let value = trimmed.substring(delimiterIndex + 1).trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        // Overwrite if empty or not set
        if (!process.env[key] || process.env[key] === 'undefined') {
          process.env[key] = value;
        }
      }
    }
  } else {
    console.warn(`[Diagnostic] No .env file found at ${envPath}`);
  }
} catch (err) {
  console.warn('Warning: Programmatic .env loading skipped:', err);
}

console.log(`[Diagnostic] Final process.env.REDIS_URL value: "${process.env.REDIS_URL}"`);

import('./worker').then(({ evaluatorWorker }) => {
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
}).catch((err) => {
  console.error('[Worker] Critical failure during startup:', err);
  process.exit(1);
});
