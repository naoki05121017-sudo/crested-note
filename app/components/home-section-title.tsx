import Link from "next/link";

export function HomeSectionTitle({
  kicker,
  title,
  href,
  action = "すべて見る",
  tone,
  compact = false,
}: {
  kicker: string;
  title: string;
  href?: string;
  action?: string;
  tone: "mint" | "lilac" | "mist" | "blush" | "care";
  compact?: boolean;
}) {
  return (
    <div className={`nc-section-title${compact ? " nc-section-title-compact" : ""}`}>
      <div className="min-w-0">
        <p className={`nc-section-kicker nc-tone-${tone}`}>{kicker}</p>
        <h2>{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="nc-section-more">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
