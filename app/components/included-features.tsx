import {
  CREST_NOTE_INCLUDED,
  CREST_NOTE_MONTHLY_PRICE_LABEL,
} from "@/lib/care/included";

export function IncludedFeatures({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        クレスノートでできること
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        飼っているあいだ、記録・振り返り・比較がひとつの場所にまとまっています。
        {compact ? null : ` ${CREST_NOTE_MONTHLY_PRICE_LABEL}のサブスクリプションを想定しています。`}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {CREST_NOTE_INCLUDED.map((label) => (
          <li
            key={label}
            className="rounded-full bg-[#f6f3f8] px-3 py-1 text-sm text-ink/80"
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
