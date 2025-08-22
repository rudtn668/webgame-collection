export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

type GameKey = 'reaction' | 'aim';
const GAME_CFG: Record<GameKey, { lowerIsBetter: boolean }> = {
  reaction: { lowerIsBetter: true },
  aim: { lowerIsBetter: false },
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const game = url.searchParams.get('game') as GameKey | null;
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || '10')));
    if (!game || !['reaction', 'aim'].includes(game)) {
      return Response.json({ ok: false, error: 'INVALID_GAME' }, { status: 400 });
    }
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return Response.json({ ok: false, error: 'REDIS_ENV_MISSING' }, { status: 500 });
    }
    const setKey = `lb:${game}`;
    const raw: unknown = await redis.zrange(setKey, 0, limit - 1, { withScores: true } as any);

    const cfg = GAME_CFG[game];
    const result: { name: string; score: number }[] = [];

    if (Array.isArray(raw) && raw.length > 0) {
      const first = (raw as any[])[0];
      if (first && typeof first === 'object' && 'member' in first && 'score' in first) {
        for (const r of raw as Array<{ member: string; score: number }>) {
          const sc = Number((r as any).score);
          result.push({ name: String((r as any).member), score: cfg.lowerIsBetter ? sc : Math.abs(sc) });
        }
      } else {
        const arr = raw as Array<string | number>;
        for (let i = 0; i + 1 < arr.length; i += 2) {
          const member = String(arr[i]);
          const sc = Number(arr[i + 1]);
          result.push({ name: member, score: cfg.lowerIsBetter ? sc : Math.abs(sc) });
        }
      }
    }

    return Response.json(result);
  } catch (e) {
    console.error('leaderboard error', e);
    return Response.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
