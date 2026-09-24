import Link from "next/link";
import { GrowthChart } from "@/app/components/growth-chart";
import { Card, EmptyState, PageHeader, Stat } from "@/app/components/ui";
import { listAnimals, listPublicAnimals, publicWeightsByAnimal, weightsByAnimal } from "@/lib/db/queries";
import { animalTitle } from "@/lib/db/labels";
import { compareAnimal } from "@/lib/stats/compare";

export const dynamic = "force-dynamic";
export const metadata = { title: "全国個体比較" };

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
  const publicAnimals = await listPublicAnimals();
  const publicWeights = await publicWeightsByAnimal();
  const others = publicAnimals.map((row) => ({
    animal: row,
    logs: publicWeights.get(row.id) ?? [],
  }));
  const comparison = animal
    ? compareAnimal({
        animal,
        logs: byWeights.get(animal.id) ?? [],
        others,
      })
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="COMPARE"
        title="全国個体比較"
        description="日本国内の、条件が近い個体の平均体重と比べます。海外データは含めません。順位・パーセンタイル・上位○%は出しません。全国の飼育者データがまだ少ないときは、クレスノートに登録された個体だけの参考値です。"
      />

      {animals.length === 0 ? (
        <EmptyState
          title="先に個体を登録してください"
          body="体重を記録した個体があると、日本国内の近い条件の平均と比べられます。ランキングではありません。"
        />
      ) : (
        <form
          className="grid max-w-xl gap-3 rounded-[1.75rem] border border-line bg-white p-5 text-ink shadow-[0_16px_40px_rgba(12,10,16,0.28)] sm:grid-cols-[1fr_auto] sm:items-end sm:p-6"
          action="/compare"
        >
          <label className="grid min-w-0 flex-1 gap-1 text-sm">
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
              tone="blush"
            />
            <Stat
              label="同条件の平均"
              value={
                comparison.comparable && comparison.average !== null
                  ? `${comparison.average.toFixed(1)}g`
                  : "—"
              }
              hint={
                comparison.comparable
                  ? `n=${comparison.sampleSize}`
                  : comparison.tone
              }
              tone="mist"
            />
            <Stat
              label="平均との差"
              value={comparison.vsAverage ?? "—"}
              hint={comparison.comparable ? comparison.tone : "件数不足"}
              tone="sage"
            />
          </div>
          <p className="text-sm text-white/55">
            条件：日本国内 / {comparison.morph} / 月齢 {comparison.ageMonths ?? "不明"}ヶ月前後
            （近い月齢・同じ性別・同じモルフ）。順位は表示しません。データが少ないときは平均を出しません。
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
