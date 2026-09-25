import { describe, expect, it } from "vitest";
import { cronAuthorized } from "./cron-auth";

describe("cronAuthorized", () => {
  it("accepts the bearer secret", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";
    const ok = new Request("https://example.com", {
      headers: { authorization: "Bearer test-secret" },
    });
    const bad = new Request("https://example.com", {
      headers: { authorization: "Bearer other" },
    });
    expect(cronAuthorized(ok)).toBe(true);
    expect(cronAuthorized(bad)).toBe(false);
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});
