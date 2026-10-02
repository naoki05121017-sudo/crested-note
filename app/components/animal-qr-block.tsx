"use client";

import { useEffect, useRef, useState } from "react";
import {
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  paintShareCard,
} from "@/lib/qr/paint-share-card";
import {
  animalSharePayload,
  shareCardFilename,
  webShareFilesSupported,
  webShareSupported,
  type PublicShareCard,
} from "@/lib/qr/share-card";

export function AnimalQrBlock({ card }: { card: PublicShareCard | null }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [png, setPng] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  const [canShare, setCanShare] = useState(false);
  const previewUrlRef = useRef("");

  useEffect(() => {
    setCanShare(webShareSupported(navigator));
  }, []);

  useEffect(() => {
    if (!open || !card) {
      setPreview("");
      setPng(null);
      setStatus("");
      return;
    }
    let cancelled = false;
    setStatus("");
    setPreview("");
    setPng(null);
    void buildCardImage(card).then((blob) => {
      if (cancelled || !blob) return;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const next = URL.createObjectURL(blob);
      previewUrlRef.current = next;
      setPreview(next);
      setPng(blob);
    });
    return () => {
      cancelled = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }
    };
  }, [open, card]);

  if (!card) {
    return (
      <p className="text-xs leading-5 text-muted">
        公開すると、個体QRから公開ページを開けます。
      </p>
    );
  }

  const share = card;

  async function saveImage() {
    if (!png) return;
    const file = new File([png], shareCardFilename(share.code), { type: "image/png" });
    const href = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setStatus("画像を保存しました。保存されない場合は、画像を長押ししてください。");
  }

  async function shareCard() {
    if (!webShareSupported(navigator)) {
      setStatus("このブラウザでは共有シートを使えません。URLをコピーしてください。");
      return;
    }
    const payload = animalSharePayload(share);
    const file = png
      ? new File([png], shareCardFilename(share.code), { type: "image/png" })
      : null;
    try {
      if (file && webShareFilesSupported(navigator, file)) {
        await navigator.share({ ...payload, files: [file] });
        return;
      }
      await navigator.share(payload);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("共有できませんでした。URLをコピーしてください。");
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(share.url);
      setStatus("公開ページのURLをコピーしました。");
    } catch {
      setStatus("コピーできませんでした。下のURLを長押ししてください。");
    }
  }

  return (
    <details
      className="min-w-0 max-w-full overflow-hidden rounded-2xl bg-[#f6f3f8] px-4 py-3 text-ink"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        個体QRを表示
      </summary>
      <div className="mt-3 min-w-0 max-w-full">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`${share.name}のクレスノート共有カード`}
            width={SHARE_CARD_WIDTH}
            height={SHARE_CARD_HEIGHT}
            className="mx-auto h-auto w-full max-w-full rounded-xl"
          />
        ) : (
          <p className="text-xs text-muted">読み取り用のQRを用意しています…</p>
        )}
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-2">
          <button type="button" className="nc-btn w-full min-w-0" onClick={() => void saveImage()} disabled={!png}>
            画像を保存
          </button>
          {canShare ? (
            <button type="button" className="nc-btn-ghost w-full min-w-0" onClick={() => void shareCard()} disabled={!png}>
              共有
            </button>
          ) : (
            <p className="text-xs leading-5 text-muted">
              このブラウザでは共有シートを使えません。URLをコピーしてください。
            </p>
          )}
          <button type="button" className="nc-btn-ghost w-full min-w-0" onClick={() => void copyUrl()}>
            URLをコピー
          </button>
        </div>
        {status ? <p className="mt-2 text-xs leading-5 text-muted">{status}</p> : null}
        <p className="mt-2 break-all text-center text-[11px] leading-5 text-muted">{share.url}</p>
      </div>
    </details>
  );
}

async function buildCardImage(card: PublicShareCard): Promise<Blob | null> {
  const qrUrl = await qrDataUrl(card.url);
  const [qr, photo] = await Promise.all([
    qrUrl ? loadImage(qrUrl) : Promise.resolve(null),
    card.photoSrc ? loadImage(card.photoSrc) : Promise.resolve(null),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paintShareCard(ctx as unknown as Parameters<typeof paintShareCard>[0], {
    name: card.name,
    morph: card.morph,
    code: card.code,
    photo,
    qr,
  });
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function qrDataUrl(url: string): Promise<string> {
  const mod = await import("qrcode");
  const toDataURL = mod.toDataURL ?? mod.default.toDataURL;
  return toDataURL(url, {
    margin: 1,
    width: 360,
    errorCorrectionLevel: "M",
    color: { dark: "#17141c", light: "#ffffff" },
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
