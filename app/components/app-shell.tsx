"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

const groups = [
  {
    label: "",
    items: [
      { href: "/", label: "ホーム", icon: IconHome },
      { href: "/animals", label: "マイ個体", icon: IconGecko },
      { href: "/compare", label: "全国個体比較", icon: IconChart },
      { href: "/stats", label: "日本のクレス統計", icon: IconChart },
      { href: "/calculator", label: "遺伝計算", icon: IconDna },
      { href: "/simulate", label: "シミュレーション", icon: IconDna },
      { href: "/breedings", label: "ブリード", icon: IconEgg },
      { href: "/settings", label: "設定", icon: IconGear },
    ],
  },
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
      <Icon />
      {pending ? "移動中…" : label}
    </>
  );
}

function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.items.map((item) => item.href).join("-")}>
          {group.label ? (
            <p className="px-3 text-[10px] tracking-[0.2em] text-white/35 uppercase">
              {group.label}
            </p>
          ) : null}
          <div className={group.label ? "mt-2 flex flex-col gap-1" : "flex flex-col gap-1"}>
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm ${
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <NavItemLabel label={item.label} Icon={item.icon} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AuthFooter({ email }: { email: string | null }) {
  if (!email) {
    return (
      <div className="mt-8 px-3 text-sm">
        <Link href="/login" className="nc-btn-ghost w-full border-white/15 bg-white/8 text-white hover:bg-white/14">
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

function TopBar({ email }: { email: string | null }) {
  const initial = email?.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
      <form action="/animals" className="relative min-w-0 flex-[1_1_0]">
        <span className="pointer-events-none absolute left-2.5 top-1/2 hidden -translate-y-1/2 text-muted sm:left-3 sm:block">
          <IconSearch />
        </span>
        <input
          name="q"
          type="search"
          placeholder="個体名・モルフ・ID"
          className="nc-input h-10 min-h-10 min-w-0 rounded-full border-line bg-white px-3 text-[12px] leading-normal placeholder:text-[12px] placeholder:text-muted [appearance:none] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden sm:h-11 sm:min-h-11 sm:px-10 sm:text-base sm:placeholder:text-base"
          aria-label="個体名・モルフ・IDを検索"
        />
      </form>
      <Link
        href="/settings"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white sm:h-11 sm:w-11"
        aria-label="設定・お知らせ"
      >
        <IconBell />
      </Link>
      <Link
        href="/settings"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#17141c] sm:h-11 sm:w-11"
        aria-label={email ? `アカウント ${email}` : "設定"}
        title={email ?? "設定"}
      >
        {initial}
      </Link>
    </div>
  );
}

export function AppShell({
  children,
  email = null,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const publicView = pathname.startsWith("/p/");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (publicView) {
    return (
      <div className="min-h-full bg-background">
        <header className="bg-[#17141c] text-white">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
            <BrandMark size={32} />
            <div>
              <p className="font-semibold tracking-tight">クレスノート</p>
              <p className="text-[10px] tracking-[0.18em] text-white/40">
                by N.crest
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-4xl px-4 pb-10 text-center text-xs leading-5 text-white/40">
          クレスノート
          <br />
          by N.crest
          <LegalNav className="mt-3" />
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex min-h-full max-w-[92rem]">
        <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 bg-[#17141c] px-4 py-6 text-white lg:block">
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
            <AuthFooter email={email} />
            <LegalNav className="mt-6 justify-start px-3 text-white/40" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 bg-[#17141c] px-3 py-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              <TopBar email={email} />
              <button
                type="button"
                className="nc-btn-ghost h-9 w-9 shrink-0 border-white/20 bg-white/8 px-0 text-sm text-white hover:bg-white/12 sm:h-11 sm:w-auto sm:px-4 lg:hidden"
                aria-expanded={open}
                aria-label={open ? "メニューを閉じる" : "メニュー"}
                onClick={() => setOpen((value) => !value)}
              >
                <span className="sm:hidden" aria-hidden="true">
                  {open ? "×" : "≡"}
                </span>
                <span className="hidden sm:inline">{open ? "閉じる" : "メニュー"}</span>
              </button>
            </div>
          </header>
          {open ? (
            <div className="border-b border-line bg-[#17141c] px-4 py-4 text-white lg:hidden">
              <NavLinks />
              <AuthFooter email={email} />
            </div>
          ) : null}
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
          <footer className="px-4 pb-10 text-center text-xs leading-5 text-white/40 sm:px-8">
            クレスノート
            <br />
            by N.crest
            <LegalNav className="mt-3" />
          </footer>
        </div>
      </div>
    </div>
  );
}
