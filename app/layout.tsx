import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "./components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "クレスノート",
    template: "%s | クレスノート",
  },
  description:
    "クレスノート by N.crest。クレスとともに、もっと楽しく、もっと深く。クレステッドゲッコーの個体・遺伝・繁殖管理。",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell email={user?.email ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
