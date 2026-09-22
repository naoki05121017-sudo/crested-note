import { COMBO_WARNINGS, LOCI, getLocus } from "./catalog";
import { combinePhenotype, describeCopies, locusOutcomeLabel } from "./phenotype";
import {
  cappuccinoMorphDisplay,
  allelicSeatForTag,
  type CappuccinoMorphDisplay,
} from "./allelic-visual";
import { resolveParentGenotype } from "./parent-input";
import {
  compactCopyDistribution,
  offspringCopyDistribution,
} from "./punnett";
import type {
  AlleleCopies,
  CombinedOutcome,
  GeneStatus,
  Genotype,
  LocusResult,
  PairingResult,
  PairingWarning,
} from "./types";

const EPS = 1e-12;

function statusOf(genotype: Genotype, locusId: string): GeneStatus {
  return genotype[locusId] ?? "wild";
}

function unrecognizedIds(genotype: Genotype): string[] {
  return Object.keys(genotype).filter((id) => {
    if (getLocus(id)) return false;
    const seat = allelicSeatForTag(id);
    if (seat && getLocus(seat)) return false;
    return true;
  });
}

function calculateLocus(
  locusId: string,
  parentA: GeneStatus,
  parentB: GeneStatus,
): LocusResult | null {
  const locus = getLocus(locusId);
  if (!locus) return null;

  const distribution = offspringCopyDistribution(parentA, parentB);
  const outcomes = compactCopyDistribution(distribution).map((row) => {
    const described = describeCopies(locus, row.copies);
    return {
      copies: row.copies,
      probability: row.probability,
      kind: described.kind,
      label: locusOutcomeLabel(locus, row.copies),
    };
  });

  return {
    locusId,
    nameJa: locus.nameJa,
    inheritance: locus.inheritance,
    parentA,
    parentB,
    outcomes,
  };
}

type ExpandState = {
  probability: number;
  copies: Record<string, AlleleCopies>;
};

function expandPairing(
  loci: LocusResult[],
  cappuccinoMorph: CappuccinoMorphDisplay,
): {
  outcomes: CombinedOutcome[];
  warnings: PairingWarning[];
} {
  const varying = loci.filter((locus) => {
    const wild = locus.outcomes.find((o) => o.copies === 0);
    return !(locus.outcomes.length === 1 && wild && wild.probability > 1 - EPS);
  });

  let states: ExpandState[] = [{ probability: 1, copies: {} }];

  for (const locus of varying) {
    const next: ExpandState[] = [];
    for (const state of states) {
      for (const outcome of locus.outcomes) {
        const probability = state.probability * outcome.probability;
        if (probability <= EPS) continue;
        next.push({
          probability,
          copies: {
            ...state.copies,
            [locus.locusId]: outcome.copies,
          },
        });
      }
    }
    states = next;
  }

  const merged = new Map<string, CombinedOutcome>();
  const warningTotals = new Map<string, PairingWarning>();

  for (const state of states) {
    const parts = LOCI.map((locus) => ({
      locus,
      copies: state.copies[locus.id] ?? 0,
    }));
    const phenotype = combinePhenotype(parts, cappuccinoMorph);
    const existing = merged.get(phenotype);
    if (existing) {
      existing.probability += state.probability;
    } else {
      merged.set(phenotype, {
        phenotype,
        probability: state.probability,
        copies: state.copies,
      });
    }

    for (const rule of COMBO_WARNINGS) {
      if (
        (cappuccinoMorph === "sable" || cappuccinoMorph === "highway") &&
        (rule.id === "superCappuccino" || rule.id === "lillyWhiteCappuccino")
      ) {
        continue;
      }
      if (!rule.match(state.copies)) continue;
      const current = warningTotals.get(rule.id);
      if (current) {
        current.probability += state.probability;
      } else {
        warningTotals.set(rule.id, {
          id: rule.id,
          severity: rule.severity,
          messageJa: rule.messageJa,
          probability: state.probability,
        });
      }
    }
  }

  const outcomes = [...merged.values()].sort(
    (a, b) => b.probability - a.probability,
  );
  const warnings = [...warningTotals.values()]
    .filter((warning) => warning.probability > EPS)
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "danger" ? -1 : 1;
      }
      return b.probability - a.probability;
    });

  return { outcomes, warnings };
}

export type PairingOptions = {
  visualA?: string[];
  visualB?: string[];
};

export function calculatePairing(
  parentA: Genotype,
  parentB: Genotype,
  options?: PairingOptions,
): PairingResult {
  const visualA = options?.visualA ?? [];
  const visualB = options?.visualB ?? [];
  const morph = cappuccinoMorphDisplay(parentA, parentB, visualA, visualB);
  const mergedA = resolveParentGenotype(parentA, visualA);
  const mergedB = resolveParentGenotype(parentB, visualB);

  const unrecognizedLocusIds = [
    ...new Set([
      ...unrecognizedIds(parentA),
      ...unrecognizedIds(parentB),
    ]),
  ];

  const loci = LOCI.map((locus) =>
    calculateLocus(
      locus.id,
      statusOf(mergedA, locus.id),
      statusOf(mergedB, locus.id),
    ),
  ).filter((row): row is LocusResult => row !== null);

  if (morph === "sable" || morph === "highway") {
    const morphJa = morph === "sable" ? "セーブル" : "ハイウェイ";
    for (const locus of loci) {
      if (locus.locusId === "cappuccino") {
        locus.nameJa = morphJa;
        locus.outcomes = locus.outcomes.map((outcome) => ({
          ...outcome,
          label: outcome.label.replaceAll("カプチーノ", morphJa),
        }));
      }
    }
  }

  const { outcomes, warnings } = expandPairing(loci, morph);

  return {
    loci,
    outcomes,
    warnings,
    unrecognizedLocusIds,
  };
}

export function emptyGenotype(): Genotype {
  return {};
}
