import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addWeight, updateCheckCadence } from "@/app/(app)/animals/actions";
import {
  AnimalDetailDeferredFallback,
  AnimalGrowthChart,
  AnimalHeroDeltas,
  AnimalPedigreeAndBreedings,
  AnimalWeightHistory,
} from "@/app/(app)/animals/animal-detail-deferred";
import { CheckCadenceFields } from "@/app/(app)/animals/check-cadence-fields";
import { AnimalMore } from "@/app/(app)/animals/animal-more";
import { DeleteAnimalForm } from "@/app/(app)/animals/delete-animal-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { HomeSectionTitle } from "@/app/components/home-section-title";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { calendarDaysBetween, cadenceLabel, checkReminder } from "@/lib/care/check-cadence";
import {
  crestCheckItemFromReminder,
  crestCheckStatusLabel,
} from "@/lib/care/crest-check-list";
import { formatGrams } from "@/lib/care/weight-growth";
import { listLatestWeightsForAnimals } from "@/lib/db/animal-io";
import {
  getAnimal,
  listWeights,
} from "@/lib/db/queries";
import {
  ANIMAL_STATUS_LABEL,
  SEX_LABEL,
} from "@/lib/db/labels";
import { formatGenotypeLabel, geneStatusLabelJa, listLoci, visualTraitName } from "@/lib/genetics";
import { ageInMonths, todayIso } from "@/lib/stats/math";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体詳細" };

