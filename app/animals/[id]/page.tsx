import Link from "next/link";
import { notFound } from "next/navigation";
import { addWeight, deleteWeight } from "@/app/animals/actions";
import { DeleteAnimalForm } from "@/app/animals/delete-animal-form";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { Card, PageHeader, Badge, SectionTitle, Stat } from "@/app/components/ui";
import { GrowthChart } from "@/app/components/growth-chart";
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
import {
  displayTraitIds,
  formatGenotypeLabel,
  listLoci,
  locusStateLabel,
  visualTraitName,
} from "@/lib/genetics";
import { growthPoints } from "@/lib/stats/compare";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体詳細" };

function PedigreeLink({
  animal,
}: {
  animal?: { id: string; name: string; code: string };
}) {
  if (!animal) return <span className="text-muted">未登録</span>;
  return (
    <Link href={`/animals/${animal.id}`} className="hover:underline">
      {animalTitle(animal)}
    </Link>
  );
}

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animal = await getAnimal(id);
  if (!animal) notFound();

  const tree = await pedigreeOf(animal.id);
  const weights = await listWeights(animal.id);
  const breedings = await breedingsForAnimal(animal.id);
  const traitLabels = displayTraitIds(animal.traits).map((tid) =>
    visualTraitName(tid, animal.traitLevels?.[tid]),
  );
  const genes = listLoci().filter(
    (locus) => (animal.genotype[locus.id] ?? "wild") !== "wild",
  );
  const addWeightAction = addWeight.bind(null, animal.id);
  const latest = weights.at(-1);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker={SEX_LABEL[animal.sex]}
        title={animal.name}
        description={`${animal.hatchDate ? `孵化 ${animal.hatchDate}` : "孵化日未登録"}`}
        actions={
          <>
            <Link href={`/calculator?a=${animal.id}`} className="nc-btn-ghost">
              この個体で計算
            </Link>
            <Link href={`/compare?animalId=${animal.id}`} className="nc-btn-ghost">
              全国個体比較
            </Link>
            <Link href={`/animals/${animal.id}/edit`} className="nc-btn">
              編集
            </Link>
          </>
        }
      />

      <AnimalCodeBlock code={animal.code} />

      <div className="flex flex-wrap gap-2">
        <Badge tone={animal.sex === "female" ? "blush" : animal.sex === "male" ? "mist" : "sand"}>
          {SEX_LABEL[animal.sex]}
        </Badge>
        <Badge tone={animal.status === "breeding" ? "sage" : "sand"}>
          {ANIMAL_STATUS_LABEL[animal.status]}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="最新体重"
          value={latest ? `${latest.weightG.toFixed(1)}g` : "—"}
        />
        <Stat
          label="全国個体比較"
          value="見る"
          hint="日本国内の近い条件の平均"
          href={`/compare?animalId=${animal.id}`}
        />
        <div className="rounded-[1.5rem] border border-line bg-accent p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)]">
          <p className="text-sm text-muted">公開</p>
          <p className="mt-3 text-2xl font-semibold">
            {animal.isPublic ? "公開中" : "非公開"}
          </p>
          {animal.isPublic && animal.shareSlug ? (
            <Link href={`/p/${animal.shareSlug}`} className="mt-3 inline-block text-sm underline">
              公開ページ
            </Link>
          ) : null}
        </div>
      </div>

      {animal.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={animal.photoUrl}
          alt={animal.name}
          className="max-h-80 w-full rounded-[1.5rem] object-cover"
        />
      ) : null}

      <Card>
        <SectionTitle>モルフ・遺伝情報</SectionTitle>
        <p>{animal.morphLabel || formatGenotypeLabel(animal.genotype)}</p>
        {traitLabels.length > 0 ? (
          <p className="mt-2 text-sm text-muted">
            {traitLabels.join(" / ")}
          </p>
        ) : null}
        {genes.length > 0 ? (
          <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
            {genes.map((locus) => (
              <li key={locus.id} className="flex justify-between gap-3">
                <span>{locus.nameJa}</span>
                <span className="text-muted">
                  {locusStateLabel(
                    locus.id,
                    animal.genotype[locus.id] ?? "wild",
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">遺伝子座の登録はありません。</p>
        )}
      </Card>

      <Card>
        <SectionTitle>血統</SectionTitle>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted">個体</p>
            <p className="mt-1 font-medium">{animalTitle(animal)}</p>
          </div>
          <div>
            <p className="text-muted">父 / 父方</p>
            <p className="mt-1">
              <PedigreeLink animal={tree?.sire} />
            </p>
            <p className="mt-1 text-muted">
              <PedigreeLink animal={tree?.sireSire} /> / <PedigreeLink animal={tree?.sireDam} />
            </p>
          </div>
          <div>
            <p className="text-muted">母 / 母方</p>
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
            className="mt-4 inline-flex nc-btn-ghost"
          >
            父母の組み合わせを計算
          </Link>
        ) : null}
        {tree?.children.length ? (
          <div className="mt-4">
            <p className="text-sm text-muted">子</p>
            <ul className="mt-1 text-sm">
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
      </Card>

      <Card>
        <SectionTitle>体重・成長</SectionTitle>
        <GrowthChart mine={growthPoints(animal, weights)} average={[]} />
        <MutationForm action={addWeightAction} className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
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
        {weights.length > 0 ? (
          <ul className="mt-4 divide-y divide-line text-sm">
            {[...weights].reverse().map((row) => {
              const remove = deleteWeight.bind(null, animal.id, row.id);
              return (
                <li key={row.id} className="flex items-center justify-between py-2">
                  <span>
                    {row.weighedOn} / {row.weightG.toFixed(1)}g
                  </span>
                  <MutationForm action={remove}>
                    <PendingSubmitButton
                      pendingLabel="削除中…"
                      className="nc-btn-danger"
                    >
                      削除
                    </PendingSubmitButton>
                  </MutationForm>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      {animal.notes ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">メモ</h2>
          <p className="whitespace-pre-wrap text-sm">{animal.notes}</p>
        </Card>
      ) : null}

      {breedings.length > 0 ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">繁殖履歴</h2>
          <ul className="text-sm">
            {breedings.map((breeding) => (
              <li key={breeding.id}>
                <Link href={`/breedings/${breeding.id}`} className="hover:underline">
                  {breeding.startedOn}（{BREEDING_STATUS_LABEL[breeding.status]}）
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <DeleteAnimalForm animalId={animal.id} />
    </div>
  );
}
