import Link from "next/link";
import { notFound } from "next/navigation";
import { addWeight, deleteWeight, updateCheckCadence } from "@/app/(app)/animals/actions";
import { CheckCadenceFields } from "@/app/(app)/animals/check-cadence-fields";
import { AnimalMore } from "@/app/(app)/animals/animal-more";
import { DeleteAnimalForm } from "@/app/(app)/animals/delete-animal-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { HomeSectionTitle } from "@/app/components/home-section-title";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { GrowthChart } from "@/app/components/growth-chart";
import { calendarDaysBetween, cadenceLabel, checkReminder } from "@/lib/care/check-cadence";
import {
  crestCheckItemFromReminder,
  crestCheckStatusLabel,
} from "@/lib/care/crest-check-list";
import { growthGuideSeries } from "@/lib/care/growth-guide";
import { fetchGrowthGuideMonths } from "@/lib/db/stats-rpc";
import {
  formatDeltaGrams,
  formatGrams,
  growthAlbumSteps,
  latestMonthlyReport,
  latestWeightChange,
} from "@/lib/care/weight-growth";
import {
  breedingsForAnimal,
  getAnimal,
  listWeights,
  pedigreeOf,
} from "@/lib/db/queries";
import {
  ANIMAL_STATUS_LABEL,
  BREEDING_STATUS_LABEL,
  SEX_LABEL,
  animalTitle,
} from "@/lib/db/labels";
import { formatGenotypeLabel, geneStatusLabelJa, listLoci, visualTraitName } from "@/lib/genetics";
import { growthPoints } from "@/lib/stats/compare";
import { ageInMonths, todayIso } from "@/lib/stats/math";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体詳細" };

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

export default async function AnimalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const animal = await getAnimal(id);
  if (!animal) notFound();

  const tree = await pedigreeOf(animal.id);
  const weights = await listWeights(animal.id);
  const breedings = await breedingsForAnimal(animal.id);
  const traitLabels = animal.traits.map((tid) =>
    visualTraitName(tid, animal.traitLevels?.[tid]),
  );
  const genes = listLoci().filter(
    (locus) => (animal.genotype[locus.id] ?? "wild") !== "wild",
  );
  const addWeightAction = addWeight.bind(null, animal.id);
  const updateCadence = updateCheckCadence.bind(null, animal.id);
  const latest = weights.at(-1);
  const asOf = todayIso();
  const reminder = checkReminder({
    checkEveryDays: animal.checkEveryDays,
    lastWeighedOn: latest?.weighedOn,
    asOf,
  });
  const change = latestWeightChange(weights);
  const album = growthAlbumSteps(weights);
  const monthReport = latestMonthlyReport(weights, asOf);
  const justRecorded = query.recorded === "1";
  const growthGuide = growthGuideSeries(await fetchGrowthGuideMonths());
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
          ) : change ? (
            <p className="mt-2 text-sm text-white/40">前回比 {formatDeltaGrams(change.deltaG)}</p>
          ) : null}
          <p className="mt-3 text-xs text-white/32">
            {ANIMAL_STATUS_LABEL[animal.status]}
            {" · "}
            {animal.isPublic ? "公開中" : "非公開"}
            {ageMonths == null ? "" : ` · ${ageMonths}ヶ月`}
            {" · "}
            {checkStatus}
            {daysSinceLatest != null ? ` · 前回から${daysSinceLatest}日` : ""}
          </p>
          {monthReport ? (
            <p className="mt-1 text-xs text-white/28">
              {monthReport.label} {formatDeltaGrams(monthReport.deltaG)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="min-w-0">
        <HomeSectionTitle kicker="GROWTH" title="成長" tone="lilac" />
        <p className="mb-3 text-sm leading-6 text-white/40">参考目安には個体差があります</p>
        <div className="nc-panel p-4 text-ink">
          <GrowthChart
            mine={growthPoints(animal, weights)}
            average={[]}
            guide={growthGuide}
          />
        </div>
      </section>

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
        {album.length > 0 ? (
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
        ) : (
          <p className="mt-4 text-sm text-white/40">まだ体重記録がありません。</p>
        )}
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

      <AnimalMore>
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
