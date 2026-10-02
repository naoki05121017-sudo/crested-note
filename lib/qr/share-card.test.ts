import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  animalSharePayload,
  buildPublicShareCard,
  shareCardFilename,
  webShareFilesSupported,
  webShareSupported,
} from "./share-card";

const origin = "https://crested-note-vercel.vercel.app";

function publicAnimal(overrides: Partial<Parameters<typeof buildPublicShareCard>[1]> = {}) {
  return {
    isPublic: true,
    shareSlug: "open-lily",
    name: "リリー",
    morphLabel: "リリーホワイト",
    code: "NC-000042",
    photoUrl: "https://proj.supabase.co/storage/v1/object/public/animal-photos/a1/cover.jpg",
    ...overrides,
  };
}

describe("public animal share card", () => {
  it("builds a card for a public animal with the public page URL and keeper ID", () => {
    const card = buildPublicShareCard(origin, publicAnimal());
    expect(card).toEqual({
      url: `${origin}/p/open-lily`,
      name: "リリー",
      morph: "リリーホワイト",
      code: "NC-000042",
      photoSrc: "/api/animal-photos/a1/cover.jpg",
    });
    expect(card?.url).not.toMatch(/NC-/);
    expect(card?.url).not.toContain("email");
    expect(card?.url).not.toContain("user_id");
  });

  it("does not build a card for a private animal even when a slug and photo exist", () => {
    expect(
      buildPublicShareCard(
        origin,
        publicAnimal({
          isPublic: false,
          shareSlug: "secret-slug",
          photoUrl: "https://example.com/secret.jpg",
        }),
      ),
    ).toBeNull();
  });

  it("builds a card without a photo when the public animal has none", () => {
    const card = buildPublicShareCard(origin, publicAnimal({ photoUrl: "  " }));
    expect(card?.photoSrc).toBeNull();
    expect(card?.url).toBe(`${origin}/p/open-lily`);
  });

  it("puts name, Crested Note, and the public URL into the share payload", () => {
    const card = buildPublicShareCard(origin, publicAnimal());
    expect(card).not.toBeNull();
    expect(animalSharePayload(card!)).toEqual({
      title: "リリー｜クレスノート",
      text: "リリー｜クレスノート",
      url: `${origin}/p/open-lily`,
    });
    expect(shareCardFilename(card!.code)).toBe("crest-note-NC-000042.png");
  });

  it("detects Web Share API support and file sharing", () => {
    expect(webShareSupported({})).toBe(false);
    expect(webShareSupported({ share: () => undefined })).toBe(true);
    const file = new File([new Uint8Array(4)], "card.png", { type: "image/png" });
    expect(webShareFilesSupported({}, file)).toBe(false);
    expect(webShareFilesSupported({ canShare: () => true }, file)).toBe(true);
    expect(
      webShareFilesSupported(
        {
          canShare: () => {
            throw new Error("unsupported");
          },
        },
        file,
      ),
    ).toBe(false);
  });

  it("wires the branded share card onto the animal detail QR block", () => {
    const page = readFileSync("app/(app)/animals/[id]/page.tsx", "utf8");
    const block = readFileSync("app/components/animal-qr-block.tsx", "utf8");
    const paint = readFileSync("lib/qr/paint-share-card.ts", "utf8");
    expect(page).toContain("buildPublicShareCard");
    expect(page).toContain("AnimalQrBlock");
    expect(page).not.toContain("user.email");
    expect(block).toContain("画像を保存");
    expect(block).toContain("共有");
    expect(block).toContain("URLをコピー");
    expect(block).toContain("min-w-0");
    expect(block).toContain("max-w-full");
    expect(block).toContain("navigator.clipboard");
    expect(block).toContain("webShareSupported");
    expect(paint).toContain("SHARE_CARD_BRAND");
    expect(paint).toContain("SHARE_CARD_BYLINE");
    expect(paint).toContain("SHARE_CARD_CTA");
    expect(paint).toContain("input.code");
    expect(paint).toContain("input.qr");
    expect(paint).toContain("input.photo");
  });
});
