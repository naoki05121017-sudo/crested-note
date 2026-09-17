import {
  geneStatusLabelJa,
  listLoci,
  type GeneStatus,
  type Genotype,
} from "@/lib/genetics";
import type { LocusDefinition } from "@/lib/genetics/types";
import { Hint } from "@/app/components/ui";
import { AXANTHIC_LOCUS_IDS } from "@/app/components/calculator-traits";

const AXANTHIC_SET = new Set<string>(AXANTHIC_LOCUS_IDS);

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

function LocusSelect({
  locus,
  genotype,
  namePrefix,
}: {
  locus: LocusDefinition;
  genotype: Genotype;
  namePrefix: string;
}) {
  const value = genotype[locus.id] ?? "wild";
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
        {statusesFor(locus).map((status) => (
          <option key={status} value={status}>
            {geneStatusLabelJa(status, locus.inheritance, locus.nameJa)}
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
