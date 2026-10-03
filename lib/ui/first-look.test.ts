import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-look guest pitch", () => {
  it("tells first-time visitors what Crested Note is and where to start", () => {
    const login = readFileSync("app/(public)/login/page.tsx", "utf8");
    const signup = readFileSync("app/(public)/signup/page.tsx", "utf8");
    const pitch = readFileSync("app/components/guest-pitch.tsx", "utf8");
    const shell = readFileSync("app/components/app-shell.tsx", "utf8");
    expect(login).toContain("クレスの飼育・成長・繁殖をひとつに。");
    expect(login).toContain("記録 → 成長 → 比較 → 繁殖");
    expect(login).not.toContain("ThemeToggle");
    expect(login).not.toContain("ThemeSettings");
    expect(login).not.toContain("☀️");
    expect(login).not.toContain("🌙");
    expect(login).toContain("無料ではじめる");
    expect(login).toContain("LoginGalleryPreviewSlot");
    expect(login).toContain("<Suspense");
    expect(login).toContain("export default function LoginPage");
    expect(login).not.toContain("export default async function LoginPage");
    expect(login).not.toContain("listPublicGalleryPage");
    expect(login).not.toContain("loginGalleryPreviewCards");
    expect(login).not.toContain("user_id");
    expect(login).toContain("nc-login-enter");
    expect(login.match(/href="\/signup"/g)?.length).toBe(1);
    expect(login).toContain("すでにアカウントをお持ちですか？");
    expect(login).toContain("<details");
    expect(login).toContain("nc-btn-ghost");
    expect(login.indexOf("無料ではじめる")).toBeLessThan(login.indexOf("すでにアカウントをお持ちですか？"));
    expect(login.indexOf("すでにアカウントをお持ちですか？")).toBeLessThan(
      login.indexOf("<LoginGalleryPreviewSlot"),
    );
    expect(login).toContain('href="/signup"');
    expect(login).toContain("signIn");
    expect(login.match(/無料ではじめる/g)?.length).toBe(1);
    expect(login).not.toContain("GuestPitch");
    expect(login).not.toContain("980");
    const preview = readFileSync("app/components/login-gallery-preview.tsx", "utf8");
    expect(preview).toContain("listPublicGalleryPage");
    expect(preview).toContain("loginGalleryPreviewCards");
    expect(preview).toContain("LoginGalleryPreviewSlot");
    expect(preview).toContain("クレスノートに登録されている個体を、少しだけ見てみる。");
    expect(preview).toContain('href="/gallery"');
    expect(preview.match(/href="\/gallery"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(preview).not.toContain("nickname");
    expect(preview).not.toContain("user_id");
    expect(preview).not.toContain("weightG");
    expect(preview).not.toContain("SEX_LABEL");
    expect(preview).not.toContain("email");
    expect(pitch).toContain("クレスの飼育・成長・繁殖をまとめて管理");
    expect(pitch).toContain("記録 → 成長 → 比較 → 繁殖");
    expect(pitch).toContain("無料ではじめる");
    expect(pitch).toContain('href="/gallery"');
    expect(signup).toContain("GuestPitch");
    expect(signup).toContain("無料ではじめる");
    expect(signup).not.toContain("980");
    expect(pitch).not.toContain("980");
    const loginTree = shell.slice(
      shell.indexOf('pathname === "/login"'),
      shell.indexOf("} else if (publicView)"),
    );
    expect(loginTree).toContain("{children}");
    expect(loginTree).not.toContain("TopBar");
    expect(loginTree).not.toContain("HeaderSearch");
    expect(loginTree).not.toContain("HeaderBell");
    expect(loginTree).not.toContain("AuthFooter");
  });
});
