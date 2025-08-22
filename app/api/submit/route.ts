export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { rateLimit } from '@/lib/ratelimit';

type GameKey = 'reaction' | 'aim';
const GAME_CFG: Record<GameKey, { lowerIsBetter: boolean }> = {
  reaction: { lowerIsBetter: true },
  aim: { lowerIsBetter: false },
};

function getIp(req: NextRequest) {
  const h = req.headers.get('x-forwarded-for') || '';
  return h.split(',')[0].trim() || 'unknown';
}
function sanitizeName(raw: string): string {
  const name = (raw || '').toString().trim().replace(/\s+/g, ' ');
  return name.slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return Response.json({ ok: false, error: 'REDIS_ENV_MISSING' }, { status: 500 });
    }
    const ip = getIp(req);
    const limit = Number(process.env.RATE_LIMIT_PER_MINUTE || '10');
    const rl = await rateLimit(`submit:${ip}`, limit, 60);
    if (!rl.ok) return Response.json({ ok:false, error:'RATE_LIMITED' }, { status: 429 });

    const { game, name, score, runId } = await req.json();
    if (!game || !['reaction','aim'].includes(game)) return Response.json({ ok:false, error:'INVALID_GAME' }, { status: 400 });
    if (!runId || typeof runId !== 'string' || runId.length < 8) return Response.json({ ok:false, error:'INVALID_RUN' }, { status: 400 });

    const safeName = sanitizeName(name || '');
    if (!safeName) return Response.json({ ok:false, error:'INVALID_NAME' }, { status: 400 });

    const nScore = Number(score);
    if (!Number.isFinite(nScore) || nScore < 0) return Response.json({ ok:false, error:'INVALID_SCORE' }, { status: 400 });

    // per-run dedup (10분)
    const runKey = `lb:${game}:run:${runId}`;
    const dedupSet = await redis.set(runKey, ip, { nx: true, ex: 10 * 60 });
    if (dedupSet !== 'OK') return Response.json({ ok:false, error:'ALREADY_SUBMITTED_THIS_RUN' }, { status: 409 });

    // leaderboard upsert (best only)
    const setKey = `lb:${game}`;
    const cfg = GAME_CFG[game as GameKey];
    const storedScore = cfg.lowerIsBetter ? nScore : -nScore;

    const currentRaw: unknown = await redis.zscore(setKey, safeName);
    const current = (currentRaw === null || currentRaw === undefined) ? null : Number(currentRaw);

    let shouldUpdate = false;
    if (current == null) shouldUpdate = true;
    else if (storedScore < current) shouldUpdate = true;

    if (shouldUpdate) await redis.zadd(setKey, { member: safeName, score: storedScore });

    return Response.json({ ok: true, updated: shouldUpdate });
  } catch (e) {
    console.error('submit error', e);
    return Response.json({ ok:false, error:'SERVER_ERROR' }, { status: 500 });
  }
}
