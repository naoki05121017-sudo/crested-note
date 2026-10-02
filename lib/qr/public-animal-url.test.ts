import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { publicAnimalPagePath, publicAnimalPageUrl } from "./public-animal-url";

describe("public animal QR target", () => {
  it("builds the existing public page URL from share slug only", () => {
    expect(publicAnimalPagePath("open-lily")).toBe("/p/open-lily");
    expect(
      publicAnimalPageUrl("https://crested-note-vercel.vercel.app", {
        isPublic: true,
        shareSlug: "open-lily",
      }),
    ).toBe("https://crested-note-vercel.vercel.app/p/open-lily");
  });

  it("does not make a QR target for private animals or empty slugs", () => {
    expect(
      publicAnimalPageUrl("https://crested-note-vercel.vercel.app", {
        isPublic: false,
        shareSlug: "secret-slug",
      }),
    ).toBeNull();
    expect(
      publicAnimalPageUrl("https://crested-note-vercel.vercel.app", {
        isPublic: true,
        shareSlug: "  ",
      }),
    ).toBeNull();
    expect(publicAnimalPagePath("../x")).toBeNull();
  });

  it("does not embed owner identity or internal animal uuids", () => {
    const url = publicAnimalPageUrl("https://example.test", {
      isPublic: true,
      shareSlug: "open-lily",
    });
    expect(url).not.toContain("user");
    expect(url).not.toContain("email");
    expect(url).not.toContain("uuid");
    expect(url).not.toMatch(/NC-/);
  });

  it("keeps public slug lookup gated on is_public", () => {
    const queries = readFileSync("lib/db/queries.ts", "utf8");
    expect(queries).toContain("export async function getAnimalBySlug");
    expect(queries).toContain("animal.shareSlug === slug && animal.isPublic");
  });

  it("shows QR beside the keeper ID on the animal detail page", () => {
    const page = readFileSync("app/(app)/animals/[id]/page.tsx", "utf8");
    expect(page).toContain("AnimalCodeBlock");
    expect(page).toContain("AnimalQrBlock");
    expect(page).toContain("buildPublicShareCard");
    expect(page).not.toContain("user.email");
  });
});
