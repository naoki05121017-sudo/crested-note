import Link from "next/link";
import { HomeCheckList } from "@/app/components/home-check-list";
import { PageHeader } from "@/app/components/ui";
import { requireSessionUser } from "@/lib/auth/session";
import { checkReminder } from "@/lib/care/check-cadence";
import { crestCheckItemFromReminder, sortCrestCheckItems } from "@/lib/care/crest-check-list";
import { listWeightsForAnimals } from "@/lib/db/animal-io";
import { listOwnedCheckAnimals } from "@/lib/db/owned-tables";
import { latestWeight } from "@/lib/stats/compare";
import { todayIso } from "@/lib/stats/math";

export const dynamic = "force-dynamic";
export const metadata = { title: "クレスチェック" };

export default async function ChecksPage() {
  const user = await requireSessionUser();
  const checkRecords = await listOwnedCheckAnimals(user.id);
  const weightRows = await listWeightsForAnimals(checkRecords.map((row) => row.id));
  const byWeights = new Map<string, typeof weightRows>();
  for (const row of weightRows) {
    const list = byWeights.get(row.animalId) ?? [];
    list.push(row);
    byWeights.set(row.animalId, list);
  }
  const asOf = todayIso();
  const checks = sortCrestCheckItems(
    checkRecords.flatMap((animal) => {
      const reminder = checkReminder({
        checkEveryDays: animal.checkEveryDays,
        lastWeighedOn: latestWeight(byWeights.get(animal.id) ?? [])?.weighedOn,
        asOf,
      });
      return reminder ? [crestCheckItemFromReminder(animal, reminder)] : [];
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="CHECK"
        title="クレスチェック"
        description="期限超過と今日チェックを先に、残りは次の記録が近い順です。"
      />

      {checks.length === 0 ? (
        <section className="nc-lift rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] px-5 py-12 text-center text-ink sm:p-12">
          <p className="text-lg font-semibold">チェック対象はまだありません</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            個体の記録の間隔を決めると、ここに並びます。
          </p>
          <Link href="/animals" className="nc-btn mt-6">
            マイ個体を見る
          </Link>
        </section>
      ) : (
        <section className="nc-lift rounded-[2rem] bg-gradient-to-br from-[#fff6e8] to-[#fff8fb] p-5 text-ink sm:p-6">
          <HomeCheckList items={checks} />
        </section>
      )}
    </div>
  );
}
