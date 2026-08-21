import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Bob - Daily Trading | Master System 4.0 Pro",
  description:
    "美股與加密貨幣量化交易控制面板 — Martin Luk Master System 4.0 Pro",
  applicationName: "Bob Daily Trading",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bob Trading",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
