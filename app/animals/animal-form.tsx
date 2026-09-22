import {
  TRAIT_CATEGORY_LABEL,
  listVisualTraitsByCategory,
} from "@/lib/genetics/catalog";
import { ANIMAL_STATUSES, SEXES, type Animal } from "@/lib/db/types";
import { ANIMAL_STATUS_LABEL, PREFECTURES, SEX_LABEL, animalTitle } from "@/lib/db/labels";
import { createAnimal, updateAnimal } from "@/app/animals/actions";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { GenotypeFields } from "@/app/components/genotype-fields";
import { AnimalPhotoField } from "@/app/animals/animal-photo-field";
import { Card, Hint, SectionTitle } from "@/app/components/ui";
import { parentOptionsForRole } from "@/lib/db/parent-sex";
import type { VisualTraitCategory } from "@/lib/genetics/visual-traits";

export function AnimalForm({
  animal,
  parents,
  publicByDefault = false,
}: {
  animal?: Animal;
  parents: Animal[];
  publicByDefault?: boolean;
}) {
  const action = animal ? updateAnimal.bind(null, animal.id) : createAnimal;
  const parentOptions = parents.filter((row) => row.id !== animal?.id);
  const sires = parentOptionsForRole(parentOptions, "sire", animal?.sireId ?? "");
  const dams = parentOptionsForRole(parentOptions, "dam", animal?.damId ?? "");

  return (
    <MutationForm action={action} className="flex max-w-3xl flex-col gap-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">名前</span>
          <input required name="name" defaultValue={animal?.name} className="nc-input" />
        </label>
        <div className="sm:col-span-2">
          <AnimalCodeBlock code={animal?.code} pending={!animal} />
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">性別</span>
          <select name="sex" defaultValue={animal?.sex ?? "unknown"} className="nc-input">
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {SEX_LABEL[sex]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">孵化日</span>
          <input type="date" name="hatchDate" defaultValue={animal?.hatchDate} className="nc-input" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">ステータス</span>
          <select name="status" defaultValue={animal?.status ?? "active"} className="nc-input">
            {ANIMAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ANIMAL_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">父</span>
          <select name="sireId" defaultValue={animal?.sireId ?? ""} className="nc-input">
            <option value="">未登録</option>
            {sires.map((row) => (
              <option key={row.id} value={row.id}>
                {animalTitle(row)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">母</span>
          <select name="damId" defaultValue={animal?.damId ?? ""} className="nc-input">
            <option value="">未登録</option>
            {dams.map((row) => (
              <option key={row.id} value={row.id}>
                {animalTitle(row)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">見た目の通称</span>
          <input
            name="morphLabel"
            defaultValue={animal?.morphLabel}
            placeholder="例: ピンダル リリーホワイト"
            className="nc-input"
          />
        </label>
        <AnimalPhotoField currentUrl={animal?.photoUrl} alt={animal?.name ?? ""} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">都道府県</span>
          <select name="prefecture" defaultValue={animal?.prefecture ?? ""} className="nc-input">
            <option value="">未設定</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm sm:mt-6">
          <input type="checkbox" name="isPublic" defaultChecked={animal?.isPublic ?? publicByDefault} className="nc-check" />
          個体ページを公開する
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">メモ</span>
          <textarea name="notes" rows={3} defaultValue={animal?.notes} className="nc-input" />
        </label>
      </Card>

      <Card>
        <SectionTitle hint="確率計算には使いません">見た目・ライン / 特徴</SectionTitle>
        <div className="flex flex-col gap-6">
          {(["reference", "pattern", "feature"] as VisualTraitCategory[]).map(
            (category) => (
              <div key={category}>
                <p className="mb-3 text-[11px] tracking-[0.18em] text-muted uppercase">
                  {TRAIT_CATEGORY_LABEL[category]}
                </p>
                <div className="flex flex-col gap-3">
                  {listVisualTraitsByCategory(category).map((trait) => (
                    <div key={trait.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="flex min-h-11 flex-1 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="trait"
                          value={trait.id}
                          defaultChecked={animal?.traits.includes(trait.id)}
                          className="nc-check"
                        />
                        <span>
                          {trait.nameJa}
                          {trait.badge ? (
                            <span className="ml-2 text-xs text-muted">{trait.badge}</span>
                          ) : null}
                          <Hint text={trait.beginnerDescription} />
                        </span>
                      </label>
                      {trait.graded && trait.gradeLabels ? (
                        <select
                          name={`traitLevel:${trait.id}`}
                          defaultValue={String(
                            animal?.traitLevels?.[trait.id] ?? 2,
                          )}
                          className="nc-input sm:max-w-48"
                        >
                          {trait.gradeLabels.map((label, index) => (
                            <option key={label} value={index + 1}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">
          遺伝情報（遺伝子型）
        </h2>
        <p className="mb-4 text-sm text-muted">
          確立した遺伝子だけを確率計算に使います。
        </p>
        <GenotypeFields genotype={animal?.genotype} />
      </Card>

      <PendingSubmitButton
        pendingLabel={animal ? "保存しています…" : "登録中…"}
        className="nc-btn w-full sm:w-fit"
      >
        {animal ? "保存する" : "登録する"}
      </PendingSubmitButton>
    </MutationForm>
  );
}
