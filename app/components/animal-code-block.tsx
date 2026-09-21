import { displayAnimalId, formatAnimalCode } from "@/lib/db/animal-code";

export function AnimalCodeBlock({
  code,
  pending = false,
}: {
  code?: string;
  pending?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-line bg-sand/70 px-4 py-4">
      <p className="text-sm text-muted">個体ID</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-wide text-ink sm:text-3xl">
        {pending ? "登録後に自動発行" : displayAnimalId(code)}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">
        {pending
          ? `クレスノートが ${formatAnimalCode(1)} 形式で発行します。手入力は不要です。`
          : "削除しても再利用しません。編集では変わりません。"}
      </p>
    </div>
  );
}
