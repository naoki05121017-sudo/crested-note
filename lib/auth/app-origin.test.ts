import { describe, expect, it } from "vitest";
import {
  PRODUCTION_APP_ORIGIN,
  authEmailRedirectTo,
  resolveAppOrigin,
  safeNextPath,
} from "./app-origin";

describe("app origin for auth emails", () => {
  it("uses the production app URL on Vercel production even if Site URL is localhost", () => {
    expect(
      resolveAppOrigin({
        vercelEnv: "production",
        siteUrl: "http://localhost:3000",
        requestHost: "localhost:3000",
        requestProto: "http",
      }),
    ).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("prefers an explicit https Site URL on production", () => {
    expect(
      resolveAppOrigin({
        vercelEnv: "production",
        siteUrl: "https://crested-note-vercel.vercel.app/",
      }),
    ).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("keeps local signup on the current localhost host", () => {
    expect(
      resolveAppOrigin({
        requestHost: "localhost:3000",
        requestProto: "http",
      }),
    ).toBe("http://localhost:3000");
    expect(
      resolveAppOrigin({
        requestHost: "127.0.0.1:3000",
        requestProto: "http",
      }),
    ).toBe("http://127.0.0.1:3000");
  });

  it("points confirmation emails at the auth callback on that origin", () => {
    expect(authEmailRedirectTo(PRODUCTION_APP_ORIGIN)).toBe(
      `${PRODUCTION_APP_ORIGIN}/auth/callback`,
    );
  });

  it("rejects open redirects after confirmation", () => {
    expect(safeNextPath("/animals")).toBe("/animals");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
  });
});
