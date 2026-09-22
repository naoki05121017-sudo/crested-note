import {
  getLocusGenotype,
  getLocusState,
  LOCI,
  wildGenotype,
} from "./catalog";
import { formatGenotypeDetail } from "./display";
import { normalizeGenotype } from "./normalize";
import { offspringGenotypeDistribution } from "./punnett";
import { locusGenotypeLabel, phenotypeName } from "./phenotype";
import type {
  CombinedOutcome,
  Genotype,
  LocusResult,
  OffspringGenotype,
  PairingResult,
  PairingWarning,
} from "./types";

const EPS = 1e-12;

export type PairingOptions = {
  /** Trait checkboxes recorded on parent A, e.g. legacy `sable`. */
  traitsA?: readonly string[];
  traitsB?: readonly string[];
};

function stateLabel(locusId: string, stateId: string): string {
  return getLocusState(locusId, stateId)?.labelJa ?? stateId;
}

function calculateLocus(
  locusId: string,
  stateA: string,
  stateB: string,
): LocusResult | null {
  const locus = LOCI.find((row) => row.id === locusId);
  if (!locus) return null;

  const distribution = offspringGenotypeDistribution(locus, stateA, stateB);
  const outcomes = distribution.map((row) => {
    const definition =
      getLocusGenotype(locus.id, row.genotypeId) ?? wildGenotype(locus);
    return {
      genotypeId: definition.id,
      label: locusGenotypeLabel(locus.id, definition.id),
      nameJa: definition.nameJa,
      notation: definition.notation,
      wild: definition.wild,
      carrier: definition.carrier,
      probability: row.probability,
    };
  });

  return {
    locusId: locus.id,
    nameJa: locus.nameJa,
    inheritance: locus.inheritance,
    parentA: stateA,
    parentB: stateB,
    parentALabel: stateLabel(locus.id, stateA),
    parentBLabel: stateLabel(locus.id, stateB),
    outcomes,
  };
}

type ExpandState = {
  probability: number;
  genotype: OffspringGenotype;
};

/**
 * Cartesian product over the loci that can vary, then one merge by phenotype.
 * The detail line and the warning totals come from the same rows, so the
 * summary list and the detail table can never disagree.
 */
function expandPairing(loci: LocusResult[]): {
  outcomes: CombinedOutcome[];
  warnings: PairingWarning[];
} {
  const varying = loci.filter((locus) => {
    const onlyWild =
      locus.outcomes.length === 1 && locus.outcomes[0]?.wild === true;
    return !onlyWild && locus.outcomes.length > 0;
  });

  let states: ExpandState[] = [{ probability: 1, genotype: {} }];

  for (const locus of varying) {
    const next: ExpandState[] = [];
    for (const state of states) {
      for (const outcome of locus.outcomes) {
        const probability = state.probability * outcome.probability;
        if (probability <= EPS) continue;
        next.push({
          probability,
          genotype: outcome.wild
            ? state.genotype
            : { ...state.genotype, [locus.locusId]: outcome.genotypeId },
        });
      }
    }
    states = next;
  }

  const merged = new Map<string, CombinedOutcome>();
  const warningTotals = new Map<string, PairingWarning>();

  for (const state of states) {
    const phenotype = phenotypeName(state.genotype);
    const existing = merged.get(phenotype);
    if (existing) {
      existing.probability += state.probability;
    } else {
      merged.set(phenotype, {
        phenotype,
        probability: state.probability,
        genotype: state.genotype,
        detail: formatGenotypeDetail(state.genotype),
      });
    }

    for (const [locusId, genotypeId] of Object.entries(state.genotype)) {
      const risk = getLocusGenotype(locusId, genotypeId ?? "")?.risk;
      if (!risk) continue;
      const current = warningTotals.get(risk.id);
      if (current) {
        current.probability += state.probability;
      } else {
        warningTotals.set(risk.id, { ...risk, probability: state.probability });
      }
    }
  }

  const outcomes = [...merged.values()]
    .filter((row) => row.probability > EPS)
    .sort((a, b) => b.probability - a.probability);

  const warnings = [...warningTotals.values()]
    .filter((warning) => warning.probability > EPS)
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "danger" ? -1 : 1;
      return b.probability - a.probability;
    });

  return { outcomes, warnings };
}

export function calculatePairing(
  parentA: Genotype,
  parentB: Genotype,
  options?: PairingOptions,
): PairingResult {
  const a = normalizeGenotype(parentA, options?.traitsA ?? []);
  const b = normalizeGenotype(parentB, options?.traitsB ?? []);

  const unrecognizedLocusIds = [
    ...new Set([...a.unrecognizedLocusIds, ...b.unrecognizedLocusIds]),
  ];

  const loci = LOCI.map((locus) =>
    calculateLocus(
      locus.id,
      a.genotype[locus.id] ?? "wild",
      b.genotype[locus.id] ?? "wild",
    ),
  ).filter((row): row is LocusResult => row !== null);

  const { outcomes, warnings } = expandPairing(loci);

  return { loci, outcomes, warnings, unrecognizedLocusIds };
}

export function emptyGenotype(): Genotype {
  return {};
}
