import { COMBO_NAMES, getLocus, getLocusGenotype, getLocusState, LOCI } from "./catalog";
import { resolveParentGenotype } from "./normalize";
import type {
  Genotype,
  LocusDefinition,
  LocusGenotypeDefinition,
  OffspringGenotype,
} from "./types";

export const NORMAL_PHENOTYPE = "ノーマル";

type Expressed = {
  locus: LocusDefinition;
  genotype: LocusGenotypeDefinition;
};

function orderedLoci(): LocusDefinition[] {
  return [...LOCI].sort((a, b) => a.phenotypeOrder - b.phenotypeOrder);
}

/** Loci that express something, in phenotype order. Wild loci are dropped. */
function expressedLoci(genotype: OffspringGenotype): Expressed[] {
  const rows: Expressed[] = [];
  for (const locus of orderedLoci()) {
    const genotypeId = genotype[locus.id];
    if (!genotypeId) continue;
    const definition = getLocusGenotype(locus.id, genotypeId);
    if (!definition || definition.wild) continue;
    rows.push({ locus, genotype: definition });
  }
  return rows;
}

/**
 * Per-locus display name. Recessive carriers read as ヘテロ ○○;
 * everything else reads as the genotype's own name, so a single-copy
 * allelic morph such as セーブル is never labelled as a het.
 */
export function locusGenotypeLabel(
  locusId: string,
  genotypeId: string,
): string {
  const definition = getLocusGenotype(locusId, genotypeId);
  if (!definition) return NORMAL_PHENOTYPE;
  return definition.nameJa;
}

type TokenSet = {
  visual: { order: number; text: string }[];
  het: { order: number; text: string }[];
};

function tokensFor(rows: Expressed[]): TokenSet {
  const consumed = new Set<string>();
  const visual: { order: number; text: string }[] = [];

  for (const rule of COMBO_NAMES) {
    const matched = Object.entries(rule.match).every(([locusId, genotypeId]) =>
      rows.some(
        (row) =>
          row.locus.id === locusId &&
          row.genotype.id === genotypeId &&
          !consumed.has(locusId),
      ),
    );
    if (!matched) continue;
    const orders = Object.keys(rule.match)
      .map((locusId) => getLocus(locusId)?.phenotypeOrder ?? 0)
      .sort((a, b) => a - b);
    for (const locusId of Object.keys(rule.match)) consumed.add(locusId);
    visual.push({ order: orders[0] ?? 0, text: rule.nameJa });
  }

  const het: { order: number; text: string }[] = [];
  for (const row of rows) {
    if (consumed.has(row.locus.id)) continue;
    if (row.genotype.carrier) {
      het.push({ order: row.locus.phenotypeOrder, text: row.locus.nameJa });
    } else {
      visual.push({ order: row.locus.phenotypeOrder, text: row.genotype.nameJa });
    }
  }

  visual.sort((a, b) => a.order - b.order);
  het.sort((a, b) => a.order - b.order);
  return { visual, het };
}

function assemble(
  visual: string[],
  het: string[],
  possible: string[] = [],
): string {
  const parts: string[] = [];
  if (visual.length > 0) parts.push(visual.join("・"));
  if (het.length > 0) parts.push(`ヘテロ ${het.join("・")}`);
  parts.push(...possible);
  if (parts.length === 0) return NORMAL_PHENOTYPE;
  return parts.join(" ");
}

/** Offspring genotype → the one name used by every part of the UI. */
export function phenotypeName(genotype: OffspringGenotype): string {
  const { visual, het } = tokensFor(expressedLoci(genotype));
  return assemble(
    visual.map((row) => row.text),
    het.map((row) => row.text),
  );
}

/** Visible morphs only; carriers are ignored. Used for cohort matching. */
export function visualPhenotypeName(genotype: OffspringGenotype): string {
  const rows = expressedLoci(genotype).filter((row) => !row.genotype.carrier);
  const { visual } = tokensFor(rows);
  return assemble(visual.map((row) => row.text), []);
}

/**
 * Parent-facing label. Same naming pipeline as offspring, plus possible hets,
 * which have no single genotype and so cannot be a phenotype on their own.
 */
export function formatGenotypeLabel(raw: Genotype): string {
  const genotype = resolveParentGenotype(raw);
  const certain: OffspringGenotype = {};
  const possible: { order: number; text: string }[] = [];

  for (const locus of orderedLoci()) {
    const stateId = genotype[locus.id];
    if (!stateId) continue;
    const state = getLocusState(locus.id, stateId);
    if (!state) continue;
    if (getLocusGenotype(locus.id, state.id)) {
      certain[locus.id] = state.id;
      continue;
    }
    possible.push({ order: locus.phenotypeOrder, text: state.labelJa });
  }

  const { visual, het } = tokensFor(expressedLoci(certain));
  possible.sort((a, b) => a.order - b.order);
  return assemble(
    visual.map((row) => row.text),
    het.map((row) => row.text),
    possible.map((row) => row.text),
  );
}
