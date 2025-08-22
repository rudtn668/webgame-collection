import { redis } from './redis';

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number; ttl: number }> {
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  const ttl = await redis.ttl(k);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), ttl };
}
