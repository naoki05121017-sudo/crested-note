import {
  formatGenotypeLabel,
  resolveParentGenotype,
  type CombinedOutcome,
  type Genotype,
} from "@/lib/genetics";
import type { Animal } from "@/lib/db/types";

export function phenotypeFromAnimal(animal: Animal): string {
  return formatGenotypeLabel(animal.genotype);
}

function sameGenotype(a: Genotype, b: Genotype): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "wild") !== (b[key] ?? "wild")) return false;
  }
  return true;
}

/**
 * Find the predicted row a hatched animal actually matches.
 * Genotype equality wins; the phenotype name is only a fallback for rows
 * recorded before the genotype was known.
 */
export function matchOutcome(
  animal: Animal,
  outcomes: CombinedOutcome[],
): CombinedOutcome | undefined {
  const genotype = resolveParentGenotype(animal.genotype);
  const byGenotype = outcomes.find((row) =>
    sameGenotype(resolveParentGenotype(row.genotype), genotype),
  );
  if (byGenotype) return byGenotype;
  const label = formatGenotypeLabel(animal.genotype);
  return outcomes.find((row) => row.phenotype === label);
}
