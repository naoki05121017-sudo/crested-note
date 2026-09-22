"use client";

import { useMemo, useRef, useState } from "react";
import {
  getLocus,
  selectableStates,
  type PairingResult,
} from "@/lib/genetics";
import { animalTitle } from "@/lib/db/labels";
import { PairingResults } from "@/app/components/pairing-results";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { savePrediction } from "@/app/predictions/actions";
import type { CalculatorAnimal } from "@/app/calculator/types";
import { Hint } from "@/app/components/ui";
import { TraitCategoryPicker } from "@/app/components/trait-category-picker";
import {
  AXANTHIC_LOCI,
  AXANTHIC_TRAIT_ID,
  axanthicFromGenotype,
  calculatorTraitOptions,
  rowIdForOption,
  setAxanthicGenotype,
  type CalculatorTraitOption,
} from "@/app/components/calculator-traits";
import {
  addCalculatorTrait,
  collectTraitsForPairing,
  hydrateParentForPairing,
  removeCalculatorTrait,
  runCalculatorPairing,
  setLocusState,
  type CalculatorParentState,
} from "@/app/components/calculator-pairing";

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

function parentStateFromAnimal(
  animal?: CalculatorAnimal,
): CalculatorParentState {
  return hydrateParentForPairing({
    genotype: animal?.genotype ?? {},
    traits: animal?.traits ?? [],
    addedTraits: [],
  });
}

function RowShell({
  title,
  hint,
  note,
  badge,
  onRemove,
  children,
}: {
  title: string;
  hint?: string;
  note?: string;
  badge?: string;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-2xl bg-sand px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {title}
            {badge ? (
              <span className="ml-2 text-xs font-normal text-muted">{badge}</span>
            ) : null}
            {hint ? <Hint text={hint} /> : null}
          </p>
          {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
        </div>
        <button
          type="button"
          className="nc-btn-ghost shrink-0 px-3 text-sm"
          onClick={onRemove}
        >
          外す
        </button>
      </div>
      {children}
    </div>
  );
}

function ParentEditor({
  title,
  stepLabel,
  state,
  onStateChange,
  animals,
  selectedId,
  onSelectAnimal,
}: {
  title: React.ReactNode;
  stepLabel: string;
  state: CalculatorParentState;
  onStateChange: (next: CalculatorParentState) => void;
  animals: CalculatorAnimal[];
  selectedId: string;
  onSelectAnimal: (id: string) => void;
}) {
  const { genotype, addedTraits } = state;
  const options = calculatorTraitOptions();
  const available = options.filter(
    (option) => !addedTraits.includes(rowIdForOption(option)),
  );
  const axanthic = axanthicFromGenotype(genotype);
  const axanthicLocus = getLocus(axanthic.locusId);

  function addTrait(option: CalculatorTraitOption) {
    onStateChange(addCalculatorTrait(state, option));
  }

  function removeTrait(rowId: string) {
    const option = options.find((row) => rowIdForOption(row) === rowId);
    onStateChange(removeCalculatorTrait(state, option, rowId));
  }

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

      {addedTraits.length === 0 ? (
        <p className="mb-4 text-sm leading-6 text-muted">
          必要な遺伝形質だけ追加してください。未追加の形質は「なし」として計算します。
        </p>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {addedTraits.map((rowId) => {
            if (rowId === AXANTHIC_TRAIT_ID && axanthicLocus) {
              return (
                <RowShell
                  key={rowId}
                  title="アザンティック"
                  hint="劣性です。系統は別の遺伝子として計算します。"
                  onRemove={() => removeTrait(rowId)}
                >
                  <label className="grid gap-1 text-sm">
                    <span>状態</span>
                    <select
                      className="nc-input"
                      value={axanthic.stateId}
                      onChange={(event) => {
                        const current = axanthicFromGenotype(genotype);
                        onStateChange({
                          ...state,
                          genotype: setAxanthicGenotype(
                            genotype,
                            current.locusId,
                            current.locusId,
                            event.target.value,
                          ),
                        });
                      }}
                    >
                      {selectableStates(axanthicLocus).map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.labelJa.replace(/ \(.*?\)/, "")}
                        </option>
                      ))}
                    </select>
                  </label>
                  {axanthic.stateId !== "wild" ? (
                    <label className="grid gap-1 text-sm">
                      <span>系統</span>
                      <select
                        className="nc-input"
                        value={axanthic.locusId}
                        onChange={(event) => {
                          const current = axanthicFromGenotype(genotype);
                          onStateChange({
                            ...state,
                            genotype: setAxanthicGenotype(
                              genotype,
                              current.locusId,
                              event.target.value,
                              current.stateId,
                            ),
                          });
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
                </RowShell>
              );
            }

            const locus = getLocus(rowId);
            if (locus) {
              const option = options.find(
                (row) => row.kind === "locus" && row.locus?.id === locus.id,
              );
              return (
                <RowShell
                  key={rowId}
                  title={locus.nameJa}
                  hint={locus.beginnerDescription}
                  note={locus.notesJa}
                  onRemove={() => removeTrait(rowId)}
                >
                  <label className="grid gap-1 text-sm">
                    <span className="sr-only">
                      {option?.label ?? locus.nameJa}
                    </span>
                    <select
                      className="nc-input"
                      value={genotype[locus.id] ?? "wild"}
                      onChange={(event) =>
                        onStateChange(
                          setLocusState(state, locus.id, event.target.value),
                        )
                      }
                    >
                      {selectableStates(locus).map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.labelJa}
                        </option>
                      ))}
                    </select>
                  </label>
                </RowShell>
              );
            }

            const trait = options.find(
              (row) => row.kind === "visual" && row.id === rowId,
            );
            if (!trait) return null;
            return (
              <RowShell
                key={rowId}
                title={trait.label}
                badge={trait.badge}
                hint={trait.hint}
                note={trait.shortNote ?? trait.hint}
                onRemove={() => removeTrait(rowId)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-2">
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
          state={stateA}
          onStateChange={commitA}
          animals={maleChoices}
          selectedId={selectedA}
          onSelectAnimal={pickA}
        />
        <ParentEditor
          title={<ParentHeading sex="female" />}
          stepLabel="2. メスを選ぶ"
          state={stateB}
          onStateChange={commitB}
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
          onClick={() =>
            setResult(
              runCalculatorPairing(stateARef.current, stateBRef.current),
            )
          }
        >
          遺伝を計算する
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
            <input
              type="hidden"
              name="parentA"
              value={JSON.stringify(hydrateParentForPairing(stateA).genotype)}
            />
            <input
              type="hidden"
              name="parentB"
              value={JSON.stringify(hydrateParentForPairing(stateB).genotype)}
            />
            <input
              type="hidden"
              name="traitsA"
              value={JSON.stringify(collectTraitsForPairing(stateA))}
            />
            <input
              type="hidden"
              name="traitsB"
              value={JSON.stringify(collectTraitsForPairing(stateB))}
            />
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
            <PendingSubmitButton
              pendingLabel="保存しています…"
              className="nc-btn w-full sm:w-fit"
            >
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
