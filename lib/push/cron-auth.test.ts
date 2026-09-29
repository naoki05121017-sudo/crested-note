import { describe, expect, it } from "vitest";
import { cronAuthorized } from "./cron-auth";

describe("cronAuthorized", () => {
  it("accepts only the matching bearer secret", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";
    const ok = new Request("https://example.com", {
      headers: { authorization: "Bearer test-secret" },
    });
    const bad = new Request("https://example.com", {
      headers: { authorization: "Bearer other" },
    });
    const missing = new Request("https://example.com");
    expect(cronAuthorized(ok)).toBe(true);
    expect(cronAuthorized(bad)).toBe(false);
    expect(cronAuthorized(missing)).toBe(false);
    delete process.env.CRON_SECRET;
    expect(cronAuthorized(ok)).toBe(false);
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});
