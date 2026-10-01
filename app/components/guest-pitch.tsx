import Link from "next/link";

export function GuestPitch({
  ctaHref = "/signup",
  ctaLabel = "無料ではじめる",
  showCta = true,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  showCta?: boolean;
}) {
  return (
    <div className="max-w-md">
      <p className="text-[15px] leading-7 text-white/70">
        クレスの飼育・成長・繁殖をまとめて管理
      </p>
      <p className="mt-3 text-sm tracking-wide text-white/40">
        記録 → 成長 → 比較 → 繁殖
      </p>
      {showCta ? (
        <Link href={ctaHref} className="nc-btn mt-5 w-full min-h-12">
          {ctaLabel}
        </Link>
      ) : null}
      <p className={`text-sm text-white/45 ${showCta ? "mt-3" : "mt-5"}`}>
        <Link href="/gallery" className="underline underline-offset-2">
          みんなのクレスを見る
        </Link>
      </p>
    </div>
  );
}
