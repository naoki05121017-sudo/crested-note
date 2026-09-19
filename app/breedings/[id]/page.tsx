import Link from "next/link";
import { notFound } from "next/navigation";
import { addClutch, closeBreeding, updateEgg } from "@/app/breedings/actions";
import { HatchForm } from "@/app/breedings/hatch-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { PairingResults } from "@/app/components/pairing-results";
import { Card, PageHeader, Badge, SectionTitle } from "@/app/components/ui";
import { getAnimal, getBreeding, predictionForBreeding } from "@/lib/db/queries";
import {
  BREEDING_STATUS_LABEL,
  EGG_RESULT_LABEL,
  animalTitle,
} from "@/lib/db/labels";
import { EGG_RESULTS } from "@/lib/db/types";
import { calculatePairing } from "@/lib/genetics";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ペア詳細",
};

export default async function BreedingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const breeding = await getBreeding(id);
  if (!breeding) notFound();

  const male = await getAnimal(breeding.maleId);
  const female = await getAnimal(breeding.femaleId);
  if (!male || !female) notFound();

  const pairing = calculatePairing(male.genotype, female.genotype);
  const prediction = await predictionForBreeding(breeding.id);
  const addClutchAction = addClutch.bind(null, breeding.id);
  const closeAction = closeBreeding.bind(null, breeding.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="BREEDING"
        title={`${animalTitle(male)} × ${animalTitle(female)}`}
        description={breeding.startedOn}
        actions={
          <>
            <Link href={`/calculator?a=${male.id}&b=${female.id}`} className="nc-btn-ghost">
              遺伝計算
            </Link>
            {prediction ? (
              <Link href={`/predictions/${prediction.id}`} className="nc-btn-ghost">
                予想と実績
              </Link>
            ) : null}
            {breeding.status === "active" ? (
              <MutationForm action={closeAction}>
                <PendingSubmitButton pendingLabel="終了しています…" className="nc-btn-ghost">
                  ペアを終了
                </PendingSubmitButton>
              </MutationForm>
            ) : null}
          </>
        }
      />

      <Badge tone={breeding.status === "active" ? "sage" : "sand"}>
        {BREEDING_STATUS_LABEL[breeding.status]}
      </Badge>

      <section className="flex flex-col gap-3">
        <SectionTitle>交配予想</SectionTitle>
        <PairingResults result={pairing} />
      </section>

      <Card>
        <SectionTitle>クラッチを追加</SectionTitle>
        <MutationForm action={addClutchAction} className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="grid gap-1 text-sm">
            <span>産卵日</span>
            <input
              type="date"
              name="laidOn"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="nc-input"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>卵の数</span>
            <input
              type="number"
              name="eggCount"
              min={1}
              max={12}
              defaultValue={2}
              className="nc-input w-24"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>孵化予定</span>
            <input type="date" name="expectedHatchOn" className="nc-input" />
          </label>
          <PendingSubmitButton pendingLabel="追加しています…" className="nc-btn w-full sm:w-auto">
            追加
          </PendingSubmitButton>
        </MutationForm>
      </Card>

      {breeding.clutches.map((clutch) => (
        <section
          key={clutch.id}
          className="rounded-[1.5rem] border border-line bg-surface p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold">クラッチ {clutch.laidOn}</h2>
          <div className="mt-3 flex flex-col gap-4">
            {clutch.eggs.map((egg, index) => {
              const updateAction = updateEgg.bind(null, egg.id);
              return (
                <div key={egg.id} className="border-t border-line pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">卵 {index + 1}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                    {egg.expectedHatchOn ? (
                      <span className="text-sm text-muted">予定 {egg.expectedHatchOn}</span>
                    ) : null}
                    <Badge
                      tone={
                        egg.result === "failed" || egg.result === "infertile"
                          ? "blush"
                          : "sage"
                      }
                    >
                      {EGG_RESULT_LABEL[egg.result]}
                    </Badge>
                    </div>
                  </div>
                  {egg.hatchAnimalId ? (
                    <Link
                      href={`/animals/${egg.hatchAnimalId}`}
                      className="mt-2 inline-flex nc-btn-ghost"
                    >
                      孵化個体を見る
                    </Link>
                  ) : (
                    <>
                      <MutationForm action={updateAction} className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <select
                          name="result"
                          defaultValue={egg.result}
                          className="nc-input"
                        >
                          {EGG_RESULTS.filter((result) => result !== "hatched").map(
                            (result) => (
                              <option key={result} value={result}>
                                {EGG_RESULT_LABEL[result]}
                              </option>
                            ),
                          )}
                        </select>
                        <input
                          type="date"
                          name="expectedHatchOn"
                          defaultValue={egg.expectedHatchOn}
                          className="nc-input"
                        />
                        <input
                          name="notes"
                          defaultValue={egg.notes}
                          placeholder="メモ"
                          className="nc-input min-w-40 flex-1"
                        />
                        <PendingSubmitButton
                          type="submit"
                          pendingLabel="更新しています…"
                          className="nc-btn-ghost w-full sm:w-auto"
                        >
                          更新
                        </PendingSubmitButton>
                      </MutationForm>
                      {egg.result !== "infertile" && egg.result !== "failed" ? (
                        <HatchForm
                          eggId={egg.id}
                          sireGenotype={male.genotype}
                          damGenotype={female.genotype}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
