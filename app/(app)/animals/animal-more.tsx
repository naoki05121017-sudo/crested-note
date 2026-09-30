"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AnimalMore({ children }: { children: ReactNode }) {
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
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-ink/70 sm:px-6">
        その他
      </summary>
      <div className="flex min-w-0 flex-col gap-6 border-t border-black/6 px-5 py-5 sm:px-6">
        {children}
      </div>
    </details>
  );
}
