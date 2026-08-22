import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "@fontsource-variable/noto-sans-kr";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Investment Signal Desk",
  description: "공식 공시와 기업 IR을 한글로 정리하는 개인 투자 리서치 데스크",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={geistMono.variable}
        data-design-contract="tradingview-quartr-inspired-research-ui"
      >
        {children}
      </body>
    </html>
  );
}
