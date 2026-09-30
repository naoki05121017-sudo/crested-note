"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  IconChart,
  IconDna,
  IconEgg,
  IconGear,
  IconGecko,
  IconHome,
} from "@/app/components/icons";

const tabs = [
  { href: "/", label: "ホーム", icon: IconHome },
  { href: "/animals", label: "個体", icon: IconGecko },
  { href: "/checks", label: "ケア", icon: IconBellTab },
] as const;

const morePrimary = [
  { href: "/gallery", label: "みんなのクレス", icon: IconGecko },
  { href: "/compare", label: "全国個体比較", icon: IconChart },
  { href: "/stats", label: "日本のクレス統計", icon: IconChart },
  { href: "/album", label: "成長アルバム", icon: IconGecko },
  { href: "/settings", label: "設定", icon: IconGear },
] as const;

const moreBreed = [
  { href: "/calculator", label: "遺伝計算", icon: IconDna },
  { href: "/simulate", label: "シミュレーション", icon: IconDna },
  { href: "/breedings", label: "ブリード", icon: IconEgg },
] as const;

function IconBellTab() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4a6 6 0 0 1 6 6v3.2l1.2 2.4H4.8L6 13.2V10a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h.01M12 12h.01M19 12h.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLabel({
  label,
  Icon,
}: {
  label: string;
  Icon: () => React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className={pending ? "opacity-50" : ""}>
        <Icon />
      </span>
      {label}
    </>
  );
}

export function MobileAppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const moreActive =
    !tabs.some((tab) => isActivePath(pathname, tab.href)) &&
    [...morePrimary, ...moreBreed].some((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="nc-panel absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-ink"
          >
            <p id={titleId} className="text-lg font-semibold tracking-tight">
              もっと
            </p>
            <p className="mt-1 text-sm text-muted">比較・統計・設定。ブリードは下にあります。</p>
            <ul className="mt-4 grid gap-1">
              {morePrimary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex min-h-12 items-center gap-3 rounded-[0.9rem] px-3 text-sm ${
                      isActivePath(pathname, item.href) ? "bg-[#f4d5e2]" : "hover:bg-white/70"
                    }`}
                  >
                    <item.icon />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted">ブリード</p>
            <ul className="mt-2 grid gap-1">
              {moreBreed.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex min-h-12 items-center gap-3 rounded-[0.9rem] px-3 text-sm ${
                      isActivePath(pathname, item.href) ? "bg-[#ece6fb]" : "hover:bg-white/70"
                    }`}
                  >
                    <item.icon />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        className="nc-tab-bar fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#141218] text-white lg:hidden"
        aria-label="メイン"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <li key={tab.href} className="min-w-0">
                <Link
                  href={tab.href}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] tracking-wide transition-colors duration-150 ${
                    active ? "text-[#f4d5e2]" : "text-white/40"
                  }`}
                >
                  <TabLabel label={tab.label} Icon={tab.icon} />
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              className={`flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] tracking-wide transition-colors duration-150 ${
                moreActive || open ? "text-[#f4d5e2]" : "text-white/40"
              }`}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <IconMore />
              もっと
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
