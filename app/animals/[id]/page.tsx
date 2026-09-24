import Link from "next/link";
import { notFound } from "next/navigation";
import { addWeight, deleteWeight, updateCheckCadence } from "@/app/animals/actions";
import { CheckCadenceFields } from "@/app/animals/check-cadence-fields";
import { DeleteAnimalForm } from "@/app/animals/delete-animal-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { Badge } from "@/app/components/ui";
import { GrowthChart } from "@/app/components/growth-chart";
import { cadenceLabel, checkReminder } from "@/lib/care/check-cadence";
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
import { displayAnimalId } from "@/lib/db/animal-code";
import {
  ANIMAL_STATUS_LABEL,
  BREEDING_STATUS_LABEL,
  SEX_LABEL,
  animalTitle,
} from "@/lib/db/labels";
import { formatGenotypeLabel, geneStatusLabelJa, listLoci, visualTraitName } from "@/lib/genetics";
import { growthPoints } from "@/lib/stats/compare";
import { todayIso } from "@/lib/stats/math";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体詳細" };

const card =
  "rounded-[1.75rem] border border-line bg-white p-5 text-ink shadow-[0_16px_40px_rgba(12,10,16,0.28)] sm:p-6";

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

  return (
    <div className="flex flex-col gap-8">
      <section className={`${card} overflow-hidden p-0 sm:p-0`}>
        {animal.photoUrl ? (
          <div className="aspect-[4/3] bg-[#f6f3f8] sm:aspect-[16/9]">
            <AnimalPhoto
              src={animal.photoUrl}
              alt={animal.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="p-5 sm:p-6">
          <p className="text-[11px] tracking-[0.22em] text-ink/40 uppercase">Profile</p>
          <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {animal.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              tone={
                animal.sex === "female" ? "blush" : animal.sex === "male" ? "mist" : "sand"
              }
            >
              {SEX_LABEL[animal.sex]}
            </Badge>
            <Badge tone={animal.status === "breeding" ? "sage" : "sand"}>
              {ANIMAL_STATUS_LABEL[animal.status]}
            </Badge>
            <Badge tone={animal.isPublic ? "sage" : "sand"}>
              {animal.isPublic ? "公開中" : "非公開"}
            </Badge>
          </div>
          <p className="mt-4 font-mono text-sm font-semibold tracking-wide text-ink/70">
            {displayAnimalId(animal)}
          </p>
          <p className="mt-2 text-sm leading-7 text-ink/70">
            {animal.morphLabel || formatGenotypeLabel(animal.genotype)}
          </p>
          {traitLabels.length > 0 ? (
            <p className="mt-1 text-xs leading-5 text-muted">{traitLabels.join(" / ")}</p>
          ) : null}
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">孵化日</dt>
              <dd className="mt-1 font-medium">
                {animal.hatchDate ? animal.hatchDate : "孵化日未登録"}
              </dd>
            </div>
            {animal.prefecture ? (
              <div>
                <dt className="text-xs text-muted">都道府県</dt>
                <dd className="mt-1 font-medium">{animal.prefecture}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-muted">記録の間隔</dt>
              <dd className="mt-1 font-medium">
                {cadenceLabel(animal.checkEveryDays) ?? "まだ決めていない"}
              </dd>
            </div>
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
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={`/calculator?a=${animal.id}`} className="nc-btn-ghost w-full sm:w-auto">
          この個体で計算
        </Link>
        <Link href={`/compare?animalId=${animal.id}`} className="nc-btn-ghost w-full sm:w-auto">
          全国個体比較
        </Link>
        <Link href={`/animals/${animal.id}/edit`} className="nc-btn w-full sm:w-auto">
          編集
        </Link>
        <a href="#check-cadence" className="nc-btn-ghost w-full sm:w-auto">
          記録の間隔
        </a>
      </div>

      <AnimalCodeBlock
        code={animal.code}
        className={`${card} bg-gradient-to-br from-[#fde8ef] via-white to-[#e7f3fb]`}
        codeClassName="mt-2 font-mono text-3xl font-semibold tracking-wide text-ink sm:text-5xl"
      />

      <section id="check-cadence" className={card}>
        <h2 className="text-lg font-semibold tracking-tight">クレスチェックの間隔</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          この個体だけの記録ペースです。毎週・2週間ごと・1ヶ月ごと・カスタムから選べます。
        </p>
        <MutationForm action={updateCadence} className="mt-4 grid gap-3">
          <CheckCadenceFields defaultDays={animal.checkEveryDays} />
          <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-auto">
            間隔を保存
          </PendingSubmitButton>
        </MutationForm>
      </section>

      {reminder ? (
        <section
          className={`${card} ${reminder.due ? "bg-[#fff6e8]" : "bg-[#eef6f1]"}`}
        >
          <p className="text-sm text-ink/50">クレスチェック</p>
          <p className="mt-2 text-lg font-semibold tracking-tight">{reminder.headline}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{reminder.body}</p>
          <p className="mt-2 text-xs text-muted">目安：{reminder.cadenceLabel}</p>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.75rem] bg-[#eef6f1] p-5 text-ink sm:p-6">
          <p className="text-sm text-ink/60">最新体重</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {latest ? `${latest.weightG.toFixed(1)}g` : "—"}
          </p>
          {latest ? (
            <p className="mt-2 text-sm text-muted">{latest.weighedOn}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">記録がありません</p>
          )}
        </div>
        <Link
          href={`/compare?animalId=${animal.id}`}
          className="rounded-[1.75rem] bg-[#e7f3fb] p-5 text-ink sm:p-6"
        >
          <p className="text-sm text-ink/60">全国個体比較</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">見る</p>
          <p className="mt-2 text-sm text-muted">日本国内の近い条件の平均</p>
        </Link>
      </div>

      {justRecorded || change ? (
        <section className={`${card} bg-[#fff6e8]`}>
          <p className="text-sm text-ink/50">
            {justRecorded ? "記録しました" : "前回との変化"}
          </p>
          {change ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-ink/50">前回</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatGrams(change.previous.weightG)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{change.previous.weighedOn}</p>
                </div>
                <div>
                  <p className="text-sm text-ink/50">今回</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatGrams(change.current.weightG)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{change.current.weighedOn}</p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tabular-nums">
                {formatDeltaGrams(change.deltaG)}
              </p>
              <p className="mt-2 text-sm text-muted">
                {change.daysBetween == null
                  ? "前回からの日数はまだ計算できません"
                  : `前回から${change.daysBetween}日`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              最初の記録です。次に測ると、増えたか減ったかが分かります。
            </p>
          )}
        </section>
      ) : null}

      {monthReport ? (
        <section className={`${card} bg-[#e7f3fb]`}>
          <p className="text-sm text-ink/50">月ごとの成長</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{monthReport.label}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-ink/50">月初</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatGrams(monthReport.startG)}
              </p>
            </div>
            <div>
              <p className="text-ink/50">月末</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatGrams(monthReport.endG)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            {formatDeltaGrams(monthReport.deltaG)}
          </p>
          <p className="mt-2 text-sm text-muted">記録回数 {monthReport.count}回</p>
        </section>
      ) : null}

      <section className={card}>
        <h2 className="text-lg font-semibold tracking-tight">体重・成長</h2>
        <div className="mt-4">
          <GrowthChart mine={growthPoints(animal, weights)} average={[]} />
        </div>
        <MutationForm action={addWeightAction} className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
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
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold tracking-tight">成長アルバム</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          日付と体重を、古い順に並べています。
        </p>
        {animal.photoUrl ? (
          <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-[#f6f3f8]">
            <AnimalPhoto
              src={animal.photoUrl}
              alt={animal.name}
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
            />
            {latest ? (
              <p className="px-4 py-3 text-sm text-ink/70">
                {latest.weighedOn} / {formatGrams(latest.weightG)}
              </p>
            ) : null}
          </div>
        ) : null}
        {album.length > 0 ? (
          <ol className="mt-4">
            {album.map((step, index) => {
              const remove = deleteWeight.bind(null, animal.id, step.log.id);
              return (
                <li key={step.log.id} className="flex flex-col">
                  {index > 0 ? (
                    <p className="py-1 text-center text-ink/30" aria-hidden>
                      ↓
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6f3f8] px-4 py-3">
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatGrams(step.log.weightG)}
                      </p>
                      <p className="mt-1 text-sm text-muted">{step.log.weighedOn}</p>
                      {step.deltaG != null ? (
                        <p className="mt-1 text-sm text-ink/70">
                          {formatDeltaGrams(step.deltaG)}
                          {step.daysSincePrev != null
                            ? ` / ${step.daysSincePrev}日`
                            : ""}
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
          <p className="mt-4 text-sm text-muted">まだ体重記録がありません。</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">血統</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${card} bg-[#e7f3fb]/60`}>
            <p className="text-xs tracking-[0.16em] text-ink/40 uppercase">Sire</p>
            <p className="mt-2 text-sm text-muted">父 / 父方</p>
            <p className="mt-2">
              <PedigreeLink animal={tree?.sire} />
            </p>
            <p className="mt-2 text-sm text-muted">
              <PedigreeLink animal={tree?.sireSire} /> / <PedigreeLink animal={tree?.sireDam} />
            </p>
          </div>
          <div className={`${card} bg-[#fde8ef]/70`}>
            <p className="text-xs tracking-[0.16em] text-ink/40 uppercase">Dam</p>
            <p className="mt-2 text-sm text-muted">母 / 母方</p>
            <p className="mt-2">
              <PedigreeLink animal={tree?.dam} />
            </p>
            <p className="mt-2 text-sm text-muted">
              <PedigreeLink animal={tree?.damSire} /> / <PedigreeLink animal={tree?.damDam} />
            </p>
          </div>
        </div>
        {tree?.sire && tree.dam ? (
          <Link
            href={`/calculator?a=${tree.sire.id}&b=${tree.dam.id}`}
            className="nc-btn-ghost mt-4 inline-flex"
          >
            父母の組み合わせを計算
          </Link>
        ) : null}
        {tree?.children.length ? (
          <div className={`${card} mt-4`}>
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

      <section className={card}>
        <h2 className="text-lg font-semibold tracking-tight">モルフ・遺伝情報</h2>
        <p className="mt-3">{animal.morphLabel || formatGenotypeLabel(animal.genotype)}</p>
        {traitLabels.length > 0 ? (
          <p className="mt-2 text-sm text-muted">{traitLabels.join(" / ")}</p>
        ) : null}
        {genes.length > 0 ? (
          <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
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
        <section className={card}>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">メモ</h2>
          <p className="whitespace-pre-wrap text-sm leading-7">{animal.notes}</p>
        </section>
      ) : null}

      {breedings.length > 0 ? (
        <section className={card}>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">繁殖履歴</h2>
          <ul className="text-sm">
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

      <Link
        href={`/compare?animalId=${animal.id}`}
        className={`${card} block bg-gradient-to-br from-[#eef6f1] to-[#e7f3fb]`}
      >
        <p className="text-[11px] tracking-[0.22em] text-ink/40 uppercase">Compare</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">全国個体比較</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          この個体の体重を、日本国内の近い条件の平均と比べます。
        </p>
        <span className="nc-btn mt-4 inline-flex">比較を見る</span>
      </Link>

      <section className="rounded-[1.75rem] border border-red-100 bg-[#fdf6f6] px-5 py-5 text-ink sm:px-6">
        <p className="text-sm text-ink/70">この個体を削除</p>
        <p className="mt-1 text-xs leading-5 text-muted">削除すると元に戻せません。</p>
        <div className="mt-3">
          <DeleteAnimalForm
            animalId={animal.id}
            className="nc-btn-danger px-0 text-sm text-red-700/80"
          />
        </div>
      </section>
    </div>
  );
}
