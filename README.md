# Webgame Collection (Upstash Redis, v1.4.0)
- 실시간 타이머 / 재시작 버튼
- 레이트리밋 + 관리자 초기화
- SEO: 자동 `/robots.txt`, `/sitemap.xml` (SITE_URL 필요)

## ENV
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_TOKEN=
RATE_LIMIT_PER_MINUTE=5
SITE_URL=

## Deploy
- Vercel → Env 설정 후 Redeploy


## Added in v1.4.1
- Per-run de-duplication: server prevents multiple submissions per run via `runId` (10 min window)
- Safer Redis env validation with helpful error
- Rate limiting on `/api/submit` by IP (`RATE_LIMIT_PER_MINUTE`, default 10/min)
- Reaction/Aim pages: visible timers & restart flow; client passes `runId` to server
