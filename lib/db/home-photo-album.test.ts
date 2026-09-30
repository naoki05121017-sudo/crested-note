import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOME_PHOTO_PREVIEW, PHOTO_ALBUM_PAGE_SIZE } from "./animal-search";

describe("home growth album compaction", () => {
  it("caps the home photo preview and paginates the compact album", () => {
    expect(HOME_PHOTO_PREVIEW).toBe(6);
    expect(PHOTO_ALBUM_PAGE_SIZE).toBe(24);
  });

  it("keeps home album data on existing photo_url rows and latest weights", () => {
    const home = readFileSync("app/(app)/page.tsx", "utf8");
    const owned = readFileSync("lib/db/owned-tables.ts", "utf8");
    expect(home).toContain("listOwnedPhotoAnimals(user.id, HOME_PHOTO_PREVIEW)");
    expect(home).toContain("[...animals, ...photoAnimals]");
    expect(owned).toContain('.neq("photo_url", "")');
    expect(owned).not.toContain("photo_history");
  });

  it("renders a compact thumbnail grid and sends すべて to /album", () => {
    const dashboard = readFileSync("app/components/home-dashboard.tsx", "utf8");
    const album = readFileSync("app/(app)/album/page.tsx", "utf8");
    expect(dashboard).toContain('href="/album"');
    expect(dashboard).toContain("PhotoAlbumGrid");
    expect(dashboard).toContain("HOME_PHOTO_PREVIEW");
    expect(dashboard).not.toContain("aspect-[4/5]");
    expect(album).toContain("listOwnedPhotoAnimalsPage");
    expect(album).toContain("PhotoAlbumGrid");
    expect(album).toContain("PHOTO_ALBUM_PAGE_SIZE");
  });
});
