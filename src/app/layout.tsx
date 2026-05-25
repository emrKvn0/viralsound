import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Hit Music - 15-30s Hit Preview Aggregator",
  description: "TikTok üzerinde popüler şarkı kesitlerini keşfedin ve yönetin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans relative">
        {/* Yüksek Performanslı Sabit Arka Plan Katmanı */}
        <div className="fixed inset-0 -z-10 pointer-events-none w-full h-full bg-[#080a0f]" style={{
          background: "radial-gradient(circle at 50% 0%, #151c2e 0%, #080a0f 100%)",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)"
        }} />
        {children}
      </body>
    </html>
  );
}
