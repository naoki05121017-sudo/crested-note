import { describe, expect, it } from "vitest";
import {
  SHARE_CARD_BRAND,
  SHARE_CARD_BYLINE,
  SHARE_CARD_CTA,
} from "./share-card";
import { paintShareCard, type ShareCardPaintContext } from "./paint-share-card";

function mockCtx(): { ctx: ShareCardPaintContext; texts: string[]; drawn: { count: number } } {
  const texts: string[] = [];
  const drawn = { count: 0 };
  const ctx: ShareCardPaintContext = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect: () => undefined,
    fillText: (text) => {
      texts.push(text);
    },
    measureText: (text) => ({ width: Array.from(text).length * 24 }),
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    rect: () => undefined,
    clip: () => undefined,
    fill: () => undefined,
    drawImage: () => {
      drawn.count += 1;
    },
    roundRect: () => undefined,
  };
  return { ctx, texts, drawn };
}

describe("paint share card", () => {
  it("paints brand, keeper ID, CTA, photo, and QR", () => {
    const { ctx, texts, drawn } = mockCtx();
    paintShareCard(ctx, {
      name: "リリー",
      morph: "リリーホワイト",
      code: "NC-000042",
      photo: { width: 800, height: 600 },
      qr: { width: 240, height: 240 },
    });
    expect(texts).toContain(SHARE_CARD_BRAND);
    expect(texts).toContain(SHARE_CARD_BYLINE);
    expect(texts).toContain(SHARE_CARD_CTA);
    expect(texts).toContain("リリー");
    expect(texts).toContain("リリーホワイト");
    expect(texts).toContain("NC-000042");
    expect(drawn.count).toBe(2);
  });

  it("still paints brand and QR when there is no photo", () => {
    const { ctx, texts, drawn } = mockCtx();
    paintShareCard(ctx, {
      name: "ソラ",
      morph: "モルフ未設定",
      code: "NC-000007",
      photo: null,
      qr: { width: 240, height: 240 },
    });
    expect(texts.filter((text) => text === SHARE_CARD_BRAND).length).toBeGreaterThanOrEqual(2);
    expect(texts).toContain(SHARE_CARD_BYLINE);
    expect(texts).toContain("NC-000007");
    expect(drawn.count).toBe(1);
  });
});
