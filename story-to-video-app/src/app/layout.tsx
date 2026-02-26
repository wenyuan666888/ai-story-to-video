import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "故事转视频 - 从零开发示例",
  description: "理解从需求到上线的完整开发流程",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
