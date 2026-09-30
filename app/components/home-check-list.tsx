import Link from "next/link";
import {
  crestCheckStatusLabel,
  type CrestCheckItem,
} from "@/lib/care/crest-check-list";

function careValue(item: CrestCheckItem) {
  if (!item.due) return "✓";
  if (item.daysSince != null) return `${item.daysSince}日`;
  return crestCheckStatusLabel(item);
}

export function HomeCheckList({
  items,
  compact = false,
}: {
  items: CrestCheckItem[];
  compact?: boolean;
}) {
  if (compact) {
    return (
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-b border-white/8 last:border-0">
            <Link
              href={`/animals/${item.id}#weight`}
              className="flex min-h-11 min-w-0 items-center justify-between gap-4 py-1.5 text-[15px] active:opacity-70"
            >
              <span className="min-w-0 truncate text-white/80">{item.name}</span>
              <span
                className={`shrink-0 tabular-nums ${
                  item.due ? "text-[#e0b08a]" : "nc-tone-mint"
                }`}
              >
                {careValue(item)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <Link href={`/animals/${item.id}#weight`} className="block rounded-[0.9rem] py-1 active:bg-black/4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{item.name}</p>
              <p
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  item.due ? "text-[#b45309]" : "text-ink/50"
                }`}
              >
                {crestCheckStatusLabel(item)}
              </p>
            </div>
            {item.due ? (
              <p className="mt-1 text-sm text-ink/80">{item.headline}</p>
            ) : null}
            <p className="mt-1 text-sm text-muted">{item.body}</p>
            <p className="mt-2 text-sm font-medium text-ink/70">
              {item.due ? "体重を記録する" : "記録へ進む"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
