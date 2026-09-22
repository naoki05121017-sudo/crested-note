import { getLocus, getVisualTrait } from "./catalog";
import type { GeneStatus, Genotype } from "./types";

export type CappuccinoMorphDisplay = "cappuccino" | "sable" | "highway";

/** Same-seat visual ids. Does not add loci — both map onto cappuccino. */
const ALLELIC_SEAT: Record<string, string> = {
  sable: "cappuccino",
  highway: "cappuccino",
};

export function allelicSeatForTag(tag: string): string | undefined {
  return getVisualTrait(tag)?.alleleOf ?? ALLELIC_SEAT[tag];
}

/** Map allelic visual tags (sable/highway) onto the cappuccino seat. Does not add loci. */
export function mergeAllelicVisuals(
  genotype: Genotype,
  visualTags: string[] = [],
): Genotype {
  const next: Genotype = { ...genotype };
  for (const tag of visualTags) {
    const locusId = allelicSeatForTag(tag);
    if (!locusId || !getLocus(locusId)) continue;
    const status = next[locusId];
    if (status && status !== "wild") continue;
    next[locusId] = "het";
  }
  return next;
}

export function cappuccinoMorphDisplay(
  genotypeA: Genotype,
  genotypeB: Genotype,
  visualA: string[] = [],
  visualB: string[] = [],
): CappuccinoMorphDisplay {
  const tags = [
    ...visualA,
    ...visualB,
    ...Object.keys(genotypeA),
    ...Object.keys(genotypeB),
  ];
  if (tags.includes("sable")) return "sable";
  if (tags.includes("highway")) return "highway";
  return "cappuccino";
}

export function allelicVisualCoversLocus(
  visualTags: string[],
  locusId: string,
): boolean {
  return visualTags.some((tag) => allelicSeatForTag(tag) === locusId);
}

export function defaultStatusForAllelicVisual(): GeneStatus {
  return "het";
}
