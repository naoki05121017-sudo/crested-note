import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public animal photo route", () => {
  it("serves public photos and living gallery covers without a session; other private files stay owner-only", () => {
    const route = readFileSync("app/api/animal-photos/[animalId]/[file]/route.ts", "utf8");
    const proxy = readFileSync("proxy.ts", "utf8");
    expect(route).toContain("parseAnimalPhotoObjectKey");
    expect(route).toContain("canReadAnimalPhoto");
    expect(route).toContain("animalPhotoObjectKey");
    expect(route).toContain("isGalleryCover");
    expect(route).toContain("const isPublic = Boolean(animal.is_public)");
    expect(route.indexOf("const isPublic")).toBeLessThan(route.indexOf("getSessionUser()"));
    expect(route).toContain("if (!guestOk)");
    expect(proxy).toContain('pathname.startsWith("/api/animal-photos/")');
    expect(proxy.indexOf('pathname.startsWith("/api/animal-photos/")')).toBeGreaterThan(
      proxy.indexOf("hasSupabaseAuthCookie"),
    );
  });
});
