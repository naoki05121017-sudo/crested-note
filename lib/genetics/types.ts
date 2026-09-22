/**
 * Allele-based genetics model.
 *
 * Every calculable morph lives on a locus that owns an explicit allele list and
 * an explicit list of allele pairs (genotypes). Nothing in the pipeline counts
 * "copies" of a single morph allele, so allelic series such as
 * Cappuccino / Sable / Highway are first-class instead of string rewrites.
 *
 * Pipeline: locus state → genotype mixture → gametes → offspring genotype →
 * phenotype → probability aggregation → UI.
 */

export type AlleleId = string;

export type Inheritance =
  | "recessive"
  | "incomplete_dominant"
  /** Three or more alleles on one seat, each visual in a single copy. */
  | "allelic_series";

export type TraitConfidence =
  | "CONFIRMED"
  | "ESTABLISHED"
  | "PARTIALLY_ESTABLISHED"
  | "UNCERTAIN"
  | "POLYGENIC"
  | "REFERENCE_ONLY";

export type WarningSeverity = "caution" | "danger";

export type AlleleDefinition = {
  id: AlleleId;
  nameJa: string;
  nameEn: string;
};

export type GenotypeRisk = {
  id: string;
  severity: WarningSeverity;
  messageJa: string;
};

/** One unordered allele pair on a locus. */
export type LocusGenotypeDefinition = {
  /** Stable id, also usable as a certain parent state id. */
  id: string;
  alleles: readonly [AlleleId, AlleleId];
  /** Phenotype name for this pair, e.g. セーブル / スーパーリリーホワイト. */
  nameJa: string;
  nameEn: string;
  /** Breeder notation shown in the detail table, e.g. N/Sable, Aa. */
  notation: string;
  /** Homozygous wild type. */
  wild: boolean;
  /** Looks wild type but carries a morph allele (recessive het). */
  carrier: boolean;
  risk?: GenotypeRisk;
};

/**
 * What a keeper can record for one parent. Certain states map 1:1 onto a
 * genotype; possible hets are a weighted mixture of genotypes.
 */
export type LocusStateDefinition = {
  id: string;
  labelJa: string;
  mixture: readonly { genotypeId: string; weight: number }[];
  /** Kept for stored data but not offered in pickers. */
  hidden?: boolean;
};

/** Shortcut shown in the calculator picker, e.g. セーブル on the capp seat. */
export type LocusPickerEntry = {
  id: string;
  labelJa: string;
  stateId: string;
  /** Basic morphs are pinned to the top of the picker. */
  shortNoteJa?: string;
};

export type LocusDefinition = {
  id: string;
  nameJa: string;
  nameEn: string;
  inheritance: Inheritance;
  /** Index 0 is always the wild-type allele. */
  alleles: readonly AlleleDefinition[];
  genotypes: readonly LocusGenotypeDefinition[];
  states: readonly LocusStateDefinition[];
  /** Ascending sort key for phenotype tokens. */
  phenotypeOrder: number;
  confidence?: TraitConfidence;
  notesJa?: string;
  beginnerDescription?: string;
  pickerEntries?: readonly LocusPickerEntry[];
};

/** locus id → state id. Omitted loci are wild type. */
export type Genotype = Partial<Record<string, string>>;

/** locus id → genotype id. Every locus is certain. */
export type OffspringGenotype = Partial<Record<string, string>>;

/** Renames a set of genotypes to one community name, e.g. フラペチーノ. */
export type ComboNameRule = {
  id: string;
  /** locus id → genotype id; all entries must match. */
  match: Record<string, string>;
  nameJa: string;
};

export type LocusOutcome = {
  genotypeId: string;
  /** Per-locus label shown in the breakdown, e.g. ヘテロ ファントム. */
  label: string;
  nameJa: string;
  notation: string;
  wild: boolean;
  carrier: boolean;
  probability: number;
};

export type LocusResult = {
  locusId: string;
  nameJa: string;
  inheritance: Inheritance;
  parentA: string;
  parentB: string;
  parentALabel: string;
  parentBLabel: string;
  outcomes: LocusOutcome[];
};

export type CombinedOutcome = {
  phenotype: string;
  probability: number;
  /** The genotype this row was named from; also storable as a parent. */
  genotype: OffspringGenotype;
  /** Detail line built from the same genotype, never a second derivation. */
  detail: string;
};

export type PairingWarning = {
  id: string;
  severity: WarningSeverity;
  messageJa: string;
  probability: number;
};

export type PairingResult = {
  loci: LocusResult[];
  outcomes: CombinedOutcome[];
  warnings: PairingWarning[];
  unrecognizedLocusIds: string[];
};
