import type { AlleleCopies, GeneStatus } from "./types";

const EPS = 1e-12;

/** Probability that one gamete carries the morph allele. */
export function morphAllelePassProbability(status: GeneStatus): number {
  switch (status) {
    case "wild":
    case "unknown":
      return 0;
    case "het":
      return 0.5;
    case "visual":
      return 1;
    case "possible_50":
      return 0.25;
    case "possible_66":
      return 1 / 3;
  }
}

export type CopyDistribution = Record<AlleleCopies, number>;

export function emptyCopyDistribution(): CopyDistribution {
  return { 0: 0, 1: 0, 2: 0 };
}

/**
 * Mixture model: each parent independently passes the morph allele
 * with {@link morphAllelePassProbability}. Suitable for planning odds,
 * including 50% / 66% possible hets.
 */
export function offspringCopyDistribution(
  parentA: GeneStatus,
  parentB: GeneStatus,
): CopyDistribution {
  const pA = morphAllelePassProbability(parentA);
  const pB = morphAllelePassProbability(parentB);
  return {
    0: (1 - pA) * (1 - pB),
    1: pA * (1 - pB) + (1 - pA) * pB,
    2: pA * pB,
  };
}

export function compactCopyDistribution(
  distribution: CopyDistribution,
): { copies: AlleleCopies; probability: number }[] {
  return ([0, 1, 2] as const)
    .map((copies) => ({ copies, probability: distribution[copies] }))
    .filter((row) => row.probability > EPS);
}
