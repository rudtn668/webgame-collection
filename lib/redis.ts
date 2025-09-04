// lib/redis.ts
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis 클라이언트
 * - 환경변수: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * - 미설정 시 런타임 에러가 발생합니다.
 */
export const redis = Redis.fromEnv();
