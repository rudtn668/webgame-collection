// app/sitemap.ts
import type { MetadataRoute } from "next";

function getBaseUrl() {
  const site = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site.startsWith("http") ? site : `https://${site}`;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  // 마지막 수단: 상대 경로 대신 example 방지용으로 localhost 절대경로 제공
  return "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const now = new Date().toISOString();

  // 필요한 경로만 샘플로 기입 — 실제 프로젝트의 라우트를 추가하세요.
  const routes = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/games/reaction`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/games/aim`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/games/ladder`, changeFrequency: "weekly", priority: 0.8 },
  ] as const;

  return routes.map((r) => ({
    url: r.url,
    changeFrequency: r.changeFrequency as any,
    priority: r.priority,
    lastModified: now,
  }));
}
