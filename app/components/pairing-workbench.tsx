"use client";

import { useMemo, useRef, useState } from "react";
import {
  getVisualTrait,
  listLoci,
  allelicVisualCoversLocus,
  mergeAllelicVisuals,
  formatGenotypeLabel,
  visualTraitName,
  type GeneStatus,
  type Genotype,
  type PairingResult,
} from "@/lib/genetics";
import { SEX_LABEL, animalTitle } from "@/lib/db/labels";
import { PairingResults } from "@/app/components/pairing-results";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { savePrediction } from "@/app/predictions/actions";
import type { CalculatorAnimal } from "@/app/calculator/types";
import { Hint } from "@/app/components/ui";
import { TraitCategoryPicker } from "@/app/components/trait-category-picker";
import {
  AXANTHIC_LOCI,
  axanthicFromGenotype,
  calculatorTraitOptions,
  setAxanthicGenotype,
  visibleTraitsFromParent,
  type CalculatorTraitOption,
} from "@/app/components/calculator-traits";
import {
  addCalculatorTrait,
  collectVisualTagsForPairing,
  hydrateParentForPairing,
  removeCalculatorTrait,
  runCalculatorPairing,
  type CalculatorParentState,
} from "@/app/components/calculator-pairing";
import {
  coerceParentStatus,
  parentStatusOptions,
} from "@/app/components/parent-gene-status";

function ParentHeading({ sex }: { sex: "male" | "female" }) {
  const symbol = sex === "male" ? "♂" : "♀";
  const color = sex === "male" ? "text-[#4d6fa8]" : "text-[#c45c78]";
  const word = sex === "male" ? "父親" : "母親";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-ink">{word}</span>
      <span
        className={`${color} text-[1.45rem] font-extrabold leading-none sm:text-[1.7rem]`}
        aria-label={sex === "male" ? "オス" : "メス"}
      >
        {symbol}
      </span>
    </span>
  );
}

function parentStateFromAnimal(animal?: CalculatorAnimal): CalculatorParentState {
  const genotype = mergeAllelicVisuals(animal?.genotype ?? {}, animal?.traits ?? []);
  const visualTags = animal?.traits ?? [];
  return hydrateParentForPairing({
    genotype,
    visualTags,
    addedTraits: visibleTraitsFromParent(genotype, visualTags),
  });
}

