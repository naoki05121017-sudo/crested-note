"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AnimalMore({
  children,
  title = "詳細",
  hint = "編集・間隔・血統",
  value,
}: {
  children: ReactNode;
  title?: string;
  hint?: string;
  value?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function sync() {
      if (window.location.hash === "#check-cadence") {
        ref.current?.setAttribute("open", "");
      }
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <details ref={ref} className="nc-panel min-w-0 text-ink">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{title}</span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </span>
        {value ? (
          <span className="shrink-0 text-sm text-ink/55">{value}</span>
        ) : (
          <span className="shrink-0 text-lg leading-none text-ink/25" aria-hidden>
            ›
          </span>
        )}
      </summary>
      <div className="flex min-w-0 flex-col gap-6 border-t border-black/6 px-5 py-5 sm:px-6">
        {children}
      </div>
    </details>
  );
}
