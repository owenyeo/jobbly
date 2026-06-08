import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';


// Prevent multiple client instances from being created (singleton instance)
const globalForQueue = globalThis as unknown as {
    redisConnection: IORedis | undefined;
    evaluationQueue: Queue | undefined;
}

// Instantiate connection

export const connection =
    globalForQueue.redisConnection ?? new IORedis(redisUrl, {
        maxRetriesPerRequest: null
    });

// Instantiate Queue
export const evaluationQueue =
    globalForQueue.evaluationQueue ??
    new Queue('evaluation-queue', {
        connection: connection as any,
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

// Cache variables in development environment to prevent connection leaks
if (process.env.NODE_ENV !== 'production') {
    globalForQueue.redisConnection = connection;
    globalForQueue.evaluationQueue = evaluationQueue;
}