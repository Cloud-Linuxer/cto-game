import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS 스타트업 타이쿤",
  description: "턴 기반 경영 시뮬레이션 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
