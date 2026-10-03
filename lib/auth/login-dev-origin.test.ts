import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone LAN login against the Next dev server", () => {
  it("allows private LAN origins so Safari can load /_next and invoke signIn", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const login = readFileSync("app/(public)/login/page.tsx", "utf8");
    const form = readFileSync("app/components/mutation-form.tsx", "utf8");
    const actions = readFileSync("app/auth/actions.ts", "utf8");
    expect(config).toContain("allowedDevOrigins");
    expect(config).toContain("192.168.*.*");
    expect(config).toContain("127.0.0.1");
    expect(login).toContain("action={signIn}");
    expect(login).toContain("MutationForm");
    expect(form).toContain("await action(formData)");
    expect(actions).toContain("signInWithPassword");
    expect(actions).toContain("return actionOk(nextPath(formData))");
  });
});
