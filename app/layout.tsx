import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@excalidraw/excalidraw/index.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RV2Class - Video Tutoring Platform",
  description: "Professional English tutoring with real-time video, screen sharing, and collaborative whiteboard",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RV2Class",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
