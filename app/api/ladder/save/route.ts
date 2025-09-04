// app/api/ladder/save/route.ts
import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { LadderConfig, validateConfig } from "@/lib/ladder";

export const runtime = "nodejs"; // crypto 사용

function base62(n: number) {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  while (n > 0) {
    s = chars[n % 62] + s;
    n = Math.floor(n / 62);
  }
  return s || "0";
}

function newId(): string {
  const rand = Math.floor(
    Math.random() * Number.MAX_SAFE_INTEGER
  );
  const ts = Date.now();
  return base62(ts).slice(-6) + "-" + base62(rand).slice(-6);
}

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.ip ?? "0.0.0.0";
}

export async function POST(req: NextRequest) {
  try {
    const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "10", 10);
    const TTL = parseInt(process.env.LADDER_SAVE_TTL_SECONDS ?? "604800", 10); // 7일

    const ip = getIp(req);
    const rlKey = `rl:ladder:save:${ip}`;
    const count = await redis.incr(rlKey);
    if (count === 1) {
      await redis.expire(rlKey, 60);
    }
    if (count > RATE_LIMIT) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await req.json();
    const runId: string | undefined = body?.runId;
    const cfg: LadderConfig = {
      names: body?.names ?? [],
      results: body?.results ?? [],
      rows: body?.rows ?? 18,
      density: body?.density ?? 0.28,
      rungs: body?.rungs ?? [],
      seed: body?.seed,
      createdAt: Date.now(),
    };

    if (!validateConfig(cfg)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // runId 중복 제출 방지 (10분)
    if (runId) {
      const dedup = await redis.set(`ladder:run:${runId}`, "1", {
        nx: true,
        ex: 600,
      });
      if (dedup === null) {
        return new Response(
          JSON.stringify({ ok: false, error: "duplicate_run" }),
          {
            status: 409,
            headers: { "content-type": "application/json" },
          }
        );
      }
    }

    const id = newId();
    await redis.set(`ladder:cfg:${id}`, cfg, { ex: TTL });
    const site = process.env.SITE_URL?.replace(/\/+$/, "") ?? "";
    const url = site ? `${site}/games/ladder?id=${id}` : `/games/ladder?id=${id}`;

    return new Response(JSON.stringify({ ok: true, id, url }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
