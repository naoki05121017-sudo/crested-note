import { listLoci, type Genotype } from "@/lib/genetics";
import type { LocusDefinition } from "@/lib/genetics/types";
import { Hint } from "@/app/components/ui";
import { AXANTHIC_LOCUS_IDS } from "@/app/components/calculator-traits";
import {
  coerceParentStatus,
  parentStatusOptions,
} from "@/app/components/parent-gene-status";

const AXANTHIC_SET = new Set<string>(AXANTHIC_LOCUS_IDS);

function LocusSelect({
  locus,
  genotype,
  namePrefix,
}: {
  locus: LocusDefinition;
  genotype: Genotype;
  namePrefix: string;
}) {
  const value = coerceParentStatus(genotype[locus.id], locus.id, locus, "wild");
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {locus.nameJa}
        {locus.beginnerDescription ? (
          <Hint text={locus.beginnerDescription} />
        ) : null}
      </span>
      <select
        name={`${namePrefix}:${locus.id}`}
        defaultValue={value}
        className="nc-input"
      >
        {parentStatusOptions(locus.id, locus).map((row) => (
          <option key={row.status} value={row.status}>
            {row.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function GenotypeFields({
  genotype = {},
  namePrefix = "gene",
}: {
  genotype?: Genotype;
  namePrefix?: string;
}) {
  const loci = listLoci();
  const main = loci.filter((locus) => !AXANTHIC_SET.has(locus.id));
  const axanthic = loci.filter((locus) => AXANTHIC_SET.has(locus.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {main.map((locus) => (
          <LocusSelect
            key={locus.id}
            locus={locus}
            genotype={genotype}
            namePrefix={namePrefix}
          />
        ))}
      </div>
      <div>
        <p className="mb-3 text-sm font-medium">
          アザンティック
          <Hint text="系統ごとに別の遺伝子として計算します。画面では1項目にまとめて選べます。" />
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {axanthic.map((locus) => (
            <LocusSelect
              key={locus.id}
              locus={locus}
              genotype={genotype}
              namePrefix={namePrefix}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
