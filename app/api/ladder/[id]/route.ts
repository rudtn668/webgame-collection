// app/api/ladder/[id]/route.ts
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "missing_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const cfg = await redis.get(`ladder:cfg:${id}`);
    if (!cfg) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, id, config: cfg }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
