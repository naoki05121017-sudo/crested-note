"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BrandMark,
  IconChart,
  IconDna,
  IconEgg,
  IconGear,
  IconGecko,
  IconHome,
} from "@/app/components/icons";

const groups = [
  {
    label: "飼育",
    items: [
      { href: "/", label: "ホーム", icon: IconHome },
      { href: "/animals", label: "個体", icon: IconGecko },
    ],
  },
  {
    label: "ブリード",
    items: [
      { href: "/calculator", label: "遺伝計算", icon: IconDna },
      { href: "/simulate", label: "シミュ", icon: IconDna },
      { href: "/breedings", label: "繁殖", icon: IconEgg },
      { href: "/projects", label: "プロジェクト", icon: IconChart },
      { href: "/predictions", label: "予想と実績", icon: IconChart },
    ],
  },
  {
    label: "データ",
    items: [
      { href: "/compare", label: "全国比較", icon: IconChart },
      { href: "/stats", label: "日本の統計", icon: IconChart },
      { href: "/settings", label: "設定", icon: IconGear },
    ],
  },
] as const;

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] tracking-[0.2em] text-muted uppercase">
            {group.label}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClick}
                  className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm ${
                    active
                      ? "bg-accent text-ink"
                      : "text-muted hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const publicView = pathname.startsWith("/p/");

  if (publicView) {
    return (
      <div className="min-h-full bg-background text-ink">
        <header className="border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
            <BrandMark size={32} />
            <div>
              <p className="font-semibold tracking-tight">クレスノート</p>
              <p className="text-[10px] tracking-[0.18em] text-muted">
                by N.crest
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-ink">
      <div className="mx-auto flex min-h-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface/80 px-4 py-6 lg:block">
          <Link href="/" className="flex items-center gap-3 px-2">
            <BrandMark />
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                クレスノート
              </span>
              <span className="mt-0.5 block text-[10px] tracking-[0.16em] text-muted">
                by N.crest
              </span>
            </span>
          </Link>
          <div className="mt-8 overflow-y-auto pb-8">
            <NavLinks />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <BrandMark size={28} />
              <span>
                <span className="block">クレスノート</span>
                <span className="block text-[10px] font-normal tracking-[0.16em] text-muted">
                  by N.crest
                </span>
              </span>
            </Link>
            <button
              type="button"
              className="nc-btn-ghost px-4"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "閉じる" : "メニュー"}
            </button>
          </header>
          {open ? (
            <div className="border-b border-line bg-surface px-4 py-4 lg:hidden">
              <NavLinks onClick={() => setOpen(false)} />
            </div>
          ) : null}
          <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
          <footer className="px-4 pb-10 text-center text-xs leading-5 text-muted sm:px-8">
            クレスノート
            <br />
            by N.crest
          </footer>
        </div>
      </div>
    </div>
  );
}
