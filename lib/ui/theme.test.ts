import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_THEME,
  THEME_BOOT_SCRIPT,
  THEME_COOKIE,
  isAppTheme,
  themeCookie,
} from "./theme";

describe("app theme toggle", () => {
  it("persists dark or light on cookie and localStorage for iPhone Safari boot", () => {
    expect(isAppTheme("dark")).toBe(true);
    expect(isAppTheme("light")).toBe(true);
    expect(isAppTheme("system")).toBe(false);
    expect(themeCookie("light")).toContain(`${THEME_COOKIE}=light`);
    expect(themeCookie("light")).toContain("SameSite=Lax");
    expect(THEME_BOOT_SCRIPT).toContain(THEME_COOKIE);
    expect(THEME_BOOT_SCRIPT).toContain("localStorage.getItem");
    expect(THEME_BOOT_SCRIPT).toContain("data-theme");
    expect(THEME_BOOT_SCRIPT).toContain("theme-light");
    expect(THEME_BOOT_SCRIPT).toContain("theme-dark");
    expect(DEFAULT_APP_THEME).toBe("light");
    expect(THEME_BOOT_SCRIPT).toContain('v!=="light"&&v!=="dark")v="light"');
    expect(THEME_BOOT_SCRIPT).toContain('data-theme","light"');
    expect(THEME_BOOT_SCRIPT).not.toContain(')v="dark"');
  });

  it("keeps login free of theme controls and boots theme without replacing document head", () => {
    const login = readFileSync("app/(public)/login/page.tsx", "utf8");
    const picker = readFileSync("app/components/theme-settings.tsx", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    const settings = readFileSync("app/(app)/settings/page.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    expect(login).not.toContain("ThemeToggle");
    expect(login).not.toContain("ThemeSettings");
    expect(login).not.toContain("☀️");
    expect(login).not.toContain("🌙");
    expect(login).toContain("signIn");
    expect(login).toContain("nc-hero nc-crest-stage nc-login-stage nc-login-enter flex flex-col");
    expect(picker.indexOf("ホワイト")).toBeLessThan(picker.indexOf("ブラック"));
    expect(picker).toContain('useState<AppTheme>("light")');
    expect(picker).toContain("applyAppTheme");
    expect(layout).toContain('data-theme="light"');
    expect(layout).toContain("theme-light");
    expect(picker).not.toContain("☀️");
    expect(picker).not.toContain("🌙");
    expect(layout).toContain("THEME_BOOT_SCRIPT");
    expect(layout).toContain("beforeInteractive");
    expect(layout).not.toContain("<head>");
    expect(layout).not.toContain("dangerouslySetInnerHTML");
    expect(settings).toContain("ThemeSettings");
    expect(settings).toContain("テーマ");
    expect(css).toContain("html.theme-light");
    expect(css).toContain("#f7f1ea");
    expect(css).toContain(".nc-hero:not(.nc-login-stage)");
    expect(css).toContain("html.theme-light .text-white\\/60");
  });
});
