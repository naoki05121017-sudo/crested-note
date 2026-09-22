import { getLocus, getLocusState, LOCI } from "./catalog";
import type { Genotype } from "./types";

const CAPP_LOCUS_ID = "cappuccino";

/** Legacy keys that were never their own locus but shared the cappuccino seat. */
const ALLELE_KEY_TO_SEAT: Readonly<Record<string, { locusId: string; allele: string }>> = {
  sable: { locusId: CAPP_LOCUS_ID, allele: "Sable" },
  highway: { locusId: CAPP_LOCUS_ID, allele: "Highway" },
  cappuccino: { locusId: CAPP_LOCUS_ID, allele: "Capp" },
};

const CAPP_SINGLE_BY_ALLELE: Readonly<Record<string, string>> = {
  Capp: "cappuccino",
  Sable: "sable",
  Highway: "highway",
};

const CAPP_SUPER_BY_ALLELE: Readonly<Record<string, string>> = {
  Capp: "superCappuccino",
  Sable: "superSable",
  Highway: "superHighway",
};

/**
 * Trait checkboxes that used to stand in for a calculable gene.
 * Each maps onto the state the tag actually meant.
 */
const TRAIT_TAG_TO_STATE: Readonly<
  Record<string, { locusId: string; stateId: string }>
> = {
  sable: { locusId: CAPP_LOCUS_ID, stateId: "sable" },
  highway: { locusId: CAPP_LOCUS_ID, stateId: "highway" },
  albino: { locusId: "albino", stateId: "visual" },
  chocho: { locusId: "chocho", stateId: "visual" },
  emptyBack: { locusId: "emptyBack", stateId: "het" },
  superStripe: { locusId: "superStripe", stateId: "visual" },
  redBase: { locusId: "redBase", stateId: "visual" },
};

export function traitTagLocusId(tag: string): string | undefined {
  return TRAIT_TAG_TO_STATE[tag]?.locusId;
}

export function isCalculableTraitTag(tag: string): boolean {
  return tag in TRAIT_TAG_TO_STATE;
}

function cappStateFromLegacyStatus(
  status: string,
  allele: string,
): string | undefined {
  if (status === "het") return CAPP_SINGLE_BY_ALLELE[allele];
  // Earlier versions modelled the seat as recessive, so `visual` meant two copies.
  if (status === "visual") return CAPP_SUPER_BY_ALLELE[allele];
  // A "possible het" is meaningless on a seat where one copy is already visual.
  return undefined;
}

export type NormalizedGenotype = {
  genotype: Genotype;
  unrecognizedLocusIds: string[];
};

/**
 * Canonical parent input.
 *
 * Accepts current state ids, states written by earlier versions, the old
 * `sable` / `highway` pseudo-loci, and trait checkboxes that stood in for a
 * calculable gene. Everything else is reported so the UI can say it is not
 * part of the maths.
 */
export function normalizeGenotype(
  raw: Genotype | undefined,
  traits: readonly string[] = [],
): NormalizedGenotype {
  const genotype: Genotype = {};
  const unrecognized: string[] = [];

  const entries = Object.entries(raw ?? {}).filter(
    ([, status]) => status && status !== "wild",
  );

  // Allele-specific legacy keys win over the generic cappuccino key.
  const ordered = [
    ...entries.filter(([key]) => key === "sable" || key === "highway"),
    ...entries.filter(([key]) => key !== "sable" && key !== "highway"),
  ];

  /**
   * Older records said "cappuccino" for the seat and named the actual allele
   * with a trait tag, so the tag decides which allele a bare status means.
   */
  const taggedAllele = traits.includes("sable")
    ? "Sable"
    : traits.includes("highway")
      ? "Highway"
      : undefined;

  for (const [key, rawStatus] of ordered) {
    const status = String(rawStatus);
    const seat = ALLELE_KEY_TO_SEAT[key];

    if (seat) {
      const locus = getLocus(seat.locusId);
      if (!locus) {
        unrecognized.push(key);
        continue;
      }
      if (genotype[locus.id]) continue;
      const direct = getLocusState(locus.id, status);
      const allele =
        key === "cappuccino" ? (taggedAllele ?? seat.allele) : seat.allele;
      const stateId = direct
        ? direct.id
        : cappStateFromLegacyStatus(status, allele);
      if (stateId && stateId !== "wild" && stateId !== "unknown") {
        genotype[locus.id] = stateId;
      }
      continue;
    }

    const locus = getLocus(key);
    if (!locus) {
      if (!unrecognized.includes(key)) unrecognized.push(key);
      continue;
    }
    if (genotype[locus.id]) continue;
    const state = getLocusState(locus.id, status);
    if (state && state.id !== "wild" && state.id !== "unknown") {
      genotype[locus.id] = state.id;
    }
  }

  for (const tag of traits) {
    const mapped = TRAIT_TAG_TO_STATE[tag];
    if (!mapped) continue;
    if (genotype[mapped.locusId]) continue;
    if (!getLocusState(mapped.locusId, mapped.stateId)) continue;
    genotype[mapped.locusId] = mapped.stateId;
  }

  return { genotype, unrecognizedLocusIds: unrecognized };
}

/** Same normalisation, dropping the diagnostics. */
export function resolveParentGenotype(
  raw: Genotype | undefined,
  traits: readonly string[] = [],
): Genotype {
  return normalizeGenotype(raw, traits).genotype;
}

/** Locus ids a parent actually carries, in catalog order. */
export function parentLocusIds(genotype: Genotype): string[] {
  const normalized = resolveParentGenotype(genotype);
  return LOCI.filter((locus) => normalized[locus.id]).map((locus) => locus.id);
}
