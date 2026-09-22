import { getLocusState, type Genotype } from "@/lib/genetics";
import type { AnimalGeneRecord } from "./types";

export function replaceGenes(
  genes: AnimalGeneRecord[],
  animalId: string,
  genotype: Genotype,
): AnimalGeneRecord[] {
  const next = genes.filter((gene) => gene.animalId !== animalId);
  for (const [locusId, status] of Object.entries(genotype)) {
    if (!status || status === "wild") continue;
    if (!getLocusState(locusId, status)) continue;
    next.push({ animalId, locusId, status });
  }
  return next;
}