function ParentEditor({
  title,
  stepLabel,
  tint,
  state,
  onStateChange,
  animals,
  selectedId,
  onSelectAnimal,
}: {
  title: React.ReactNode;
  stepLabel: string;
  tint: string;
  state: CalculatorParentState;
  onStateChange: (next: CalculatorParentState) => void;
  animals: CalculatorAnimal[];
  selectedId: string;
  onSelectAnimal: (id: string) => void;
}) {
  const { genotype, visualTags, addedTraits } = state;
  const options = calculatorTraitOptions();
  const selected = animals.find((animal) => animal.id === selectedId);
  const available = options.filter((option) => {
    if (addedTraits.includes(option.id)) return false;
    if (option.kind === "locus" && allelicVisualCoversLocus(visualTags, option.id)) {
      return false;
    }
    return true;
  });
  const axanthic = axanthicFromGenotype(genotype);
  const axanthicLocus = listLoci().find((locus) => locus.id === axanthic.locusId);

  function addTrait(option: CalculatorTraitOption) {
    onStateChange(addCalculatorTrait(state, option));
  }

  function removeTrait(id: string) {
    const option = options.find((row) => row.id === id);
    onStateChange(removeCalculatorTrait(state, option, id));
  }

  function patchGenotype(nextGenotype: Genotype) {
    onStateChange(hydrateParentForPairing({ ...state, genotype: nextGenotype }));
  }

  const visible = addedTraits;

  return (
    <section
      className={`rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_28px_rgba(23,20,28,0.05)] sm:p-6 ${tint}`}
    >
      <p className="text-[11px] tracking-[0.2em] text-ink/40 uppercase">{stepLabel}</p>
      <h2 className="mt-2 mb-5 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {animals.length > 0 ? (
        <label className="mb-4 grid gap-1 text-sm">
          <span className="font-medium">個体から選択</span>
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

      <div className="mb-5 rounded-[1.35rem] bg-white/80 px-4 py-4">
        {selected ? (
          <>
            <p className="text-lg font-semibold tracking-tight">{selected.name}</p>
            <p className="mt-1 text-sm text-ink/70">{SEX_LABEL[selected.sex]}</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {selected.morphLabel?.trim() || formatGenotypeLabel(selected.genotype)}
            </p>
            {selected.traits.length > 0 ? (
              <p className="mt-1 text-xs leading-5 text-muted">
                {selected.traits.map((id) => visualTraitName(id)).join(" / ")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-lg font-semibold tracking-tight">仮想（手入力）</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              下からモルフを選ぶと、その親として計算します。
            </p>
          </>
        )}
      </div>

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
              const alleleLocusId = getVisualTrait(id)?.alleleOf;
              const alleleLocus = alleleLocusId
                ? listLoci().find((locus) => locus.id === alleleLocusId)
                : undefined;
              return (
                <div
                  key={id}
                  className="rounded-[1.25rem] border border-white/70 bg-white/80 px-4 py-3"
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
                  {alleleLocus ? (
                    <label className="mt-3 grid gap-1 text-sm">
                      <span>状態</span>
                      <select
                        className="nc-input"
                        value={coerceParentStatus(
                          genotype[alleleLocus.id],
                          id,
                          alleleLocus,
                        )}
                        onChange={(event) => {
                          const status = event.target.value as GeneStatus;
                          const next = { ...genotype };
                          if (status === "wild") delete next[alleleLocus.id];
                          else next[alleleLocus.id] = status;
                          patchGenotype(next);
                        }}
                      >
                        {parentStatusOptions(id, alleleLocus).map((row) => (
                          <option key={row.status} value={row.status}>
                            {row.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            }
            if (option.kind === "axanthic" && axanthicLocus) {
              return (
                <div key={id} className="grid gap-3 rounded-[1.25rem] border border-white/70 bg-white/80 px-4 py-3">
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
                        const currentAx = axanthicFromGenotype(genotype);
                        patchGenotype(
                          setAxanthicGenotype(
                            genotype,
                            currentAx.locusId,
                            currentAx.locusId,
                            status,
                          ),
                        );
                      }}
                    >
                      {parentStatusOptions("axanthic", axanthicLocus).map((row) => (
                        <option key={row.status} value={row.status}>
                          {row.label}
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
                          const toLocusId = event.target.value;
                          const currentAx = axanthicFromGenotype(genotype);
                          patchGenotype(
                            setAxanthicGenotype(
                              genotype,
                              currentAx.locusId,
                              toLocusId,
                              currentAx.status,
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
              const value = coerceParentStatus(
                genotype[option.id],
                option.id,
                option.locus,
                "wild",
              );
              return (
                <div key={id} className="grid gap-3 rounded-[1.25rem] border border-white/70 bg-white/80 px-4 py-3">
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
                        patchGenotype(next);
                      }}
                    >
                      {parentStatusOptions(option.id, option.locus).map((row) => (
                        <option key={row.status} value={row.status}>
                          {row.label}
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

      <div className="mt-2">
        <p className="mb-2 text-sm font-medium">モルフから選択</p>
        <TraitCategoryPicker options={available} onPick={addTrait} />
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
  const [stateA, setStateA] = useState<CalculatorParentState>(() =>
    parentStateFromAnimal(byId.get(initialA)),
  );
  const [stateB, setStateB] = useState<CalculatorParentState>(() =>
    parentStateFromAnimal(byId.get(initialB)),
  );
  const [result, setResult] = useState<PairingResult | null>(null);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const stateARef = useRef(stateA);
  const stateBRef = useRef(stateB);
  stateARef.current = stateA;
  stateBRef.current = stateB;

  function commitA(next: CalculatorParentState) {
    stateARef.current = next;
    setStateA(next);
    setResult(null);
  }
  function commitB(next: CalculatorParentState) {
    stateBRef.current = next;
    setStateB(next);
    setResult(null);
  }

  function pickA(id: string) {
    const animal = id ? byId.get(id) : undefined;
    setSelectedA(id);
    commitA(parentStateFromAnimal(animal));
  }
  function pickB(id: string) {
    const animal = id ? byId.get(id) : undefined;
    setSelectedB(id);
    commitB(parentStateFromAnimal(animal));
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
          tint="bg-gradient-to-br from-[#e7f3fb] via-white to-white"
          state={stateA}
          onStateChange={commitA}
          animals={maleChoices}
          selectedId={selectedA}
          onSelectAnimal={pickA}
        />
        <ParentEditor
          title={<ParentHeading sex="female" />}
          stepLabel="2. メスを選ぶ"
          tint="bg-gradient-to-br from-[#fde8ef] via-white to-white"
          state={stateB}
          onStateChange={commitB}
          animals={femaleChoices}
          selectedId={selectedB}
          onSelectAnimal={pickB}
        />
      </div>

      <div>
        <p className="mb-3 text-[11px] tracking-[0.2em] text-ink/40 uppercase">
          3. 計算する
        </p>
        <button
          type="button"
          className="nc-btn min-h-14 w-full px-8 text-base sm:w-auto sm:min-w-[16rem]"
          onClick={() => {
            setResult(
              runCalculatorPairing(stateARef.current, stateBRef.current),
            );
          }}
        >
          遺伝を計算する
        </button>
      </div>

      {result ? (
        <>
          <div>
            <p className="mb-3 text-[11px] tracking-[0.2em] text-ink/40 uppercase">
              4. 子の予想
            </p>
            <PairingResults result={result} />
          </div>
          <MutationForm
            action={savePrediction}
            className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_28px_rgba(23,20,28,0.05)] sm:p-6"
          >
            <input type="hidden" name="maleId" value={selectedA} />
            <input type="hidden" name="femaleId" value={selectedB} />
            <input type="hidden" name="parentA" value={JSON.stringify(hydrateParentForPairing(stateA).genotype)} />
            <input type="hidden" name="parentB" value={JSON.stringify(hydrateParentForPairing(stateB).genotype)} />
            <input type="hidden" name="visualA" value={JSON.stringify(collectVisualTagsForPairing(stateA))} />
            <input type="hidden" name="visualB" value={JSON.stringify(collectVisualTagsForPairing(stateB))} />
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
        <p className="rounded-[1.75rem] border border-line bg-white px-5 py-6 text-sm leading-6 text-muted shadow-[0_10px_28px_rgba(23,20,28,0.05)]">
          親♂・親♀と遺伝形質を設定して「遺伝を計算する」を押すと、予想される子の見た目と確率が表示されます。
        </p>
      )}
    </div>
  );
}
