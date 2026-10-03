import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/ui/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "クレスノート",
    template: "%s | クレスノート",
  },
  description:
    "クレスノート by N.crest。クレスとともに、もっと楽しく、もっと深く。クレステッドゲッコーの個体・遺伝・繁殖管理。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "クレスノート",
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#17141c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} theme-light h-full antialiased`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background">
        <Script id="nc-theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
