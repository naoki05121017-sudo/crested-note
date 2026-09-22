import { LOCI, type AlleleCopies, type CombinedOutcome, type GeneStatus, type Genotype } from "@/lib/genetics";
import { copiesToStatus, formatGenotypeLabel } from "@/lib/genetics";
import type { Animal } from "@/lib/db/types";

export function statusToCopies(
  status: GeneStatus | undefined | string,
): AlleleCopies {
  if (!status || status === "wild" || status === "unknown") return 0;
  if (status === "visual") return 2;
  if (status === "het" || status === "possible_50" || status === "possible_66") {
    return 1;
  }
  return 0;
}

export function phenotypeFromAnimal(animal: Animal): string {
  const copies: Record<string, AlleleCopies> = {};
  for (const locus of LOCI) {
    copies[locus.id] = statusToCopies(animal.genotype[locus.id]);
  }
  return formatGenotypeLabel(animal.genotype);
}

export function matchOutcome(
  animal: Animal,
  outcomes: CombinedOutcome[],
): CombinedOutcome | undefined {
  const label = formatGenotypeLabel(animal.genotype);
  return (
    outcomes.find((row) => row.phenotype === label) ??
    outcomes.find((row) => {
      const expected: Genotype = {};
      for (const [locusId, copies] of Object.entries(row.copies)) {
        const status = copiesToStatus(copies);
        if (status !== "wild") expected[locusId] = status;
      }
      return formatGenotypeLabel(expected) === label;
    })
  );
}
