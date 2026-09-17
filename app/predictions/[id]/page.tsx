import Link from "next/link";
import { notFound } from "next/navigation";
import { PairingResults } from "@/app/components/pairing-results";
import { Card, PageHeader } from "@/app/components/ui";
import { childrenOf, getAnimal, getPrediction } from "@/lib/db/queries";
import { animalTitle } from "@/lib/db/labels";
import { formatGenotypeLabel, formatProbability } from "@/lib/genetics";
import { matchOutcome } from "@/lib/stats/match";

export const dynamic = "force-dynamic";
export const metadata = { title: "予想詳細" };

export default async function PredictionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prediction = await getPrediction(id);
  if (!prediction) notFound();
  const male = prediction.maleId ? await getAnimal(prediction.maleId) : undefined;
  const female = prediction.femaleId ? await getAnimal(prediction.femaleId) : undefined;
  const hatched =
    male && female
      ? (await childrenOf(male.id)).filter((child) => child.damId === female.id)
      : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="PREDICTION"
        title={prediction.name}
        description={prediction.createdAt.slice(0, 16).replace("T", " ")}
        actions={
          male && female ? (
            <Link href={`/calculator?a=${male.id}&b=${female.id}`} className="nc-btn-ghost">
              もう一度計算
            </Link>
          ) : null
        }
      />

      <p className="text-sm text-muted">
        {male ? animalTitle(male) : "仮想の親A"} × {female ? animalTitle(female) : "仮想の親B"}
      </p>

      <section>
        <h2 className="mb-3 text-lg font-semibold">交配前の予想</h2>
        <PairingResults result={prediction.pairing} />
      </section>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">実際に生まれた子</h2>
        {hatched.length === 0 ? (
          <p className="text-sm text-muted">
            まだこの組み合わせの孵化個体はありません。繁殖から孵化登録するとここに並びます。
          </p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {hatched.map((child) => {
              const matched = matchOutcome(child, prediction.pairing.outcomes);
              return (
                <li key={child.id} className="rounded-2xl bg-sand p-4">
                  <Link href={`/animals/${child.id}`} className="font-medium hover:underline">
                    {animalTitle(child)}
                  </Link>
                  <p className="mt-1 text-muted">
                    実績：{formatGenotypeLabel(child.genotype)}
                  </p>
                  <p className="mt-1">
                    {matched
                      ? `予想では ${formatProbability(matched.probability)} で見込まれていた表現型です。`
                      : "保存した予想表に同じ表現型が見当たりません（手入力の遺伝子型の差など）。"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
