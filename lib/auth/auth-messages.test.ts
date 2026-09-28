import { describe, expect, it } from "vitest";
import {
  SIGNUP_CONFIRM_NOTICE,
  friendlyAuthError,
  isUnconfirmedSignupUser,
} from "./auth-messages";

describe("auth error copy", () => {
  it("translates signup and confirm failures into Japanese", () => {
    expect(friendlyAuthError("User already registered", "x")).toContain("登録済み");
    expect(friendlyAuthError("Email not confirmed", "x")).toContain("確認メール");
    expect(friendlyAuthError("Invalid login credentials", "x")).toContain("違います");
    expect(friendlyAuthError("For security purposes, you can only request this after 60 seconds.", "x")).toContain(
      "しばらく待って",
    );
  });

  it("keeps unknown supabase messages instead of hiding them", () => {
    expect(friendlyAuthError("Database error saving new user", "x")).toBe(
      "Database error saving new user",
    );
  });

  it("treats empty identities as a duplicate signup, not a new confirmable user", () => {
    expect(isUnconfirmedSignupUser({ identities: [] })).toBe(false);
    expect(isUnconfirmedSignupUser({ identities: [{ identity_id: "1" }] })).toBe(true);
    expect(SIGNUP_CONFIRM_NOTICE).toContain("確認メール");
  });
});
