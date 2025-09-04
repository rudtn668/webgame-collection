// app/games/reaction/layout.tsx
// 서버 컴포넌트: 클라이언트 페이지에서 metadata를 분리
import React from "react";

export const metadata = {
  title: "반응속도 테스트",
  description: "신호에 반응해 빠르게 클릭! 낮은 ms일수록 더 좋은 기록입니다.",
  alternates: { canonical: "/games/reaction" },
};

export default function ReactionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
