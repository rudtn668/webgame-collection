# 사다리타기 게임 추가 패치

이 패치는 `webgame-collection` 레포에 **사다리타기** 게임과 공유 API를 추가합니다.

## 포함 파일

```
lib/redis.ts
lib/ladder.ts
app/api/ladder/save/route.ts
app/api/ladder/[id]/route.ts
app/games/ladder/page.tsx
docs/README_LADDER.md
```

## 환경변수(.env.local)

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
# 선택: 분당 저장 요청 제한 (기본 10회)
RATE_LIMIT_PER_MINUTE=10
# 선택: 공유 링크 TTL (초), 기본 7일
LADDER_SAVE_TTL_SECONDS=604800
# 선택: 배포 URL(SEO/공유 URL용)
SITE_URL=https://example.com
```

## 사용법

- 개발: `npm run dev`로 서버 실행 후 `/games/ladder` 접속
- 인원수/입력 → **시작(사다리 생성)** → 결과 확인
- **공유 링크 만들기**를 누르면 `/api/ladder/save`에 저장되고 URL이 발급됩니다.
  - 동일 runId로 10분 내 중복 저장 방지
  - 분당 저장 요청 수를 제한 (기본 10회/IP)

## 홈 링크 추가 (선택)

홈 카드에 다음을 추가하세요.

```tsx
// app/page.tsx 일부
import Link from "next/link";

<li className="rounded-2xl border p-4 hover:shadow-sm transition">
  <h3 className="mb-2 text-lg font-semibold">사다리타기</h3>
  <p className="mb-3 text-sm text-gray-600">인원수 선택 → 각 칸 입력 → 시작 → 결과 확인</p>
  <Link href="/games/ladder" className="text-sm text-blue-600 underline">
    플레이 하러 가기
  </Link>
</li>
```
