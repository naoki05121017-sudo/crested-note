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

  it("tokushoho page reads operator fields instead of hard-coded identity", () => {
    const page = readFileSync("app/legal/tokushoho/page.tsx", "utf8");
    expect(page).toContain("legalOperator");
    expect(page).not.toContain("株式会社");
    expect(page).not.toContain("090-");
  });
});
