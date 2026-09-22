import { getLocus } from "./catalog";
import { allelicSeatForTag, mergeAllelicVisuals } from "./allelic-visual";
import type { GeneStatus, Genotype } from "./types";

/**
 * Canonical parent input for pairing math.
 * Keeps every Mendelian locus already on the genotype, then folds allelic
 * visual tags (sable / highway → cappuccino seat) without adding loci.
 */
export function resolveParentGenotype(
  genotype: Genotype,
  visualTags: string[] = [],
): Genotype {
  const kept: Genotype = {};
  for (const [id, status] of Object.entries(genotype)) {
    if (!status || status === "wild") continue;
    const seat = allelicSeatForTag(id);
    if (seat && getLocus(seat)) {
      if (!kept[seat] || kept[seat] === "wild") {
        kept[seat] = status === "visual" ? "visual" : "het";
      }
      continue;
    }
    kept[id] = status as GeneStatus;
  }
  return mergeAllelicVisuals(kept, visualTags);
}

export function parentLocusIds(genotype: Genotype): string[] {
  return Object.entries(genotype)
    .filter(([id, status]) => status && status !== "wild" && getLocus(id))
    .map(([id]) => id);
}

export function allelicTagsForLocus(
  visualTags: string[],
  locusId: string,
): string[] {
  return visualTags.filter((tag) => allelicSeatForTag(tag) === locusId);
}
