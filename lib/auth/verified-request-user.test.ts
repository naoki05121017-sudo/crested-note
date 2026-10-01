import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  VERIFIED_AUTH_HEADER,
  VERIFIED_USER_EMAIL_HEADER,
  VERIFIED_USER_ID_HEADER,
  markVerifiedUserHeaders,
  readVerifiedSessionUser,
  stripVerifiedUserHeaders,
} from "./verified-request-user";

const userId = "11111111-1111-4111-8111-111111111111";

describe("verified request user headers", () => {
  it("overwrites spoofed identity after proxy getUser", () => {
    const headers = new Headers();
    headers.set(VERIFIED_AUTH_HEADER, "1");
    headers.set(VERIFIED_USER_ID_HEADER, "00000000-0000-4000-8000-000000000000");
    headers.set(VERIFIED_USER_EMAIL_HEADER, "spoof@example.com");
    markVerifiedUserHeaders(headers, { id: userId, email: "real@example.com" });
    expect(readVerifiedSessionUser(headers)).toEqual({
      id: userId,
      email: "real@example.com",
    });
  });

  it("treats a verified empty user as logged out without falling through", () => {
    const headers = new Headers();
    markVerifiedUserHeaders(headers, null);
    expect(readVerifiedSessionUser(headers)).toBeNull();
  });

  it("ignores unverified headers so getUser remains the fallback", () => {
    const headers = new Headers();
    headers.set(VERIFIED_USER_ID_HEADER, userId);
    expect(readVerifiedSessionUser(headers)).toBeUndefined();
    stripVerifiedUserHeaders(headers);
    expect(headers.get(VERIFIED_USER_ID_HEADER)).toBeNull();
  });

  it("rejects a non-uuid id even when the verified flag is set", () => {
    const headers = new Headers();
    headers.set(VERIFIED_AUTH_HEADER, "1");
    headers.set(VERIFIED_USER_ID_HEADER, "not-a-user");
    expect(readVerifiedSessionUser(headers)).toBeNull();
  });
});

describe("proxy and session still verify with getUser", () => {
  it("keeps getUser in proxy for refresh and reads the verified header in getSessionUser", () => {
    const proxy = readFileSync("proxy.ts", "utf8");
    const session = readFileSync("lib/auth/session.ts", "utf8");
    const layout = readFileSync("app/(app)/layout.tsx", "utf8");
    expect(proxy).toContain("supabase.auth.getUser()");
    expect(proxy).toContain("markVerifiedUserHeaders");
    expect(proxy).toContain("stripVerifiedUserHeaders");
    expect(session).toContain("readVerifiedSessionUser");
    expect(session).toContain("supabase.auth.getUser()");
    expect(layout).toContain("getSessionUser");
    expect(layout).toContain("getOwnStoredDisplayName");
    expect(layout).toContain('redirect("/nickname")');
  });
});
