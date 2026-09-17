import Link from "next/link";
import { GrowthChart } from "@/app/components/growth-chart";
import { Card, EmptyState, PageHeader, Stat } from "@/app/components/ui";
import { listAnimals, weightsByAnimal } from "@/lib/db/queries";
import { animalTitle } from "@/lib/db/labels";
import { compareAnimal } from "@/lib/stats/compare";

export const dynamic = "force-dynamic";
export const metadata = { title: "全国比較" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const animals = await listAnimals();
  const selectedId =
    typeof params.animalId === "string" ? params.animalId : animals[0]?.id ?? "";
  const animal = animals.find((row) => row.id === selectedId);
  const byWeights = await weightsByAnimal();
  const comparison = animal
    ? compareAnimal({
        animal,
        logs: byWeights.get(animal.id) ?? [],
        others: animals.map((row) => ({
          animal: row,
          logs: byWeights.get(row.id) ?? [],
        })),
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="COMPARE"
        title="全国個体比較"
        description="順位は出しません。モルフ・性別・月齢が近い個体の平均と比べます。"
      />

      {animals.length === 0 ? (
        <EmptyState
          title="先に個体を登録してください"
          body="体重を記録した個体があると、同条件平均と比較できます。"
        />
      ) : (
        <form className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end" action="/compare">
          <label className="grid min-w-60 flex-1 gap-1 text-sm">
            <span>比較する個体</span>
            <select name="animalId" defaultValue={selectedId} className="nc-input">
              {animals.map((row) => (
                <option key={row.id} value={row.id}>
                  {animalTitle(row)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="nc-btn w-full sm:w-auto">
            見る
          </button>
        </form>
      )}

      {animal && comparison ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat
              label="あなたの個体"
              value={
                comparison.mineWeight === null
                  ? "—"
                  : `${comparison.mineWeight.toFixed(1)}g`
              }
            />
            <Stat
              label="同条件の平均"
              value={
                comparison.average === null
                  ? "—"
                  : `${comparison.average.toFixed(1)}g`
              }
              hint={`n=${comparison.sampleSize}`}
            />
            <Stat
              label="平均との差"
              value={
                comparison.diff === null
                  ? "—"
                  : `${comparison.diff > 0 ? "+" : ""}${comparison.diff.toFixed(1)}g`
              }
              hint={comparison.tone}
            />
          </div>
          <p className="text-sm text-muted">
            条件：{comparison.morph} / 月齢 {comparison.ageMonths ?? "不明"}ヶ月前後
            （±3ヶ月）。サンプルが少ないときは「比較できません」と出ます。
          </p>
          <Card>
            <div className="mb-3 flex flex-wrap gap-4 text-sm">
              <span>黒：この個体</span>
              <span className="text-accent-strong">緑：同条件の平均</span>
            </div>
            <GrowthChart
              mine={comparison.mineCurve}
              average={comparison.averageCurve}
            />
          </Card>
          <Link href={`/animals/${animal.id}`} className="nc-btn-ghost w-fit">
            個体の体重を追加する
          </Link>
        </>
      ) : null}
    </div>
  );
}
