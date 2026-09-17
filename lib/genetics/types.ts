export const GENE_STATUSES = [
  "wild",
  "het",
  "visual",
  "possible_50",
  "possible_66",
  "unknown",
] as const;

export type GeneStatus = (typeof GENE_STATUSES)[number];

export type Inheritance = "recessive" | "incomplete_dominant";

export type TraitConfidence =
  | "CONFIRMED"
  | "ESTABLISHED"
  | "PARTIALLY_ESTABLISHED"
  | "UNCERTAIN"
  | "POLYGENIC"
  | "REFERENCE_ONLY";

export type AlleleCopies = 0 | 1 | 2;

export type WarningSeverity = "caution" | "danger";

export type LocusDefinition = {
  id: string;
  nameJa: string;
  nameEn: string;
  inheritance: Inheritance;
  /** Homozygous recessive visual, or incomplete-dominant single copy. */
  visualNameJa: string;
  /** Incomplete-dominant two copies (e.g. Super Lilly White). */
  superNameJa?: string;
  notesJa?: string;
  beginnerDescription?: string;
  confidence?: TraitConfidence;
  /** Shared seat for allelic series (e.g. cappuccino / sable / highway). */
  alleleGroup?: string;
};

export type ComboWarningRule = {
  id: string;
  severity: WarningSeverity;
  messageJa: string;
  match: (copies: Record<string, AlleleCopies>) => boolean;
};

/** Locus id → status. Omitted keys are treated as wild. */
export type Genotype = Partial<Record<string, GeneStatus>>;

export type ZygosityKind = "wild" | "het" | "visual" | "super";

export type LocusCopyOutcome = {
  copies: AlleleCopies;
  probability: number;
  kind: ZygosityKind;
  label: string;
};

export type LocusResult = {
  locusId: string;
  nameJa: string;
  inheritance: Inheritance;
  parentA: GeneStatus;
  parentB: GeneStatus;
  outcomes: LocusCopyOutcome[];
};

export type CombinedOutcome = {
  phenotype: string;
  probability: number;
  copies: Record<string, AlleleCopies>;
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
