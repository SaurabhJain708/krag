import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new Error("REDIS_URL is not defined");
};

// 1. Define a global type to prevent TypeScript errors on the global object
//    This allows us to attach the client to `globalThis` during development.
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(getRedisUrl(), {
    // 2. Production Optimizations
    maxRetriesPerRequest: null, // Essential if using with queues (like BullMQ)
    enableReadyCheck: false, // Faster startup
    retryStrategy(times) {
      // Custom retry logic
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

// 3. In development, save the instance to the global object.
//    This prevents creating a new connection every time Next.js hot-reloads.
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
