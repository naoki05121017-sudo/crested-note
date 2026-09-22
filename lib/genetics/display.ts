import { getLocus, getLocusGenotype, getLocusState, LOCI } from "./catalog";
import { resolveParentGenotype } from "./normalize";
import type { Genotype, OffspringGenotype } from "./types";

const NONE = "野生型";

/**
 * Detail line for one offspring genotype, e.g.
 * 「セーブル（N/Sable）、リリーホワイト（NLW）」.
 * Built from the same genotype the phenotype name came from.
 */
export function formatGenotypeDetail(genotype: OffspringGenotype): string {
  const tokens: string[] = [];
  for (const locus of LOCI) {
    const genotypeId = genotype[locus.id];
    if (!genotypeId) continue;
    const definition = getLocusGenotype(locus.id, genotypeId);
    if (!definition || definition.wild) continue;
    tokens.push(`${definition.nameJa}（${definition.notation}）`);
  }
  return tokens.length > 0 ? tokens.join("、") : NONE;
}

/** Same detail line for a recorded parent, including possible hets. */
export function formatParentGenotypeDetail(raw: Genotype): string {
  const genotype = resolveParentGenotype(raw);
  const tokens: string[] = [];
  for (const locus of LOCI) {
    const stateId = genotype[locus.id];
    if (!stateId) continue;
    const definition = getLocusGenotype(locus.id, stateId);
    if (definition) {
      if (definition.wild) continue;
      tokens.push(`${definition.nameJa}（${definition.notation}）`);
      continue;
    }
    const state = getLocusState(locus.id, stateId);
    if (state) tokens.push(state.labelJa);
  }
  return tokens.length > 0 ? tokens.join("、") : NONE;
}

/** Select label for one recorded state. */
export function locusStateLabel(locusId: string, stateId: string): string {
  const state = getLocusState(locusId, stateId);
  if (state) return state.labelJa;
  return getLocus(locusId)?.nameJa ?? stateId;
}
