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
    expect(login).toContain("無料ではじめる");
    expect(login).toContain("実際のクレスを見てみる");
    expect(login).toContain("すでにアカウントをお持ちですか？");
    expect(login).toContain("<details");
    expect(login).toContain('href="/signup"');
    expect(login).toContain("signIn");
    expect(login.match(/無料ではじめる/g)?.length).toBe(1);
    expect(login).not.toContain("GuestPitch");
    expect(login).not.toContain("980");
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
