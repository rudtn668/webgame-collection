// app/games/aim/layout.tsx
// 서버 컴포넌트: 클라이언트 페이지에서 metadata를 분리
import React from "react";

export const metadata = {
  title: "AIM 훈련 (30초)",
  description: "30초 동안 원형 타겟을 최대한 많이 맞히고 리더보드에 등록하세요.",
  alternates: { canonical: "/games/aim" },
};

export default function AimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
