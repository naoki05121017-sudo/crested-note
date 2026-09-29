import Link from "next/link";
import {
  crestCheckStatusLabel,
  type CrestCheckItem,
} from "@/lib/care/crest-check-list";

export function HomeCheckList({ items }: { items: CrestCheckItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="py-3">
          <Link href={`/animals/${item.id}#weight`} className="block">
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
