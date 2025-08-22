import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazy/proxy: don't throw at import time; throw on use so route try/catch can JSON-ify
export const redis: any = (url && token)
  ? new Redis({ url, token })
  : new Proxy({}, {
      get() {
        throw new Error('REDIS_ENV_MISSING: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
      }
    });
