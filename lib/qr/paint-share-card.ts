import {
  SHARE_CARD_BRAND,
  SHARE_CARD_BYLINE,
  SHARE_CARD_CTA,
  type PublicShareCard,
} from "@/lib/qr/share-card";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1440;

const INK = "#17141c";
const CREAM = "#f7f1ea";
const PINK = "#f4d5e2";
const MUTED = "rgba(247, 241, 234, 0.58)";
const PHOTO_BG = "#efeaf0";

export type ShareCardImage = {
  width: number;
  height: number;
};

export type ShareCardPaintContext = {
  fillStyle: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  measureText: (text: string) => { width: number };
  save: () => void;
  restore: () => void;
  beginPath: () => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  clip: () => void;
  fill: () => void;
  drawImage: (
    image: ShareCardImage,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void;
  roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
};

export type ShareCardPaintInput = Pick<PublicShareCard, "name" | "morph" | "code"> & {
  photo: ShareCardImage | null;
  qr: ShareCardImage | null;
};

export function paintShareCard(ctx: ShareCardPaintContext, input: ShareCardPaintInput): void {
  const w = SHARE_CARD_WIDTH;
  const h = SHARE_CARD_HEIGHT;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, w, 12);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREAM;
  ctx.font = "700 64px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(SHARE_CARD_BRAND, 72, 108);
  ctx.fillStyle = PINK;
  ctx.font = "600 28px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(SHARE_CARD_BYLINE, 74, 152);

  const photoX = 72;
  const photoY = 196;
  const photoW = w - 144;
  const photoH = 620;
  fillRoundRect(ctx, photoX, photoY, photoW, photoH, 36, PHOTO_BG);
  if (input.photo && input.photo.width > 0 && input.photo.height > 0) {
    ctx.save();
    clipRoundRect(ctx, photoX, photoY, photoW, photoH, 36);
    drawCover(ctx, input.photo, photoX, photoY, photoW, photoH);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(23, 20, 28, 0.28)";
    ctx.font = "600 36px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(SHARE_CARD_BRAND, w / 2, photoY + photoH / 2 - 8);
    ctx.fillStyle = "rgba(23, 20, 28, 0.4)";
    ctx.font = "600 22px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
    ctx.fillText(SHARE_CARD_BYLINE, w / 2, photoY + photoH / 2 + 32);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = CREAM;
  ctx.font = "700 52px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  const nameLines = wrapLines(ctx, input.name, photoW);
  let textY = photoY + photoH + 78;
  for (const line of nameLines.slice(0, 2)) {
    ctx.fillText(line, 72, textY);
    textY += 60;
  }
  ctx.fillStyle = MUTED;
  ctx.font = "500 28px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(input.morph, 72, textY + 8);
  ctx.fillStyle = PINK;
  ctx.font = "600 30px ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.fillText(input.code, 72, textY + 54);

  const qrSize = 280;
  const qrX = 72;
  const qrY = h - 92 - qrSize;
  fillRoundRect(ctx, qrX, qrY, qrSize, qrSize, 28, "#ffffff");
  if (input.qr) {
    ctx.drawImage(input.qr, qrX + 18, qrY + 18, qrSize - 36, qrSize - 36);
  }

  ctx.fillStyle = CREAM;
  ctx.font = "700 36px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(SHARE_CARD_BRAND, qrX + qrSize + 36, qrY + 108);
  ctx.fillStyle = PINK;
  ctx.font = "600 24px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(SHARE_CARD_BYLINE, qrX + qrSize + 36, qrY + 150);
  ctx.fillStyle = MUTED;
  ctx.font = "500 26px 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";
  ctx.fillText(SHARE_CARD_CTA, qrX + qrSize + 36, qrY + 210);
}

function wrapLines(ctx: ShareCardPaintContext, text: string, maxWidth: number): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = "";
  for (const char of chars) {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function fillRoundRect(
  ctx: ShareCardPaintContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, w, h);
}

function clipRoundRect(
  ctx: ShareCardPaintContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
}

function drawCover(
  ctx: ShareCardPaintContext,
  img: ShareCardImage,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const ir = img.width / img.height;
  const rr = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > rr) {
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / ir;
    dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}
