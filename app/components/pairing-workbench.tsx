"use client";

import { useMemo, useState } from "react";
import {
  calculatePairing,
  geneStatusLabelJa,
  listLoci,
  type GeneStatus,
  type Genotype,
  type PairingResult,
} from "@/lib/genetics";
import type { LocusDefinition } from "@/lib/genetics/types";
import { animalTitle } from "@/lib/db/labels";
import { PairingResults } from "@/app/components/pairing-results";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { savePrediction } from "@/app/predictions/actions";
import type { CalculatorAnimal } from "@/app/calculator/types";
import { Hint } from "@/app/components/ui";
import {
  AXANTHIC_LOCI,
  PICKER_CATEGORY_LABEL,
  PICKER_CATEGORY_ORDER,
  axanthicFromGenotype,
  calculatorTraitOptions,
  clearTraitFromGenotype,
  setAxanthicGenotype,
  visibleTraitsFromParent,
  type CalculatorTraitOption,
} from "@/app/components/calculator-traits";

const RECESSIVE_STATUSES: GeneStatus[] = [
  "wild",
  "het",
  "visual",
  "possible_50",
  "possible_66",
];
const INCOMPLETE_STATUSES: GeneStatus[] = ["wild", "het", "visual"];

function statusesFor(locus: LocusDefinition): GeneStatus[] {
  return locus.inheritance === "recessive"
    ? RECESSIVE_STATUSES
    : INCOMPLETE_STATUSES;
}

function defaultStatus(): GeneStatus {
  return "het";
}

function ParentHeading({ sex }: { sex: "male" | "female" }) {
  const symbol = sex === "male" ? "♂" : "♀";
  const color = sex === "male" ? "text-[#4d6fa8]" : "text-[#c45c78]";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-ink">親</span>
      <span
        className={`${color} text-[1.45rem] font-extrabold leading-none sm:text-[1.7rem]`}
        aria-label={sex === "male" ? "オス" : "メス"}
      >
        {symbol}
      </span>
    </span>
  );
}

