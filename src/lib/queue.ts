import { Queue } from 'bullmq';
import fs from 'fs';
import path from 'path';

// Programmatically load .env variables for standalone Node runtimes (like the BullMQ worker)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex !== -1) {
        const key = trimmed.substring(0, delimiterIndex).trim();
        let value = trimmed.substring(delimiterIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key] || process.env[key] === 'undefined') {
          process.env[key] = value;
        }
      }
    }
  }
} catch (err) {
  console.warn('Warning: Programmatic .env loading skipped in queue.ts:', err);
}

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log(`[Diagnostic queue.ts] Read redisUrl: "${redisUrl}"`);

// Parse redisUrl string into connection options
let parsedUrl: URL;
try {
  parsedUrl = new URL(redisUrl);
} catch (err) {
  console.warn(`Failed to parse REDIS_URL "${redisUrl}", falling back to localhost`);
  parsedUrl = new URL('redis://127.0.0.1:6379');
}

export const connectionOptions = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '6379', 10),
  username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
  password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
  tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
};
console.log('[Diagnostic queue.ts] Resolved connectionOptions:', {
  ...connectionOptions,
  password: connectionOptions.password ? '***' : undefined,
});

// Prevent multiple client instances from being created (singleton instance)
const globalForQueue = globalThis as unknown as {
    evaluationQueue: Queue | undefined;
}

// Instantiate Queue
export const evaluationQueue =
    globalForQueue.evaluationQueue ??
    new Queue('evaluation-queue', {
        connection: connectionOptions,
        defaultJobOptions: {
            attempts: 3, // Auto-retry job execution up to 3 times on worker error
            backoff: {
                type: 'exponential',
                delay: 1000, // Wait 1s, then 2s, then 4s...
            },
            removeOnComplete: true, // Clean completed jobs from Redis memory automatically
            removeOnFail: false,    // Keep failed jobs in Redis memory for debug analysis
        },
    });

evaluationQueue.on('error', (err) => {
  console.error('[Diagnostic Queue Error] Stack:', err.stack || err);
});

// Cache variables in development environment to prevent connection leaks
if (process.env.NODE_ENV !== 'production') {
    globalForQueue.evaluationQueue = evaluationQueue;
}