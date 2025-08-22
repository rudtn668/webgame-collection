export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return Response.json({ ok: false, error: 'REDIS_ENV_MISSING' }, { status: 500 });
    }
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN) return Response.json({ ok:false, error:'ADMIN_TOKEN_NOT_SET' }, { status: 500 });
    if (token !== process.env.ADMIN_TOKEN) return Response.json({ ok:false, error:'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(()=> ({}));
    const game = body?.game;
    if (game && !['reaction','aim'].includes(game)) return Response.json({ ok:false, error:'INVALID_GAME' }, { status: 400 });

    if (game) await redis.del(`lb:${game}`);
    else { await redis.del('lb:reaction'); await redis.del('lb:aim'); }

    return Response.json({ ok:true });
  } catch (e) {
    console.error('admin reset error', e);
    return Response.json({ ok:false, error:'SERVER_ERROR' }, { status: 500 });
  }
}
