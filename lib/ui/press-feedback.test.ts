import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("instant press feedback", () => {
  it("applies a shared press class from pointerdown in the app shell", () => {
    const shell = readFileSync("app/components/app-shell.tsx", "utf8");
    const press = readFileSync("app/components/press-root.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    expect(shell).toContain("<PressRoot />");
    expect(press).toContain("nc-press-on");
    expect(press).toContain("pointerdown");
    expect(css).toContain("a.nc-press-on");
    expect(css).toContain("transform: scale(0.985)");
    expect(css).not.toContain("transform 160ms");
  });

  it("selects bottom tabs from pointerdown before the pathname changes", () => {
    const nav = readFileSync("app/components/mobile-app-nav.tsx", "utf8");
    expect(nav).toContain("pendingHref");
    expect(nav).toContain("onPointerDown={() => setPendingHref(tab.href)}");
    expect(nav).toContain("isActivePath(pendingHref ?? pathname, tab.href)");
    expect(nav).toContain("prefetch");
    expect(nav).not.toContain("transition-colors duration-150");
  });
});
