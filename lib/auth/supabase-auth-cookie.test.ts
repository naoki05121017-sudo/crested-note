import { describe, expect, it } from "vitest";
import { hasSupabaseAuthCookie } from "./supabase-auth-cookie";

describe("hasSupabaseAuthCookie", () => {
  it("is false when the browser has no session cookies", () => {
    expect(hasSupabaseAuthCookie([])).toBe(false);
    expect(hasSupabaseAuthCookie([{ name: "csrf" }])).toBe(false);
  });

  it("is true for chunked Supabase SSR auth cookies", () => {
    expect(
      hasSupabaseAuthCookie([{ name: "sb-ahsojwtdjnnefthflomn-auth-token" }]),
    ).toBe(true);
    expect(
      hasSupabaseAuthCookie([{ name: "sb-ahsojwtdjnnefthflomn-auth-token.0" }]),
    ).toBe(true);
  });
});
