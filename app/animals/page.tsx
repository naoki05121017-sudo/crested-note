import Link from "next/link";
import { CrestLinkRedeemCard } from "@/app/animals/crest-link-redeem";
import { EmptyState, PageHeader, Badge } from "@/app/components/ui";
import { filterAnimals } from "@/lib/db/queries";
import { ANIMAL_STATUS_LABEL, SEX_LABEL, animalTitle } from "@/lib/db/labels";
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
  const animals = await filterAnimals({ q, sex, status });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="COLLECTION"
        title="個体"
        description="登録・検索・絞り込み。詳細から体重・血統・公開リンクも管理できます。"
        actions={
          <Link href="/animals/new" className="nc-btn">
            新規登録
          </Link>
        }
      />

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" action="/animals">
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

      <CrestLinkRedeemCard />

      {animals.length === 0 ? (
        <EmptyState
          title="まだ個体がありません"
          body="最初の1匹を登録すると、遺伝計算や繁殖につなげられます。"
          action={
            <Link href="/animals/new" className="nc-btn">
              個体を登録
            </Link>
          }
        />
      ) : (
        <div className="nc-table-wrap">
          <table className="nc-table min-w-[36rem]">
            <thead>
              <tr>
                <th>個体</th>
                <th>性別</th>
                <th>遺伝子 / 見た目</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => (
                <tr key={animal.id}>
                  <td>
                    <Link href={`/animals/${animal.id}`} className="font-medium hover:underline">
                      {animalTitle(animal)}
                    </Link>
                  </td>
                  <td>
                    <Badge tone={animal.sex === "female" ? "blush" : animal.sex === "male" ? "mist" : "sand"}>
                      {SEX_LABEL[animal.sex]}
                    </Badge>
                  </td>
                  <td className="text-muted">
                    {animal.morphLabel || formatGenotypeLabel(animal.genotype)}
                    {animal.traits.length > 0 ? (
                      <span className="mt-1 block text-xs">
                        {animal.traits
                          .map((id) => visualTraitName(id, animal.traitLevels?.[id]))
                          .join(" / ")}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone={animal.status === "breeding" ? "sage" : "sand"}>
                      {ANIMAL_STATUS_LABEL[animal.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
