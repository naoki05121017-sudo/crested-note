import { getLocus } from "./catalog";
import { allelicSeatForTag, mergeAllelicVisuals } from "./allelic-visual";
import { inferCshDiplotype } from "./csh";
import type { GeneStatus, Genotype } from "./types";

/**
 * Canonical parent input for pairing math.
 * Keeps every Mendelian locus already on the genotype, then folds allelic
 * visual tags (sable / highway → cappuccino seat) and CSH diplotype.
 */
export function resolveParentGenotype(
  genotype: Genotype,
  visualTags: string[] = [],
): Genotype {
  const kept: Genotype = {};
  if (genotype.csh) kept.csh = genotype.csh;
  for (const [id, status] of Object.entries(genotype)) {
    if (id === "csh") continue;
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
  const merged = mergeAllelicVisuals(kept, visualTags);
  for (const tag of visualTags) {
    if (!getLocus(tag)) continue;
    if (!merged[tag] || merged[tag] === "wild") merged[tag] = "het";
  }
  const tags = [...visualTags];
  if (genotype.sable) tags.push("sable");
  if (genotype.highway) tags.push("highway");
  const csh = inferCshDiplotype(merged, tags);
  if (csh !== "NN") merged.csh = csh;
  else delete merged.csh;
  return merged;
}

export function parentLocusIds(genotype: Genotype): string[] {
  return Object.entries(genotype)
    .filter(([id, status]) => id !== "csh" && status && status !== "wild" && getLocus(id))
    .map(([id]) => id);
}

export function allelicTagsForLocus(
  visualTags: string[],
  locusId: string,
): string[] {
  return visualTags.filter((tag) => allelicSeatForTag(tag) === locusId);
}
