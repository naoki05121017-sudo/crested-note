import { COMBO_WARNINGS, LOCI, getLocus } from "./catalog";
import {
  combinePhenotype,
  describeCopies,
  locusOutcomeLabel,
  phenotypeKeysFromState,
} from "./phenotype";
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
import {
  CSH_HEALTH_RISK,
  CSH_PHENOTYPE_JA,
  cshPunnett,
  cshToCopies,
  cshToGeneStatus,
  inferCshDiplotype,
  type CshDiplotype,
} from "./csh";
import { GENE_STATUSES } from "./types";
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
const SKIP_UNRECOGNIZED = new Set(["csh", "sable", "highway"]);

function asGeneStatus(value: string | undefined): GeneStatus {
  if (value && (GENE_STATUSES as readonly string[]).includes(value)) {
    return value as GeneStatus;
  }
  return "wild";
}

function statusOf(genotype: Genotype, locusId: string): GeneStatus {
  return asGeneStatus(genotype[locusId]);
}

function unrecognizedIds(genotype: Genotype): string[] {
  return Object.keys(genotype).filter((id) => {
    if (SKIP_UNRECOGNIZED.has(id)) return false;
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
  cappuccinoMorph: CappuccinoMorphDisplay,
): LocusResult | null {
  const locus = getLocus(locusId);
  if (!locus) return null;

  const distribution = offspringCopyDistribution(parentA, parentB);
  const outcomes = compactCopyDistribution(distribution).map((row) => {
    const described = describeCopies(locus, row.copies, cappuccinoMorph);
    return {
      copies: row.copies,
      probability: row.probability,
      kind: described.kind,
      label: locusOutcomeLabel(locus, row.copies, cappuccinoMorph),
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

function cshLocusName(parentA: CshDiplotype, parentB: CshDiplotype): string {
  const text = `${parentA} ${parentB}`;
  const sableOnly =
    text.includes("Sable") && !text.includes("Capp") && !text.includes("Highway");
  const highwayOnly =
    text.includes("Highway") && !text.includes("Capp") && !text.includes("Sable");
  if (sableOnly) return "セーブル";
  if (highwayOnly) return "ハイウェイ";
  return "カプチーノ / セーブル / ハイウェイ";
}

function calculateCshLocus(parentA: CshDiplotype, parentB: CshDiplotype): LocusResult {
  const locus = getLocus("cappuccino")!;
  return {
    locusId: "cappuccino",
    nameJa: cshLocusName(parentA, parentB),
    inheritance: "incomplete_dominant",
    parentA: cshToGeneStatus(parentA),
    parentB: cshToGeneStatus(parentB),
    outcomes: cshPunnett(parentA, parentB).map((row) => ({
      copies: cshToCopies(row.diplotype),
      probability: row.probability,
      kind: describeCopies(
        locus,
        cshToCopies(row.diplotype),
        "cappuccino",
        row.diplotype,
      ).kind,
      label: CSH_PHENOTYPE_JA[row.diplotype],
      diplotype: row.diplotype,
    })),
  };
}

type ExpandState = {
  probability: number;
  copies: Record<string, AlleleCopies>;
  csh: CshDiplotype;
};

function expandPairing(
  loci: LocusResult[],
  cappuccinoMorph: CappuccinoMorphDisplay,
): {
  outcomes: CombinedOutcome[];
  warnings: PairingWarning[];
} {
  const varying = loci.filter((locus) => {
    if (locus.locusId === "cappuccino" && locus.outcomes.some((row) => row.diplotype)) {
      return !(locus.outcomes.length === 1 && locus.outcomes[0]?.diplotype === "NN");
    }
    const wild = locus.outcomes.find((o) => o.copies === 0);
    return !(locus.outcomes.length === 1 && wild && wild.probability > 1 - EPS);
  });

  let states: ExpandState[] = [{ probability: 1, copies: {}, csh: "NN" }];

  for (const locus of varying) {
    const next: ExpandState[] = [];
    for (const state of states) {
      for (const outcome of locus.outcomes) {
        const probability = state.probability * outcome.probability;
        if (probability <= EPS) continue;
        next.push({
          probability,
          csh:
            locus.locusId === "cappuccino" && outcome.diplotype
              ? (outcome.diplotype as CshDiplotype)
              : state.csh,
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
    const phenotype = combinePhenotype(parts, cappuccinoMorph, state.csh);
    const keys = phenotypeKeysFromState(state.copies, state.csh);
    const existing = merged.get(phenotype);
    if (existing) {
      existing.probability += state.probability;
    } else {
      merged.set(phenotype, {
        phenotype,
        probability: state.probability,
        copies: state.copies,
        csh: state.csh === "NN" ? undefined : state.csh,
        visualKeys: keys.visualKeys,
        hetKeys: keys.hetKeys,
      });
    }
    addWarnings(state, warningTotals);
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

function addWarnings(state: ExpandState, warningTotals: Map<string, PairingWarning>) {
  const bump = (
    id: string,
    severity: PairingWarning["severity"],
    messageJa: string,
  ) => {
    const current = warningTotals.get(id);
    if (current) current.probability += state.probability;
    else {
      warningTotals.set(id, {
        id,
        severity,
        messageJa,
        probability: state.probability,
      });
    }
  };

  if (CSH_HEALTH_RISK.has(state.csh)) {
    const rule = COMBO_WARNINGS.find((row) => row.id === "superCappuccino");
    if (rule) bump(rule.id, rule.severity, rule.messageJa);
  }
  if (
    (state.copies.lillyWhite ?? 0) >= 1 &&
    (state.csh === "Capp/Capp" || state.csh === "Capp/Sable")
  ) {
    const rule = COMBO_WARNINGS.find((row) => row.id === "lillyWhiteCappuccino");
    if (rule) bump(rule.id, rule.severity, rule.messageJa);
  }
  if (state.copies.lillyWhite === 2) {
    const rule = COMBO_WARNINGS.find((row) => row.id === "superLillyWhite");
    if (rule) bump(rule.id, rule.severity, rule.messageJa);
  }
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
  const cshA = inferCshDiplotype(mergedA, visualA);
  const cshB = inferCshDiplotype(mergedB, visualB);

  const unrecognizedLocusIds = [
    ...new Set([...unrecognizedIds(parentA), ...unrecognizedIds(parentB)]),
  ];

  const copyLoci = LOCI.filter((locus) => locus.id !== "cappuccino")
    .map((locus) =>
      calculateLocus(
        locus.id,
        statusOf(mergedA, locus.id),
        statusOf(mergedB, locus.id),
        morph,
      ),
    )
    .filter((row): row is LocusResult => row !== null);

  const cappIndex = Math.max(
    0,
    LOCI.findIndex((locus) => locus.id === "cappuccino"),
  );
  const loci = [...copyLoci];
  loci.splice(cappIndex, 0, calculateCshLocus(cshA, cshB));

  const { outcomes, warnings } = expandPairing(loci, morph);

  return {
    loci,
    outcomes,
    warnings,
    unrecognizedLocusIds,
    cappuccinoMorph: morph,
  };
}

export function emptyGenotype(): Genotype {
  return {};
}
