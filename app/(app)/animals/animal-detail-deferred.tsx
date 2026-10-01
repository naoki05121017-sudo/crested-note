import Link from "next/link";
import { deleteWeight } from "@/app/(app)/animals/actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { GrowthChart } from "@/app/components/growth-chart";
import { HomeSectionTitle } from "@/app/components/home-section-title";
import { growthGuideSeries } from "@/lib/care/growth-guide";
import {
  formatDeltaGrams,
  formatGrams,
  growthAlbumSteps,
  latestMonthlyReport,
  latestWeightChange,
} from "@/lib/care/weight-growth";
import { fetchGrowthGuideMonths } from "@/lib/db/stats-rpc";
import { breedingsForAnimal, pedigreeOf } from "@/lib/db/queries";
import { animalTitle, BREEDING_STATUS_LABEL } from "@/lib/db/labels";
import { growthPoints } from "@/lib/stats/compare";
import { todayIso } from "@/lib/stats/math";
import type { Animal, WeightLogRecord } from "@/lib/db/types";

function PedigreeLink({
  animal,
}: {
  animal?: { id: string; name: string; code: string };
}) {
  if (!animal) return <span className="text-muted">未登録</span>;
  return (
    <Link href={`/animals/${animal.id}`} className="font-medium hover:underline">
      {animalTitle(animal)}
    </Link>
  );
}

export function AnimalDetailDeferredFallback() {
  return <div className="nc-skel h-40 w-full rounded-[1.25rem]" aria-hidden />;
}

export async function AnimalHeroDeltas({
  weightsPromise,
}: {
  weightsPromise: Promise<WeightLogRecord[]>;
}) {
  const weights = await weightsPromise;
  const change = latestWeightChange(weights);
  const monthReport = latestMonthlyReport(weights, todayIso());
  return (
    <>
      {change ? (
        <p className="mt-2 text-sm text-white/40">前回比 {formatDeltaGrams(change.deltaG)}</p>
      ) : null}
      {monthReport ? (
        <p className="mt-1 text-xs text-white/28">
          {monthReport.label} {formatDeltaGrams(monthReport.deltaG)}
        </p>
      ) : null}
    </>
  );
}

export async function AnimalGrowthChart({
  animal,
  weightsPromise,
}: {
  animal: Animal;
  weightsPromise: Promise<WeightLogRecord[]>;
}) {
  const [weights, guideMonths] = await Promise.all([
    weightsPromise,
    fetchGrowthGuideMonths(),
  ]);
  return (
    <section className="min-w-0">
      <HomeSectionTitle kicker="GROWTH" title="成長" tone="lilac" />
      <p className="mb-3 text-sm leading-6 text-white/40">参考目安には個体差があります</p>
      <div className="nc-panel p-4 text-ink">
        <GrowthChart
          mine={growthPoints(animal, weights)}
          average={[]}
          guide={growthGuideSeries(guideMonths)}
        />
      </div>
    </section>
  );
}

export async function AnimalWeightHistory({
  animal,
  weightsPromise,
}: {
  animal: Animal;
  weightsPromise: Promise<WeightLogRecord[]>;
}) {
  const weights = await weightsPromise;
  const album = growthAlbumSteps(weights);
  if (album.length === 0) {
    return <p className="mt-4 text-sm text-white/40">まだ体重記録がありません。</p>;
  }
  return (
    <ol className="mt-5">
      {album.map((step, index) => {
        const remove = deleteWeight.bind(null, animal.id, step.log.id);
        return (
          <li key={step.log.id} className="flex flex-col">
            {index > 0 ? (
              <p className="py-1 text-center text-white/20" aria-hidden>
                ↓
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-b border-white/8 py-3">
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums nc-tone-mint">
                  {formatGrams(step.log.weightG)}
                </p>
                <p className="mt-1 text-sm text-white/38">{step.log.weighedOn}</p>
                {step.deltaG != null ? (
                  <p className="mt-1 text-sm text-white/50">
                    {formatDeltaGrams(step.deltaG)}
                    {step.daysSincePrev != null ? ` / ${step.daysSincePrev}日` : ""}
                  </p>
                ) : null}
              </div>
              <MutationForm action={remove}>
                <PendingSubmitButton pendingLabel="削除中…" className="nc-btn-danger">
                  削除
                </PendingSubmitButton>
              </MutationForm>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export async function AnimalPedigreeAndBreedings({ animalId }: { animalId: string }) {
  const [tree, breedings] = await Promise.all([
    pedigreeOf(animalId),
    breedingsForAnimal(animalId),
  ]);
  return (
    <>
      <section>
        <h2 className="text-base font-semibold tracking-tight">血統</h2>
        <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted">父 / 父方</p>
            <p className="mt-1">
              <PedigreeLink animal={tree?.sire} />
            </p>
            <p className="mt-1 text-muted">
              <PedigreeLink animal={tree?.sireSire} /> / <PedigreeLink animal={tree?.sireDam} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">母 / 母方</p>
            <p className="mt-1">
              <PedigreeLink animal={tree?.dam} />
            </p>
            <p className="mt-1 text-muted">
              <PedigreeLink animal={tree?.damSire} /> / <PedigreeLink animal={tree?.damDam} />
            </p>
          </div>
        </div>
        {tree?.sire && tree.dam ? (
          <Link
            href={`/calculator?a=${tree.sire.id}&b=${tree.dam.id}`}
            className="nc-btn-ghost mt-4 inline-flex w-full sm:w-auto"
          >
            父母の組み合わせを計算
          </Link>
        ) : null}
        {tree?.children.length ? (
          <div className="mt-4">
            <p className="text-sm text-muted">子</p>
            <ul className="mt-2 text-sm">
              {tree.children.map((child) => (
                <li key={child.id}>
                  <Link href={`/animals/${child.id}`} className="hover:underline">
                    {animalTitle(child)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {breedings.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold tracking-tight">繁殖履歴</h2>
          <ul className="mt-2 text-sm">
            {breedings.map((breeding) => (
              <li key={breeding.id}>
                <Link href={`/breedings/${breeding.id}`} className="hover:underline">
                  {breeding.startedOn}（{BREEDING_STATUS_LABEL[breeding.status]}）
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
