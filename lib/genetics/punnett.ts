import { getLocusGenotype, getLocusState, wildGenotype } from "./catalog";
import type { AlleleId, LocusDefinition } from "./types";

const EPS = 1e-12;

export type AlleleDistribution = Map<AlleleId, number>;

export type GenotypeDistribution = { genotypeId: string; probability: number }[];

/**
 * Parent state → distribution over allele pairs.
 * Certain states resolve to one pair; possible hets stay a weighted mixture.
 */
export function parentGenotypeDistribution(
  locus: LocusDefinition,
  stateId: string | undefined,
): GenotypeDistribution {
  const state = getLocusState(locus.id, stateId ?? "wild");
  if (!state) {
    return [{ genotypeId: wildGenotype(locus).id, probability: 1 }];
  }
  const merged = new Map<string, number>();
  for (const row of state.mixture) {
    if (row.weight <= EPS) continue;
    merged.set(row.genotypeId, (merged.get(row.genotypeId) ?? 0) + row.weight);
  }
  return [...merged].map(([genotypeId, probability]) => ({
    genotypeId,
    probability,
  }));
}

/** Gamete alleles from a parent state. Each allele of a pair is passed 1/2. */
export function gameteDistribution(
  locus: LocusDefinition,
  stateId: string | undefined,
): AlleleDistribution {
  const alleles: AlleleDistribution = new Map();
  for (const row of parentGenotypeDistribution(locus, stateId)) {
    const genotype = getLocusGenotype(locus.id, row.genotypeId);
    if (!genotype) continue;
    for (const allele of genotype.alleles) {
      alleles.set(allele, (alleles.get(allele) ?? 0) + row.probability / 2);
    }
  }
  return alleles;
}

function canonicalPairKey(
  locus: LocusDefinition,
  a: AlleleId,
  b: AlleleId,
): string {
  const order = locus.alleles.map((allele) => allele.id);
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  return ia <= ib ? `${a}|${b}` : `${b}|${a}`;
}

const PAIR_INDEX = new WeakMap<LocusDefinition, Map<string, string>>();

function pairIndex(locus: LocusDefinition): Map<string, string> {
  const cached = PAIR_INDEX.get(locus);
  if (cached) return cached;
  const index = new Map<string, string>();
  for (const genotype of locus.genotypes) {
    const [a, b] = genotype.alleles;
    index.set(canonicalPairKey(locus, a, b), genotype.id);
  }
  PAIR_INDEX.set(locus, index);
  return index;
}

/** Allele pair → the genotype id defined for it. */
export function genotypeIdForPair(
  locus: LocusDefinition,
  a: AlleleId,
  b: AlleleId,
): string | undefined {
  return pairIndex(locus).get(canonicalPairKey(locus, a, b));
}

/**
 * Full cross of both parents' gametes for one locus.
 * Rows are merged by genotype and sorted by descending probability.
 */
export function offspringGenotypeDistribution(
  locus: LocusDefinition,
  stateA: string | undefined,
  stateB: string | undefined,
): GenotypeDistribution {
  const gametesA = gameteDistribution(locus, stateA);
  const gametesB = gameteDistribution(locus, stateB);
  const merged = new Map<string, number>();

  for (const [alleleA, pA] of gametesA) {
    for (const [alleleB, pB] of gametesB) {
      const probability = pA * pB;
      if (probability <= EPS) continue;
      const genotypeId = genotypeIdForPair(locus, alleleA, alleleB);
      if (!genotypeId) continue;
      merged.set(genotypeId, (merged.get(genotypeId) ?? 0) + probability);
    }
  }

  return [...merged]
    .map(([genotypeId, probability]) => ({ genotypeId, probability }))
    .filter((row) => row.probability > EPS)
    .sort((a, b) => b.probability - a.probability);
}
