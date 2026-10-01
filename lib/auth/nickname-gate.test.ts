import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { settingsRevalidatePaths } from "@/lib/db/public-gallery";

describe("required nickname onboarding", () => {
  it("gates the main app layout and keeps /nickname outside that gate", () => {
    const main = readFileSync("app/(app)/layout.tsx", "utf8");
    const nickPage = readFileSync("app/(public)/nickname/page.tsx", "utf8");
    const nickAction = readFileSync("app/(public)/nickname/actions.ts", "utf8");
    expect(main).toContain("getOwnStoredDisplayName");
    expect(main).toContain('redirect("/nickname")');
    expect(nickPage).toContain("ニックネームを設定してください");
    expect(nickPage).toContain("requireSessionUser");
    expect(nickAction).toContain("updateOwnedDisplayName");
    expect(nickAction).toContain("settingsRevalidatePaths");
    expect(nickAction).toContain('return actionOk("/")');
    expect(nickAction).not.toContain("animal_comments");
  });

  it("blocks comments and settings without a usable nickname", () => {
    const comments = readFileSync("app/(public)/p/comment-actions.ts", "utf8");
    const settings = readFileSync("app/(app)/settings/actions.ts", "utf8");
    const queries = readFileSync("lib/db/queries.ts", "utf8");
    expect(comments).toContain("requireAppUser");
    expect(settings).toContain("nicknameError");
    expect(settings).toContain("requireAppUser");
    expect(queries).toContain("requireAppUser");
    expect(queries).not.toContain("requireSessionUser");
  });

  it("revalidates gallery and public animal pages after nickname save", () => {
    expect(settingsRevalidatePaths(["open-slug"])).toEqual([
      "/settings",
      "/gallery",
      "/(app)/gallery",
      "/p/[slug]",
      "/(public)/p/[slug]",
      "/p/open-slug",
    ]);
  });
});
