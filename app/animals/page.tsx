import Link from "next/link";
import { CrestLinkRedeemCard } from "@/app/animals/crest-link-redeem";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { Badge } from "@/app/components/ui";
import { cadenceLabel } from "@/lib/care/check-cadence";
import { displayAnimalId } from "@/lib/db/animal-code";
import { filterAnimals, weightsByAnimal } from "@/lib/db/queries";
import { ANIMAL_STATUS_LABEL, SEX_LABEL } from "@/lib/db/labels";
import { ANIMAL_STATUSES, SEXES } from "@/lib/db/types";
import { formatGenotypeLabel, visualTraitName } from "@/lib/genetics";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体" };

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const sex = typeof params.sex === "string" ? params.sex : "";
  const status = typeof params.status === "string" ? params.status : "";
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const listed = await filterAnimals({
    q,
    sex,
    status,
    page: Number.isFinite(page) ? page : 1,
  });
  const animals = listed.animals;
  const byWeights = await weightsByAnimal(animals.map((row) => row.id));
  const pageCount = Math.max(1, Math.ceil(listed.total / listed.pageSize));
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (sex) query.set("sex", sex);
  if (status) query.set("status", status);
  function pageHref(target: number) {
    const next = new URLSearchParams(query);
    if (target > 1) next.set("page", String(target));
    const text = next.toString();
    return text ? `/animals?${text}` : "/animals";
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] tracking-[0.22em] text-white/40 uppercase">Collection</p>
          <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            個体
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/60">
            登録・検索・絞り込み。詳細から体重・血統・公開リンクも管理できます。
          </p>
        </div>
        <Link href="/animals/new" className="nc-btn w-full sm:w-auto">
          新規登録
        </Link>
      </div>

      <form
        action="/animals"
        className="nc-lift grid gap-3 rounded-[2rem] bg-gradient-to-br from-[#fde8ef] to-[#ece6fb] p-5 text-ink sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="名前・番号・モルフ"
          className="nc-input sm:col-span-2"
        />
        <select name="sex" defaultValue={sex} className="nc-input">
          <option value="">性別（すべて）</option>
          {SEXES.map((value) => (
            <option key={value} value={value}>
              {SEX_LABEL[value]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="nc-input">
          <option value="">ステータス（すべて）</option>
          {ANIMAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ANIMAL_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <button type="submit" className="nc-btn-ghost w-full sm:col-span-2 lg:col-span-4 sm:w-fit">
          絞り込み
        </button>
      </form>

      {animals.length === 0 ? (
        <section className="nc-lift rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] px-5 py-12 text-center text-ink sm:p-12">
          <p className="text-lg font-semibold">まだ個体がありません</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            最初の1匹を登録すると、遺伝計算や繁殖につなげられます。
          </p>
          <Link href="/animals/new" className="nc-btn mt-6">
            個体を登録
          </Link>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => {
            const logs = byWeights.get(animal.id) ?? [];
            const latest = logs[logs.length - 1];
            return (
              <li key={animal.id}>
                <Link
                  href={`/animals/${animal.id}`}
                  className="nc-lift block overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] text-ink"
                >
                  {animal.photoUrl ? (
                    <div className="aspect-[4/3] bg-[#f6f3f8]">
                      <AnimalPhoto
                        src={animal.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-lg font-semibold tracking-tight">{animal.name}</p>
                      <Badge
                        tone={
                          animal.sex === "female" ? "blush" : animal.sex === "male" ? "mist" : "sand"
                        }
                      >
                        {SEX_LABEL[animal.sex]}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-ink/70">
                      {displayAnimalId(animal)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      {animal.morphLabel || formatGenotypeLabel(animal.genotype)}
                    </p>
                    {animal.traits.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {animal.traits
                          .map((id) => visualTraitName(id, animal.traitLevels?.[id]))
                          .join(" / ")}
                      </p>
                    ) : null}
                    {cadenceLabel(animal.checkEveryDays) ? (
                      <p className="mt-1 text-xs text-muted">
                        チェック：{cadenceLabel(animal.checkEveryDays)}
                      </p>
                    ) : null}
                    <div className="mt-4 flex items-end justify-between gap-3 rounded-[1.15rem] bg-[#eef6f1] px-3 py-3">
                      <div>
                        <p className="text-xs text-muted">体重</p>
                        <p className="text-2xl font-semibold tabular-nums">
                          {latest ? `${latest.weightG}g` : "—"}
                        </p>
                      </div>
                      <Badge tone={animal.status === "breeding" ? "sage" : "sand"}>
                        {ANIMAL_STATUS_LABEL[animal.status]}
                      </Badge>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {listed.total > listed.pageSize ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
          <p>
            {listed.total}件中 {(listed.page - 1) * listed.pageSize + 1}–
            {Math.min(listed.page * listed.pageSize, listed.total)}件
          </p>
          <div className="flex gap-2">
            {listed.page > 1 ? (
              <Link href={pageHref(listed.page - 1)} className="nc-btn-ghost">
                前へ
              </Link>
            ) : null}
            {listed.page < pageCount ? (
              <Link href={pageHref(listed.page + 1)} className="nc-btn-ghost">
                次へ
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      <CrestLinkRedeemCard />
    </div>
  );
}
