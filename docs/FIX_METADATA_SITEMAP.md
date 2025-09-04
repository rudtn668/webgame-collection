# Next.js 메타데이터 & 사이트맵 수정 패치

## 무엇이 바뀌나요?
- `app/games/aim/page.tsx` 및 `app/games/reaction/page.tsx`가 클라이언트 컴포넌트(`"use client"`)인 경우,
  같은 파일에서 `export const metadata`를 내보낼 수 없습니다.
  **해결**: 각 라우트에 `layout.tsx`(서버 컴포넌트)를 추가하고 여기서 `metadata`를 정의했습니다.
- `app/sitemap.ts`에서 `SITE_URL`이 비어 있을 때 `https://example.com`로 뜨는 문제를 방지하기 위해,
  `SITE_URL` → `VERCEL_URL` → `http://localhost:3000` 순으로 호스트를 결정하도록 수정했습니다.

## 설치
- 이 패치 파일들을 레포 동일 경로에 복사합니다.
- Vercel 프로젝트의 Environment Variables에 `SITE_URL`을 설정하면 더 정확한 절대 URL이 생성됩니다.
  - 예: `SITE_URL=https://webgame-collection.vercel.app`

## 참고
- Next.js App Router에서는 **클라이언트 컴포넌트 파일에서 `metadata`/`generateMetadata`를 export 할 수 없습니다**.
  메타데이터는 서버 컴포넌트 파일(예: `layout.tsx`, 부모 `page.tsx`)에서 export 해야 합니다.
