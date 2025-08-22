import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { const base = process.env.SITE_URL || 'https://example.com'; return { rules:[{ userAgent:'*', allow:['/','/games/reaction','/games/aim','/sitemap.xml'], disallow:['/admin','/api/*'] }], sitemap: `${base}/sitemap.xml`, host: base }; }
