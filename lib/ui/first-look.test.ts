import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("first-look guest pitch", () => {
  it("tells first-time visitors what Crested Note is and where to start", () => {
    const login = readFileSync("app/(public)/login/page.tsx", "utf8");
    const signup = readFileSync("app/(public)/signup/page.tsx", "utf8");
    const pitch = readFileSync("app/components/guest-pitch.tsx", "utf8");
    expect(pitch).toContain("クレスの飼育・成長・繁殖をまとめて管理");
    expect(pitch).toContain("記録 → 成長 → 比較 → 繁殖");
    expect(pitch).toContain("無料ではじめる");
    expect(pitch).toContain('href="/gallery"');
    expect(login).toContain("GuestPitch");
    expect(signup).toContain("GuestPitch");
    expect(signup).toContain("無料ではじめる");
    expect(login).not.toContain("980");
    expect(signup).not.toContain("980");
    expect(pitch).not.toContain("980");
  });
});
