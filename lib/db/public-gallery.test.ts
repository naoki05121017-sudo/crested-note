import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVING_STATUSES, loginGalleryPreviewCards, parseGalleryFilters, settingsRevalidatePaths, toGalleryCard } from "./public-gallery";

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

  it("omits href, nickname, and private identifiers for unpublished animals but keeps the cover photo", () => {
    const card = toGalleryCard(privateRow);
    expect(card).toEqual({
      name: "非公開レオ",
      sex: "male",
      morphLabel: "ダルト",
      nickname: "",
      weightG: 12,
      photoUrl: "https://example.com/secret.jpg",
      href: null,
    });
    expect(card.href).toBeNull();
    expect(JSON.stringify(card)).not.toContain("secret-slug");
    expect(JSON.stringify(card)).not.toContain("user_id");
    expect(JSON.stringify(card)).not.toContain("shareSlug");
    expect(JSON.stringify(card)).not.toContain("なお");
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

  it("does not link when a public animal has no slug, but still shows the cover photo", () => {
    const card = toGalleryCard({
      ...privateRow,
      isPublic: true,
      shareSlug: "  ",
      photoUrl: "https://example.com/cover.jpg",
    });
    expect(card.photoUrl).toBe("https://example.com/cover.jpg");
    expect(card.href).toBeNull();
  });
});

describe("login gallery preview", () => {
  it("keeps only public animals that have a photo and drops private fields", () => {
    const preview = loginGalleryPreviewCards([
      toGalleryCard({
        isPublic: false,
        name: "非公開レオ",
        sex: "male",
        morphLabel: "ダルト",
        photoUrl: "https://example.com/secret.jpg",
        shareSlug: "secret-slug",
        nickname: "なお",
        weightG: 12,
      }),
      toGalleryCard({
        isPublic: true,
        name: "公開リリー",
        sex: "female",
        morphLabel: "リリーホワイト",
        photoUrl: "https://example.com/lily.jpg",
        shareSlug: "open-lily",
        nickname: "飼い主A",
        weightG: 38,
      }),
      toGalleryCard({
        isPublic: true,
        name: "写真なし",
        sex: "unknown",
        morphLabel: "ノーマル",
        photoUrl: "",
        shareSlug: "open-blank",
        nickname: "飼い主B",
        weightG: null,
      }),
      toGalleryCard({
        isPublic: true,
        name: "公開ソラ",
        sex: "male",
        morphLabel: "ファントム",
        photoUrl: "https://example.com/sora.jpg",
        shareSlug: "open-sora",
        nickname: "飼い主C",
        weightG: 41,
      }),
      toGalleryCard({
        isPublic: true,
        name: "公開モカ",
        sex: "female",
        morphLabel: "ハーレ",
        photoUrl: "https://example.com/moca.jpg",
        shareSlug: "open-moca",
        nickname: "飼い主D",
        weightG: 33,
      }),
      toGalleryCard({
        isPublic: true,
        name: "公開4匹目",
        sex: "male",
        morphLabel: "ダル",
        photoUrl: "https://example.com/four.jpg",
        shareSlug: "open-four",
        nickname: "飼い主E",
        weightG: 29,
      }),
    ]);
    expect(preview).toEqual([
      { name: "公開リリー", morphLabel: "リリーホワイト", photoUrl: "https://example.com/lily.jpg" },
      { name: "公開ソラ", morphLabel: "ファントム", photoUrl: "https://example.com/sora.jpg" },
      { name: "公開モカ", morphLabel: "ハーレ", photoUrl: "https://example.com/moca.jpg" },
    ]);
    expect(JSON.stringify(preview)).not.toContain("nickname");
    expect(JSON.stringify(preview)).not.toContain("飼い主");
    expect(JSON.stringify(preview)).not.toContain("user_id");
    expect(JSON.stringify(preview)).not.toContain("secret");
    expect(JSON.stringify(preview)).not.toContain("weight");
  });
});

describe("settings nickname revalidation", () => {
  it("revalidates gallery and public animal pages after nickname save", () => {
    const src = readFileSync("app/(app)/settings/actions.ts", "utf8");
    expect(src).toContain("settingsRevalidatePaths");
    expect(src).toContain("listPublicShareSlugsForUser");
    expect(src).toContain("revalidateApp(...publicPaths)");
    expect(settingsRevalidatePaths(["open-slug"])).toEqual([
      "/settings",
      "/gallery",
      "/(app)/gallery",
      "/p/[slug]",
      "/(public)/p/[slug]",
      "/p/open-slug",
    ]);
  });

  it("reads live nicknames from display_name only", () => {
    const src = readFileSync("lib/db/public-gallery.ts", "utf8");
    expect(src).toContain("livePublicNickname");
    expect(src).not.toContain("collection_name");
    expect(src).not.toContain("email");
  });
});

describe("gallery living listing", () => {
  it("lists living animals regardless of public flag, and only public cards get a detail href", () => {
    const src = readFileSync("lib/db/public-gallery.ts", "utf8");
    const listFn = src.slice(
      src.indexOf("export async function listPublicGalleryPage"),
      src.indexOf("export async function listAlbumPhotosForAnimal"),
    );
    expect(LIVING_STATUSES).toEqual(["active", "breeding"]);
    expect(listFn).toContain('.in("status", [...LIVING_STATUSES])');
    expect(listFn).not.toContain('.eq("is_public", true)');
    expect(listFn).not.toContain('.neq("share_slug", "")');
    expect(listFn).not.toContain("sold");
    expect(listFn).not.toContain("deceased");
    expect(src).toContain("listedPublic ? `/p/${input.shareSlug}` : null");
  });
});
