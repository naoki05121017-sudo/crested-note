"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

const HOME_OPEN_ENTER_KEY = "crested-note.home-open-enter";

export function HomeStarEntrance({ children }: { children: ReactNode }) {
  const [enter, setEnter] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem(HOME_OPEN_ENTER_KEY)) return;
    } catch {
      return;
    }
    setEnter(true);
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(HOME_OPEN_ENTER_KEY, "1");
      } catch {
        /* ignore quota / private mode */
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={enter ? "nc-home-star nc-home-enter" : "nc-home-star"}>
      {children}
    </div>
  );
}
