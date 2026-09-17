export { calculatePairing, emptyGenotype } from "./calculate";
export {
  COMBO_WARNINGS,
  LOCI,
  LOCUS_BY_ID,
  POLYGENIC_TRAITS,
  TRAIT_CATEGORY_LABEL,
  VISUAL_TRAITS,
  getLocus,
  getVisualTrait,
  listLoci,
  listVisualTraitsByCategory,
  visualTraitName,
} from "./catalog";
export { formatCopiesAsGenotype } from "./display";
export { formatProbability, geneStatusLabelJa } from "./format";
export {
  combinePhenotype,
  copiesToStatus,
  describeCopies,
  formatGenotypeLabel,
  genotypeFromCopies,
  locusOutcomeLabel,
} from "./phenotype";
export {
  morphAllelePassProbability,
  offspringCopyDistribution,
} from "./punnett";
export type {
  AlleleCopies,
  CombinedOutcome,
  ComboWarningRule,
  GeneStatus,
  Genotype,
  Inheritance,
  LocusDefinition,
  LocusResult,
  PairingResult,
  PairingWarning,
  TraitConfidence,
} from "./types";
export { GENE_STATUSES } from "./types";
