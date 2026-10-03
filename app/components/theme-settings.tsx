"use client";

import { useEffect, useState } from "react";
import { applyAppTheme, readDocumentTheme, type AppTheme } from "@/lib/ui/theme";

const OPTIONS: { value: AppTheme; label: string }[] = [
  { value: "light", label: "ホワイト" },
  { value: "dark", label: "ブラック" },
];

export function ThemeSettings() {
  const [theme, setTheme] = useState<AppTheme>("light");

  useEffect(() => {
    setTheme(readDocumentTheme());
  }, []);

  function choose(next: AppTheme) {
    applyAppTheme(next);
    setTheme(next);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-pressed={selected}
            className={`min-h-12 min-w-0 rounded-[var(--radius-control)] border px-3 text-sm font-semibold ${
              selected
                ? "border-[#c9b4e4] bg-[#ece6fb] text-[#17141c]"
                : "border-[var(--line)] bg-transparent text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