export default async function AnimalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [animal, latestRows] = await Promise.all([
    getAnimal(id),
    listLatestWeightsForAnimals([id]),
  ]);
  if (!animal) notFound();

  const latest = latestRows[0];
  const weightsPromise = listWeights(animal.id);
  const traitLabels = animal.traits.map((tid) =>
    visualTraitName(tid, animal.traitLevels?.[tid]),
  );
  const genes = listLoci().filter(
    (locus) => (animal.genotype[locus.id] ?? "wild") !== "wild",
  );
  const addWeightAction = addWeight.bind(null, animal.id);
  const updateCadence = updateCheckCadence.bind(null, animal.id);
  const asOf = todayIso();
  const reminder = checkReminder({
    checkEveryDays: animal.checkEveryDays,
    lastWeighedOn: latest?.weighedOn,
    asOf,
  });
  const justRecorded = query.recorded === "1";
  const ageMonths = ageInMonths(animal.hatchDate, asOf);
  const daysSinceLatest = latest
    ? calendarDaysBetween(latest.weighedOn, asOf)
    : null;
  const checkStatus = reminder
    ? crestCheckStatusLabel(crestCheckItemFromReminder(animal, reminder))
    : "間隔未設定";
  const morph = animal.morphLabel || formatGenotypeLabel(animal.genotype);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-10">
      <section className="min-w-0">
        <div className="nc-hero-photo overflow-hidden rounded-[1.25rem] bg-[#efeaf0]">
          <div className="h-[min(48dvh,26rem)] min-h-[15rem] bg-[#efeaf0]">
            {animal.photoUrl ? (
              <AnimalPhoto
                src={animal.photoUrl}
                alt={animal.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="p-5 text-sm text-ink/40">写真はまだありません</p>
            )}
          </div>
        </div>
        <div className="pt-5">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            {animal.name}
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            {SEX_LABEL[animal.sex]}
            {" / "}
            {morph || "モルフ未設定"}
          </p>
          {latest ? (
            <p className="mt-3 text-[2.1rem] font-semibold leading-none tracking-tight tabular-nums nc-tone-mint">
              {formatGrams(latest.weightG)}
            </p>
          ) : (
            <p className="mt-4 text-sm text-white/38">体重未記録</p>
          )}
          {justRecorded ? (
            <p className="nc-saved mt-2 text-sm text-white/50">✓ 記録しました</p>
          ) : (
            <Suspense fallback={null}>
              <AnimalHeroDeltas weightsPromise={weightsPromise} />
            </Suspense>
          )}
          <p className="mt-3 text-xs text-white/32">
            {ANIMAL_STATUS_LABEL[animal.status]}
            {" · "}
            {animal.isPublic ? "公開中" : "非公開"}
            {ageMonths == null ? "" : ` · ${ageMonths}ヶ月`}
            {" · "}
            {checkStatus}
            {daysSinceLatest != null ? ` · 前回から${daysSinceLatest}日` : ""}
          </p>
        </div>
      </section>

      <Suspense fallback={<AnimalDetailDeferredFallback />}>
        <AnimalGrowthChart animal={animal} weightsPromise={weightsPromise} />
      </Suspense>

      <section id="weight" className="min-w-0 scroll-mt-24">
        <HomeSectionTitle kicker="WEIGHT" title="体重記録" tone="mint" />
        <MutationForm action={addWeightAction} className="grid gap-2 sm:flex sm:flex-wrap">
          <input
            type="date"
            name="weighedOn"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="nc-input sm:max-w-40"
          />
          <input
            name="weightG"
            type="number"
            step="0.1"
            min="0.1"
            required
            placeholder="g"
            className="nc-input sm:max-w-28"
          />
          <PendingSubmitButton pendingLabel="記録しています…" className="nc-btn w-full sm:w-auto">
            記録する
          </PendingSubmitButton>
        </MutationForm>
        <Suspense fallback={<AnimalDetailDeferredFallback />}>
          <AnimalWeightHistory animal={animal} weightsPromise={weightsPromise} />
        </Suspense>
      </section>

      <section className="min-w-0">
        <HomeSectionTitle kicker="ALBUM" title="アルバム" tone="mist" />
        {animal.photoUrl ? (
          <div className="overflow-hidden rounded-[1.25rem] bg-[#efeaf0]">
            <AnimalPhoto
              src={animal.photoUrl}
              alt={animal.name}
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
            />
            {latest ? (
              <p className="bg-[#f7f3f6] px-4 py-3 text-sm text-ink/70">
                {latest.weighedOn} / {formatGrams(latest.weightG)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/40">写真はまだありません。</p>
        )}
      </section>

      <AnimalMore value={cadenceLabel(animal.checkEveryDays) ?? "間隔未設定"}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href={`/animals/${animal.id}/edit`} className="nc-btn w-full sm:w-auto">
              編集
            </Link>
            <Link href={`/calculator?a=${animal.id}`} className="nc-btn-ghost w-full sm:w-auto">
              この個体で計算
            </Link>
            <Link href={`/compare?animalId=${animal.id}`} className="nc-btn-ghost w-full sm:w-auto">
              全国個体比較
            </Link>
          </div>

          <AnimalCodeBlock
            code={animal.code}
            className="rounded-2xl bg-[#f6f3f8] px-4 py-4"
            codeClassName="mt-2 font-mono text-xl font-semibold tracking-wide text-ink"
          />

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">孵化日</dt>
              <dd className="mt-1 font-medium">{animal.hatchDate || "孵化日未登録"}</dd>
            </div>
            {animal.prefecture ? (
              <div>
                <dt className="text-xs text-muted">都道府県</dt>
                <dd className="mt-1 font-medium">{animal.prefecture}</dd>
              </div>
            ) : null}
            {animal.isPublic && animal.shareSlug ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">公開ページ</dt>
                <dd className="mt-1">
                  <Link href={`/p/${animal.shareSlug}`} className="underline underline-offset-2">
                    公開ページを開く
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          <section id="check-cadence" className="scroll-mt-24">
            <h2 className="text-base font-semibold tracking-tight">クレスチェックの間隔</h2>
            <p className="mt-1 text-sm text-muted">
              {cadenceLabel(animal.checkEveryDays) ?? "まだ決めていない"}
            </p>
            {reminder ? (
              <p className="mt-2 text-sm leading-6 text-ink/70">
                {reminder.headline}
                <span className="mt-1 block text-muted">{reminder.body}</span>
              </p>
            ) : null}
            <MutationForm action={updateCadence} className="mt-4 grid gap-3">
              <CheckCadenceFields defaultDays={animal.checkEveryDays} />
              <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-auto">
                間隔を保存
              </PendingSubmitButton>
            </MutationForm>
          </section>

          <section>
            <h2 className="text-base font-semibold tracking-tight">モルフ・遺伝情報</h2>
            <p className="mt-2 text-sm">{morph || formatGenotypeLabel(animal.genotype)}</p>
            {traitLabels.length > 0 ? (
              <p className="mt-1 text-sm text-muted">{traitLabels.join(" / ")}</p>
            ) : null}
            {genes.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {genes.map((locus) => (
                  <li key={locus.id} className="flex justify-between gap-3">
                    <span>{locus.nameJa}</span>
                    <span className="text-muted">
                      {geneStatusLabelJa(
                        animal.genotype[locus.id] ?? "wild",
                        locus.inheritance,
                        locus.nameJa,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">遺伝子座の登録はありません。</p>
            )}
          </section>

          {animal.notes ? (
            <section>
              <h2 className="text-base font-semibold tracking-tight">メモ</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{animal.notes}</p>
            </section>
          ) : null}

          <Suspense fallback={<AnimalDetailDeferredFallback />}>
            <AnimalPedigreeAndBreedings animalId={animal.id} />
          </Suspense>

          <section>
            <p className="text-sm text-ink/70">この個体を削除</p>
            <p className="mt-1 text-xs leading-5 text-muted">削除すると元に戻せません。</p>
            <div className="mt-3">
              <DeleteAnimalForm
                animalId={animal.id}
                className="nc-btn-danger px-0 text-sm text-red-700/80"
              />
            </div>
          </section>
      </AnimalMore>
    </div>
  );
}
