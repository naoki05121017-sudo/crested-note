import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVING_STATUSES, parseGalleryFilters, toGalleryCard } from "./public-gallery";

describe("gallery filters", () => {
  it("keeps search, sex, and page for later UI without requiring them", () => {
    expect(parseGalleryFilters({})).toEqual({ page: 1 });
    expect(parseGalleryFilters({ q: "sable", sex: "female", page: "2" })).toEqual({
      q: "sable",
      sex: "female",
      page: 2,
    });
    expect(parseGalleryFilters({ sex: "dragon", page: "0" })).toEqual({ page: 1 });
  });
});

describe("gallery card DTO", () => {
  const privateRow = {
    isPublic: false,
    name: "非公開レオ",
    sex: "male" as const,
    morphLabel: "ダルト",
    photoUrl: "https://example.com/secret.jpg",
    shareSlug: "secret-slug",
    nickname: "なお",
    weightG: 12,
  };

  it("omits photo, href, and private identifiers for unpublished animals", () => {
    const card = toGalleryCard(privateRow);
    expect(card).toEqual({
      name: "非公開レオ",
      sex: "male",
      morphLabel: "ダルト",
      nickname: "なお",
      weightG: 12,
      photoUrl: null,
      href: null,
    });
    expect(JSON.stringify(card)).not.toContain("secret");
    expect(JSON.stringify(card)).not.toContain("user_id");
    expect(JSON.stringify(card)).not.toContain("shareSlug");
  });

  it("exposes photo and public page link only when the animal is public", () => {
    expect(
      toGalleryCard({
        ...privateRow,
        isPublic: true,
        photoUrl: "https://example.com/cover.jpg",
        shareSlug: "open-slug",
      }),
    ).toEqual({
      name: "非公開レオ",
      sex: "male",
      morphLabel: "ダルト",
      nickname: "なお",
      weightG: 12,
      photoUrl: "https://example.com/cover.jpg",
      href: "/p/open-slug",
    });
  });

  it("does not link or show a photo when a public animal has no slug", () => {
    const card = toGalleryCard({
      ...privateRow,
      isPublic: true,
      shareSlug: "  ",
      photoUrl: "https://example.com/cover.jpg",
    });
    expect(card.photoUrl).toBeNull();
    expect(card.href).toBeNull();
    expect(JSON.stringify(card)).not.toContain("example.com");
  });
});

describe("gallery living listing", () => {
  it("lists active and breeding animals and does not filter the gallery query by is_public", () => {
    const src = readFileSync("lib/db/public-gallery.ts", "utf8");
    const listFn = src.slice(src.indexOf("export async function listPublicGalleryPage"));
    expect(LIVING_STATUSES).toEqual(["active", "breeding"]);
    expect(listFn).toContain('.in("status", [...LIVING_STATUSES])');
    expect(listFn).not.toContain("sold");
    expect(listFn).not.toContain("deceased");
    expect(listFn.slice(0, listFn.indexOf("export async function listAlbumPhotosForAnimal"))).not.toContain(
      '.eq("is_public"',
    );
  });
});
