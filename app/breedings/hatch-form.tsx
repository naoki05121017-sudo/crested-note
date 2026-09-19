"use client";

import { useMemo, useState } from "react";
import { hatchEgg } from "@/app/breedings/actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import {
  calculatePairing,
  formatProbability,
  type CombinedOutcome,
  type Genotype,
} from "@/lib/genetics";

export function HatchForm({
  eggId,
  sireGenotype,
  damGenotype,
}: {
  eggId: string;
  sireGenotype: Genotype;
  damGenotype: Genotype;
}) {
  const result = useMemo(
    () => calculatePairing(sireGenotype, damGenotype),
    [sireGenotype, damGenotype],
  );
  const [selected, setSelected] = useState<CombinedOutcome | null>(
    result.outcomes[0] ?? null,
  );
  const action = hatchEgg.bind(null, eggId);

  return (
    <MutationForm action={action} className="mt-3 flex flex-col gap-3 rounded-2xl bg-sand p-4">
      <input
        type="hidden"
        name="copiesJson"
        value={JSON.stringify(selected?.copies ?? {})}
      />
      <input
        type="hidden"
        name="morphLabel"
        value={selected?.phenotype ?? ""}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span>名前</span>
          <input
            required
            name="name"
            className="nc-input"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>管理番号</span>
          <input
            name="code"
            className="nc-input"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>性別</span>
          <select
            name="sex"
            defaultValue="unknown"
            className="nc-input"
          >
            <option value="unknown">不明</option>
            <option value="male">オス</option>
            <option value="female">メス</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>孵化日</span>
          <input
            type="date"
            name="hatchDate"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="nc-input"
          />
        </label>
      </div>
      <fieldset className="grid gap-1 text-sm">
        <legend className="mb-1 font-medium">表現型（計算結果から選択）</legend>
        {result.outcomes.slice(0, 12).map((outcome) => (
          <label key={outcome.phenotype} className="flex min-h-11 items-start gap-2">
            <input
              type="radio"
              name="phenotypePick"
              className="nc-check mt-1"
              checked={selected?.phenotype === outcome.phenotype}
              onChange={() => setSelected(outcome)}
            />
            <span>
              {outcome.phenotype}{" "}
              <span className="text-muted">
                {formatProbability(outcome.probability)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <PendingSubmitButton pendingLabel="登録しています…" className="nc-btn w-full sm:w-fit">
        孵化個体として登録
      </PendingSubmitButton>
    </MutationForm>
  );
}
