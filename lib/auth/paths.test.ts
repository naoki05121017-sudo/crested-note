import { describe, expect, it } from "vitest";
import { idsToDelete, isPublicAppPath } from "./paths";

describe("auth path and scoped deletes", () => {
  it("treats login, signup, and public animal pages as public", () => {
    expect(isPublicAppPath("/login")).toBe(true);
    expect(isPublicAppPath("/signup")).toBe(true);
    expect(isPublicAppPath("/p/abc")).toBe(true);
    expect(isPublicAppPath("/auth/callback")).toBe(true);
    expect(isPublicAppPath("/animals")).toBe(false);
    expect(isPublicAppPath("/animals/x/edit")).toBe(false);
    expect(isPublicAppPath("/")).toBe(false);
  });

  it("only deletes ids that belong to the keep-list owner set", () => {
    expect(idsToDelete(["mine", "theirs", "mine-2"], ["mine", "mine-2"])).toEqual(["theirs"]);
    expect(idsToDelete(["a"], [])).toEqual(["a"]);
    expect(idsToDelete([], ["a"])).toEqual([]);
  });
});
