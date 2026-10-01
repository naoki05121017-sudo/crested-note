import { CREST_NOTE_INCLUDED } from "@/lib/care/included";

export function IncludedFeatures() {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        クレスノートでできること
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        記録・比較・振り返りをひとつの場所にまとめています。
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {CREST_NOTE_INCLUDED.map((label) => (
          <li
            key={label}
            className="rounded-full bg-white/55 px-3 py-1.5 text-sm text-ink/80"
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
