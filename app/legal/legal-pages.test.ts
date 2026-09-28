import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("legal pages wiring", () => {
  it("footer, settings, login, and signup link to the three legal pages", () => {
    const shell = readFileSync("app/components/app-shell.tsx", "utf8");
    const settings = readFileSync("app/settings/page.tsx", "utf8");
    const login = readFileSync("app/login/page.tsx", "utf8");
    const signup = readFileSync("app/signup/page.tsx", "utf8");
    expect(shell).toContain("LegalNav");
    expect(settings).toContain("LegalNav");
    expect(login).toContain("LegalNav");
    expect(signup).toContain("/legal/terms");
    expect(signup).toContain("/legal/privacy");
  });

  it("privacy policy keeps compare anonymous and limits Japan stats to public animals", () => {
    const privacy = readFileSync("app/legal/privacy/page.tsx", "utf8");
    expect(privacy).toContain("匿名集計");
    expect(privacy).toContain("非公開にした個体のページや写真");
    expect(privacy).toContain("全ユーザーの公開個体だけを匿名集計");
    expect(privacy).toContain("非公開個体は日本のクレス統計に含めません");
  });

  it("tokushoho page reads operator fields instead of hard-coded identity", () => {
    const page = readFileSync("app/legal/tokushoho/page.tsx", "utf8");
    expect(page).toContain("legalOperator");
    expect(page).not.toContain("株式会社");
    expect(page).not.toContain("090-");
  });
});