function ParentEditor({
  title,
  stepLabel,
  genotype,
  onChange,
  visualTags,
  onChangeVisualTags,
  addedTraits,
  onAddedTraitsChange,
  animals,
  selectedId,
  onSelectAnimal,
}: {
  title: React.ReactNode;
  stepLabel: string;
  genotype: Genotype;
  onChange: (next: Genotype) => void;
  visualTags: string[];
  onChangeVisualTags: (next: string[]) => void;
  addedTraits: string[];
  onAddedTraitsChange: (next: string[]) => void;
  animals: CalculatorAnimal[];
  selectedId: string;
  onSelectAnimal: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const options = calculatorTraitOptions();
  const available = options.filter((option) => !addedTraits.includes(option.id));
  const axanthic = axanthicFromGenotype(genotype);
  const axanthicLocus = listLoci().find((locus) => locus.id === axanthic.locusId);

  function addTrait(option: CalculatorTraitOption) {
    onAddedTraitsChange([...addedTraits, option.id]);
    if (option.kind === "visual") {
      onChangeVisualTags([...visualTags, option.id]);
    } else if (option.kind === "axanthic") {
      onChange(
        setAxanthicGenotype(
          genotype,
          axanthic.locusId,
          axanthic.locusId,
          defaultStatus(),
        ),
      );
    } else {
      onChange({ ...genotype, [option.id]: defaultStatus() });
    }
    setPickerOpen(false);
  }

  function removeTrait(id: string) {
    const option = options.find((row) => row.id === id);
    onAddedTraitsChange(addedTraits.filter((row) => row !== id));
    if (option?.kind === "visual") {
      onChangeVisualTags(visualTags.filter((tag) => tag !== id));
      return;
    }
    onChange(clearTraitFromGenotype(genotype, id));
  }

  const visible = addedTraits;

  return (
    <section className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)] sm:p-6">
      <p className="text-[11px] tracking-[0.2em] text-accent-strong uppercase">
        {stepLabel}
      </p>
      <h2 className="mt-1 mb-4 text-lg font-semibold">{title}</h2>
      {animals.length > 0 ? (
        <label className="mb-5 grid gap-1 text-sm">
          <span className="font-medium">登録個体</span>
          <select
            className="nc-input"
            value={selectedId}
            onChange={(event) => onSelectAnimal(event.target.value)}
          >
            <option value="">仮想（手入力）</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animalTitle(animal)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {visible.length === 0 ? (
        <p className="mb-4 text-sm leading-6 text-muted">
          必要な遺伝形質だけ追加してください。未追加の形質は「なし」として計算します。
        </p>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {visible.map((id) => {
            const option = options.find((row) => row.id === id);
            if (!option) return null;
            if (option.kind === "visual") {
              return (
                <div
                  key={id}
                  className="rounded-2xl bg-sand px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {option.label}
                        {option.badge ? (
                          <span className="ml-2 text-xs font-normal text-muted">
                            {option.badge}
                          </span>
                        ) : null}
                        {option.hint ? <Hint text={option.hint} /> : null}
                      </p>
                      {option.shortNote ? (
                        <p className="mt-1 text-sm text-muted">{option.shortNote}</p>
                      ) : option.hint ? (
                        <p className="mt-1 text-sm text-muted">{option.hint}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="nc-btn-ghost shrink-0 px-3 text-sm"
                      onClick={() => removeTrait(id)}
                    >
                      外す
                    </button>
                  </div>
                </div>
              );
            }
            if (option.kind === "axanthic" && axanthicLocus) {
              return (
                <div key={id} className="grid gap-3 rounded-2xl bg-sand px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="pt-2 font-medium">
                      アザンティック
                      <Hint text="劣性です。系統は別の遺伝子として計算します。" />
                    </p>
                    <button
                      type="button"
                      className="nc-btn-ghost shrink-0 px-3 text-sm"
                      onClick={() => removeTrait(id)}
                    >
                      外す
                    </button>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span>状態</span>
                    <select
                      className="nc-input"
                      value={axanthic.status}
                      onChange={(event) => {
                        const status = event.target.value as GeneStatus;
                        onChange(
                          setAxanthicGenotype(
                            genotype,
                            axanthic.locusId,
                            axanthic.locusId,
                            status,
                          ),
                        );
                      }}
                    >
                      {statusesFor(axanthicLocus).map((status) => (
                        <option key={status} value={status}>
                          {geneStatusLabelJa(
                            status,
                            axanthicLocus.inheritance,
                            "アザンティック",
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  {axanthic.status !== "wild" ? (
                    <label className="grid gap-1 text-sm">
                      <span>系統</span>
                      <select
                        className="nc-input"
                        value={axanthic.locusId}
                        onChange={(event) => {
                          onChange(
                            setAxanthicGenotype(
                              genotype,
                              axanthic.locusId,
                              event.target.value,
                              axanthic.status,
                            ),
                          );
                        }}
                      >
                        {AXANTHIC_LOCI.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.lineJa}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            }
            if (option.kind === "locus" && option.locus) {
              const value = genotype[option.id] ?? "wild";
              return (
                <div key={id} className="grid gap-3 rounded-2xl bg-sand px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="pt-2 font-medium">
                      {option.label}
                      {option.hint ? <Hint text={option.hint} /> : null}
                    </p>
                    <button
                      type="button"
                      className="nc-btn-ghost shrink-0 px-3 text-sm"
                      onClick={() => removeTrait(id)}
                    >
                      外す
                    </button>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="sr-only">{option.label}</span>
                    <select
                      className="nc-input"
                      value={value}
                      onChange={(event) => {
                        const status = event.target.value as GeneStatus;
                        const next = { ...genotype };
                        if (status === "wild") delete next[option.id];
                        else next[option.id] = status;
                        onChange(next);
                      }}
                    >
                      {statusesFor(option.locus).map((status) => (
                        <option key={status} value={status}>
                          {geneStatusLabelJa(
                            status,
                            option.locus!.inheritance,
                            option.locus!.nameJa,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      <div>
        <button
          type="button"
          className="nc-btn-ghost w-full sm:w-auto"
          onClick={() => setPickerOpen((open) => !open)}
        >
          遺伝形質を追加 ＋
        </button>
        {pickerOpen ? (
          <ul className="mt-3 overflow-hidden rounded-2xl border border-line">
            {available.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">
                追加できる遺伝形質はすべて表示中です。
              </li>
            ) : (
              PICKER_CATEGORY_ORDER.map((category) => {
                const items = available.filter((option) => option.category === category);
                if (items.length === 0) return null;
                return (
                  <li key={category} className="border-t border-line first:border-t-0">
                    <p className="bg-[#faf7f2] px-4 py-2 text-[11px] tracking-[0.18em] text-muted uppercase">
                      {PICKER_CATEGORY_LABEL[category]}
                    </p>
                    <ul>
                      {items.map((option) => (
                        <li key={option.id} className="border-t border-line">
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-sand"
                            onClick={() => addTrait(option)}
                          >
                            <span>{option.label}</span>
                            {option.badge ? (
                              <span className="text-xs text-muted">{option.badge}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function PairingWorkbench({
  animals,
  projects,
  initialA = "",
  initialB = "",
  saveLabel = "この計算を保存",
}: {
  animals: CalculatorAnimal[];
  projects: { id: string; name: string }[];
  initialA?: string;
  initialB?: string;
  saveLabel?: string;
}) {
  const byId = useMemo(
    () => new Map(animals.map((animal) => [animal.id, animal])),
    [animals],
  );
  const [selectedA, setSelectedA] = useState(initialA);
  const [selectedB, setSelectedB] = useState(initialB);
  const [parentA, setParentA] = useState<Genotype>(
    byId.get(initialA)?.genotype ?? {},
  );
  const [parentB, setParentB] = useState<Genotype>(
    byId.get(initialB)?.genotype ?? {},
  );
  const [tagsA, setTagsA] = useState<string[]>(
    byId.get(initialA)?.traits ?? [],
  );
  const [tagsB, setTagsB] = useState<string[]>(
    byId.get(initialB)?.traits ?? [],
  );
  const [addedA, setAddedA] = useState<string[]>(() =>
    visibleTraitsFromParent(
      byId.get(initialA)?.genotype ?? {},
      byId.get(initialA)?.traits ?? [],
    ),
  );
  const [addedB, setAddedB] = useState<string[]>(() =>
    visibleTraitsFromParent(
      byId.get(initialB)?.genotype ?? {},
      byId.get(initialB)?.traits ?? [],
    ),
  );
  const [result, setResult] = useState<PairingResult | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");

  function pickA(id: string) {
    const animal = id ? byId.get(id) : undefined;
    setSelectedA(id);
    setParentA(animal?.genotype ?? {});
    setTagsA(animal?.traits ?? []);
    setAddedA(visibleTraitsFromParent(animal?.genotype ?? {}, animal?.traits ?? []));
    setResult(null);
  }
  function pickB(id: string) {
    const animal = id ? byId.get(id) : undefined;
    setSelectedB(id);
    setParentB(animal?.genotype ?? {});
    setTagsB(animal?.traits ?? []);
    setAddedB(visibleTraitsFromParent(animal?.genotype ?? {}, animal?.traits ?? []));
    setResult(null);
  }

  const maleChoices = animals.filter(
    (animal) => animal.sex !== "female" || animal.id === selectedA,
  );
  const femaleChoices = animals.filter(
    (animal) => animal.sex !== "male" || animal.id === selectedB,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <ParentEditor
          title={<ParentHeading sex="male" />}
          stepLabel="1. オスを選ぶ"
          genotype={parentA}
          onChange={(next) => {
            setParentA(next);
            setResult(null);
          }}
          visualTags={tagsA}
          onChangeVisualTags={(next) => {
            setTagsA(next);
            setResult(null);
          }}
          addedTraits={addedA}
          onAddedTraitsChange={setAddedA}
          animals={maleChoices}
          selectedId={selectedA}
          onSelectAnimal={pickA}
        />
        <ParentEditor
          title={<ParentHeading sex="female" />}
          stepLabel="2. メスを選ぶ"
          genotype={parentB}
          onChange={(next) => {
            setParentB(next);
            setResult(null);
          }}
          visualTags={tagsB}
          onChangeVisualTags={(next) => {
            setTagsB(next);
            setResult(null);
          }}
          addedTraits={addedB}
          onAddedTraitsChange={setAddedB}
          animals={femaleChoices}
          selectedId={selectedB}
          onSelectAnimal={pickB}
        />
      </div>

      <div>
        <p className="mb-3 text-[11px] tracking-[0.2em] text-accent-strong uppercase">
          3. 計算する
        </p>
        <button
          type="button"
          className="nc-btn w-full sm:w-auto"
          aria-busy={calcBusy}
          onPointerDown={() => setCalcBusy(true)}
          onClick={() => {
            setResult(calculatePairing(parentA, parentB));
            setCalcBusy(false);
          }}
        >
          {calcBusy ? "計算しています…" : "遺伝を計算する"}
        </button>
      </div>

      {result ? (
        <>
          <div>
            <p className="mb-3 text-[11px] tracking-[0.2em] text-accent-strong uppercase">
              4. 子の予想
            </p>
            <PairingResults result={result} />
          </div>
          <MutationForm
            action={savePrediction}
            className="flex flex-col gap-3 rounded-[1.5rem] border border-line bg-surface p-5 sm:p-6"
          >
            <input type="hidden" name="maleId" value={selectedA} />
            <input type="hidden" name="femaleId" value={selectedB} />
            <input type="hidden" name="parentA" value={JSON.stringify(parentA)} />
            <input type="hidden" name="parentB" value={JSON.stringify(parentB)} />
            <h2 className="text-lg font-semibold">計算結果を保存</h2>
            <label className="grid gap-1 text-sm">
              <span>名前</span>
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="nc-input"
                placeholder="例: 今季 LW × Phantom"
              />
            </label>
            {projects.length > 0 ? (
              <label className="grid gap-1 text-sm">
                <span>プロジェクト（任意）</span>
                <select
                  name="projectId"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="nc-input"
                >
                  <option value="">なし</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="projectId" value="" />
            )}
            <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-fit">
              {saveLabel}
            </PendingSubmitButton>
          </MutationForm>
        </>
      ) : (
        <p className="rounded-[1.5rem] border border-line bg-sand px-4 py-5 text-sm leading-6 text-muted">
          親♂・親♀と遺伝形質を設定して「遺伝を計算する」を押すと、予想される子の見た目と確率が表示されます。
        </p>
      )}
    </div>
  );
}
