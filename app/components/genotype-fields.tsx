import { listLoci, type Genotype } from "@/lib/genetics";
import type { LocusDefinition } from "@/lib/genetics/types";
import { Hint } from "@/app/components/ui";
import {
  AXANTHIC_LOCUS_IDS,
  axanthicFromGenotype,
} from "@/app/components/calculator-traits";
import {
  coerceParentStatus,
  parentStatusOptions,
} from "@/app/components/parent-gene-status";

const AXANTHIC_SET = new Set<string>(AXANTHIC_LOCUS_IDS);

function LocusSelect({
  locus,
  genotype,
  namePrefix,
  label,
  hint,
}: {
  locus: LocusDefinition;
  genotype: Genotype;
  namePrefix: string;
  label?: string;
  hint?: string;
}) {
  const value = coerceParentStatus(genotype[locus.id], locus.id, locus, "wild");
  const title = label ?? locus.nameJa;
  const help = hint ?? locus.beginnerDescription;
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {title}
        {help ? <Hint text={help} /> : null}
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
  const axanthicLoci = loci.filter((locus) => AXANTHIC_SET.has(locus.id));
  const activeId = axanthicFromGenotype(genotype).locusId;
  const activeLocus =
    axanthicLoci.find((locus) => locus.id === activeId) ?? axanthicLoci[0];
  const preserved = axanthicLoci.filter((locus) => {
    if (!activeLocus || locus.id === activeLocus.id) return false;
    const status = genotype[locus.id];
    return Boolean(status && status !== "wild");
  });

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
      {activeLocus ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <LocusSelect
            locus={activeLocus}
            genotype={genotype}
            namePrefix={namePrefix}
            label="アザンティック"
            hint="劣性です。両親から1つずつ受け取ると見た目に出ます。"
          />
          {preserved.map((locus) => (
            <input
              key={locus.id}
              type="hidden"
              name={`${namePrefix}:${locus.id}`}
              value={genotype[locus.id]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
