"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import {
  BrandMark,
  IconBell,
  IconChart,
  IconDna,
  IconEgg,
  IconGear,
  IconGecko,
  IconHome,
  IconSearch,
} from "@/app/components/icons";
import { LegalNav } from "@/app/components/legal-nav";
import { MobileAppNav } from "@/app/components/mobile-app-nav";
import { PressRoot } from "@/app/components/press-root";
import { SoftNavForm } from "@/app/components/soft-nav-form";

const primaryItems = [
  { href: "/", label: "ホーム", icon: IconHome },
  { href: "/animals", label: "マイ個体", icon: IconGecko },
  { href: "/checks", label: "クレスチェック", icon: IconBell },
] as const;

const moreItems = [
  { href: "/gallery", label: "みんなのクレス", icon: IconGecko },
  { href: "/compare", label: "全国個体比較", icon: IconChart },
  { href: "/stats", label: "日本のクレス統計", icon: IconChart },
  { href: "/settings", label: "設定", icon: IconGear },
] as const;

const breedItems = [
  { href: "/calculator", label: "遺伝計算", icon: IconDna },
  { href: "/simulate", label: "シミュレーション", icon: IconDna },
  { href: "/breedings", label: "ブリード", icon: IconEgg },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItemLabel({
  label,
  Icon,
}: {
  label: string;
  Icon: () => React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className={pending ? "opacity-45" : ""}>
        <Icon />
      </span>
      {label}
    </>
  );
}

function NavLinks() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function tabActive(href: string) {
    return isActivePath(pendingHref ?? pathname, href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {primaryItems.map((item) => {
          const active = tabActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onPointerDown={() => setPendingHref(item.href)}
              className={`flex min-h-11 items-center gap-2 rounded-[0.9rem] px-3 text-sm ${
                active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <NavItemLabel label={item.label} Icon={item.icon} />
            </Link>
          );
        })}
      </div>
      <div>
        <p className="px-3 text-xs text-white/35">記録と全国</p>
        <div className="mt-2 flex flex-col gap-1">
          {moreItems.map((item) => {
            const active = tabActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onPointerDown={() => setPendingHref(item.href)}
                className={`flex min-h-11 items-center gap-2 rounded-[0.9rem] px-3 text-sm ${
                  active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavItemLabel label={item.label} Icon={item.icon} />
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <p className="px-3 text-xs text-white/35">ブリード</p>
        <div className="mt-2 flex flex-col gap-1">
          {breedItems.map((item) => {
            const active = tabActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onPointerDown={() => setPendingHref(item.href)}
                className={`flex min-h-11 items-center gap-2 rounded-[0.9rem] px-3 text-sm ${
                  active ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavItemLabel label={item.label} Icon={item.icon} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AuthFooter({
  email,
  sessionPending = false,
}: {
  email: string | null;
  sessionPending?: boolean;
}) {
  if (sessionPending) return null;
  if (!email) {
    return (
      <div className="mt-8 px-3 text-sm">
        <Link href="/signup" className="nc-btn w-full min-h-12">
          無料ではじめる
        </Link>
        <Link href="/login" className="mt-3 block text-center text-xs text-white/45 underline-offset-2 hover:underline">
          ログイン
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 px-3">
      <p className="truncate text-xs text-white/45">{email}</p>
      <form action={signOut} className="mt-2">
        <button
          type="submit"
          className="nc-btn-ghost w-full border-white/15 bg-transparent text-white/80 hover:bg-white/10"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

function HeaderBell({ quiet = false }: { quiet?: boolean }) {
  const pathname = usePathname();

  function openPushSettings(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/settings") return;
    event.preventDefault();
    const target = document.getElementById("crest-push");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.hash = "crest-push";
  }

  return (
    <Link
      href="/settings#crest-push"
      onClick={openPushSettings}
      className={
        quiet
          ? "relative z-30 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/32 hover:bg-white/8 hover:text-white/70"
          : "relative z-30 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/8 text-white"
      }
      aria-label="クレスチェックの通知設定"
      title="クレスチェックの通知"
    >
      <IconBell />
    </Link>
  );
}

function HeaderSearch({ quiet }: { quiet: boolean }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="個体名・モルフ・IDを検索"
          title="検索"
          className={
            quiet
              ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-white/40 hover:bg-white/8 hover:text-white/80"
              : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white"
          }
        >
          <IconSearch />
        </button>
      </div>
    );
  }

  return (
    <SoftNavForm action="/animals" className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 text-white/40 sm:block">
        <IconSearch />
      </span>
      <input
        ref={inputRef}
        name="q"
        type="search"
        placeholder="名前・モルフ・ID"
        className="nc-input nc-input-chrome h-10 min-h-10 min-w-0 rounded-full px-3 pr-12 text-[13px] leading-normal placeholder:text-[13px] [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden sm:h-11 sm:min-h-11 sm:px-10 sm:pr-12 sm:text-sm sm:placeholder:text-sm"
        aria-label="個体名・モルフ・IDを検索"
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xs text-white/50 hover:text-white/80"
      >
        閉じる
      </button>
    </SoftNavForm>
  );
}

function TopBar({
  email,
  sessionPending = false,
}: {
  email: string | null;
  sessionPending?: boolean;
}) {
  const pathname = usePathname();
  const homeQuiet = pathname === "/";
  const quietSearch = homeQuiet || pathname.startsWith("/animals");
  const initial = sessionPending
    ? ""
    : email?.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <HeaderSearch quiet={quietSearch} />
      <HeaderBell quiet={homeQuiet} />
      <Link
        href="/settings"
        className={
          homeQuiet
            ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4d5e2]/45 text-xs font-semibold text-[#17141c]/80"
            : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4d5e2] text-sm font-semibold text-[#17141c]"
        }
        aria-label={email ? `アカウント ${email}` : "設定"}
        title={email ?? "設定"}
      >
        {initial}
      </Link>
    </div>
  );
}

function hideChrome(pathname: string) {
  return (
    pathname.startsWith("/p/") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/nickname" ||
    pathname.startsWith("/legal/")
  );
}

export function AppShell({
  children,
  email = null,
  sessionPending = false,
}: {
  children: React.ReactNode;
  email?: string | null;
  sessionPending?: boolean;
}) {
  const pathname = usePathname();
  const publicView = pathname.startsWith("/p/");
  const chromeHidden = hideChrome(pathname);
  const homeQuiet = pathname === "/";

  let tree: React.ReactNode;
  if (pathname === "/nickname") {
    tree = (
      <div className="min-h-full min-w-0 bg-background">
        <header className="bg-[#17141c] text-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={32} />
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">クレスノート</p>
                <p className="text-[10px] tracking-[0.18em] text-white/40">by N.crest</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-8">{children}</main>
      </div>
    );
  } else if (pathname === "/login") {
    tree = (
      <div className="min-h-full min-w-0 bg-background">
        <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    );
  } else if (publicView) {
    tree = (
      <div className="min-h-full min-w-0 bg-background">
        <header className="bg-[#17141c] text-white">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
            <BrandMark size={32} />
            <div className="min-w-0">
              <p className="font-semibold tracking-tight">クレスノート</p>
              <p className="text-[10px] tracking-[0.18em] text-white/40">by N.crest</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-4xl px-4 pb-10 text-center text-xs leading-5 text-white/40">
          クレスノート
          <br />
          by N.crest
          <LegalNav className="mt-3" />
        </footer>
      </div>
    );
  } else {
    tree = (
    <div className="min-h-full min-w-0 bg-background">
      <div className="mx-auto flex min-h-full max-w-[92rem]">
        <aside className="sticky top-0 hidden h-screen w-[16.5rem] shrink-0 bg-[#17141c] px-4 py-6 text-white lg:block">
          <Link href="/" className="flex min-h-12 items-center gap-3 px-2">
            <BrandMark />
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                クレスノート
              </span>
              <span className="mt-0.5 block text-[10px] tracking-[0.16em] text-white/40">
                by N.crest
              </span>
            </span>
          </Link>
          <div className="mt-8 h-[calc(100vh-8rem)] overflow-y-auto pb-8">
            <NavLinks />
            <AuthFooter email={email} sessionPending={sessionPending} />
            <LegalNav className="mt-6 justify-start px-3 text-white/40" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`sticky top-0 z-20 px-3 backdrop-blur-md sm:px-8 ${
              homeQuiet ? "bg-[#141218]/70 py-1.5" : "bg-[#141218]/92 py-2.5"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <TopBar email={email} sessionPending={sessionPending} />
            </div>
          </header>
          <main
            className={`min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 ${
              chromeHidden ? "pb-10" : "pb-24 lg:pb-10"
            }`}
          >
            {children}
          </main>
          <footer className="hidden px-4 pb-10 text-center text-xs leading-5 text-white/40 sm:px-8 lg:block">
            クレスノート
            <br />
            by N.crest
            <LegalNav className="mt-3" />
          </footer>
        </div>
      </div>
      {chromeHidden ? null : <MobileAppNav />}
    </div>
    );
  }

  return (
    <>
      <PressRoot />
      {tree}
    </>
  );
}
