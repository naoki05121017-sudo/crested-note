import type {
  GenotypeRisk,
  LocusDefinition,
  LocusGenotypeDefinition,
  LocusStateDefinition,
  TraitConfidence,
} from "./types";

/** Certain states reuse the genotype id, so a child genotype is a valid parent. */
function certain(genotypeId: string, labelJa: string): LocusStateDefinition {
  return { id: genotypeId, labelJa, mixture: [{ genotypeId, weight: 1 }] };
}

function possible(
  id: string,
  labelJa: string,
  hetWeight: number,
): LocusStateDefinition {
  return {
    id,
    labelJa,
    mixture: [
      { genotypeId: "het", weight: hetWeight },
      { genotypeId: "wild", weight: 1 - hetWeight },
    ],
  };
}

const UNKNOWN_STATE: LocusStateDefinition = {
  id: "unknown",
  labelJa: "不明（なしとして計算）",
  mixture: [{ genotypeId: "wild", weight: 1 }],
  hidden: true,
};

type SharedLocusInput = {
  id: string;
  nameJa: string;
  nameEn: string;
  phenotypeOrder: number;
  confidence?: TraitConfidence;
  notesJa?: string;
  beginnerDescription?: string;
};

export type RecessiveLocusInput = SharedLocusInput & {
  /** Defaults to nameJa. */
  visualNameJa?: string;
  visualNameEn?: string;
};

/**
 * Classic recessive: AA normal, Aa carrier, aa visual.
 * State ids stay `wild` / `het` / `visual` / `possible_50` / `possible_66`
 * so records written by earlier versions keep their meaning.
 */
export function recessiveLocus(input: RecessiveLocusInput): LocusDefinition {
  const visualNameJa = input.visualNameJa ?? input.nameJa;
  const visualNameEn = input.visualNameEn ?? input.nameEn;
  const genotypes: LocusGenotypeDefinition[] = [
    {
      id: "wild",
      alleles: ["A", "A"] as const,
      nameJa: "ノーマル",
      nameEn: "Normal",
      notation: "AA",
      wild: true,
      carrier: false,
    },
    {
      id: "het",
      alleles: ["A", "a"] as const,
      nameJa: `ヘテロ ${input.nameJa}`,
      nameEn: `Het ${input.nameEn}`,
      notation: "Aa",
      wild: false,
      carrier: true,
    },
    {
      id: "visual",
      alleles: ["a", "a"] as const,
      nameJa: visualNameJa,
      nameEn: visualNameEn,
      notation: "aa",
      wild: false,
      carrier: false,
    },
  ];

  return {
    id: input.id,
    nameJa: input.nameJa,
    nameEn: input.nameEn,
    inheritance: "recessive",
    alleles: [
      { id: "A", nameJa: "ノーマル", nameEn: "Wild type" },
      { id: "a", nameJa: input.nameJa, nameEn: input.nameEn },
    ],
    genotypes,
    states: [
      certain("wild", "ノーマル（遺伝子なし）"),
      certain("het", `ヘテロ ${input.nameJa}（保因者）`),
      certain("visual", `${visualNameJa}（ビジュアル）`),
      possible("possible_50", `50%ヘテロ ${input.nameJa}`, 0.5),
      possible("possible_66", `66%ヘテロ ${input.nameJa}`, 2 / 3),
      UNKNOWN_STATE,
    ],
    phenotypeOrder: input.phenotypeOrder,
    confidence: input.confidence,
    notesJa: input.notesJa,
    beginnerDescription: input.beginnerDescription,
    pickerEntries: [
      { id: input.id, labelJa: input.nameJa, stateId: "het" },
    ],
  };
}

export type IncompleteDominantLocusInput = SharedLocusInput & {
  /** Allele symbol used in notation, e.g. LW. */
  alleleSymbol: string;
  visualNameJa: string;
  visualNameEn: string;
  superNameJa: string;
  superNameEn: string;
  superRisk?: GenotypeRisk;
};

/**
 * Two-allele incomplete dominant: one copy is visual, two copies are the super
 * form. State ids stay `wild` / `het` / `visual`, where `visual` means the
 * two-copy super form, matching what earlier versions stored.
 */
export function incompleteDominantLocus(
  input: IncompleteDominantLocusInput,
): LocusDefinition {
  const symbol = input.alleleSymbol;
  const genotypes: LocusGenotypeDefinition[] = [
    {
      id: "wild",
      alleles: ["N", "N"] as const,
      nameJa: "ノーマル",
      nameEn: "Normal",
      notation: "NN",
      wild: true,
      carrier: false,
    },
    {
      id: "het",
      alleles: ["N", symbol] as const,
      nameJa: input.visualNameJa,
      nameEn: input.visualNameEn,
      notation: `N${symbol}`,
      wild: false,
      carrier: false,
    },
    {
      id: "visual",
      alleles: [symbol, symbol] as const,
      nameJa: input.superNameJa,
      nameEn: input.superNameEn,
      notation: `${symbol}${symbol}`,
      wild: false,
      carrier: false,
      risk: input.superRisk,
    },
  ];

  return {
    id: input.id,
    nameJa: input.nameJa,
    nameEn: input.nameEn,
    inheritance: "incomplete_dominant",
    alleles: [
      { id: "N", nameJa: "ノーマル", nameEn: "Wild type" },
      { id: symbol, nameJa: input.visualNameJa, nameEn: input.visualNameEn },
    ],
    genotypes,
    states: [
      certain("wild", "ノーマル（遺伝子なし）"),
      certain("het", `${input.visualNameJa}（1コピー）`),
      certain("visual", `${input.superNameJa}（2コピー）`),
      UNKNOWN_STATE,
    ],
    phenotypeOrder: input.phenotypeOrder,
    confidence: input.confidence,
    notesJa: input.notesJa,
    beginnerDescription: input.beginnerDescription,
    pickerEntries: [
      { id: input.id, labelJa: input.visualNameJa, stateId: "het" },
    ],
  };
}

export type AllelicSeriesLocusInput = SharedLocusInput & {
  alleles: readonly {
    id: string;
    nameJa: string;
    nameEn: string;
    /** Genotype id for the single-copy visual, e.g. sable. */
    singleId: string;
    /** Genotype id for the homozygous super, e.g. superSable. */
    superId: string;
    superNameJa: string;
    superNameEn: string;
    superRisk?: GenotypeRisk;
    shortNoteJa?: string;
  }[];
  /** Names for compound heterozygotes, keyed by "alleleA+alleleB". */
  compounds: readonly {
    id: string;
    pair: readonly [string, string];
    nameJa: string;
    nameEn: string;
    risk?: GenotypeRisk;
  }[];
};

/**
 * Three or more alleles sharing one seat. Every non-wild allele is visual in a
 * single copy, so nothing here can ever be reported as a het carrier.
 */
export function allelicSeriesLocus(
  input: AllelicSeriesLocusInput,
): LocusDefinition {
  const genotypes: LocusGenotypeDefinition[] = [
    {
      id: "wild",
      alleles: ["N", "N"] as const,
      nameJa: "ノーマル",
      nameEn: "Normal",
      notation: "NN",
      wild: true,
      carrier: false,
    },
  ];

  for (const allele of input.alleles) {
    genotypes.push({
      id: allele.singleId,
      alleles: ["N", allele.id] as const,
      nameJa: allele.nameJa,
      nameEn: allele.nameEn,
      notation: `N/${allele.id}`,
      wild: false,
      carrier: false,
    });
  }

  for (const allele of input.alleles) {
    genotypes.push({
      id: allele.superId,
      alleles: [allele.id, allele.id] as const,
      nameJa: allele.superNameJa,
      nameEn: allele.superNameEn,
      notation: `${allele.id}/${allele.id}`,
      wild: false,
      carrier: false,
      risk: allele.superRisk,
    });
  }

  for (const compound of input.compounds) {
    genotypes.push({
      id: compound.id,
      alleles: [compound.pair[0], compound.pair[1]] as const,
      nameJa: compound.nameJa,
      nameEn: compound.nameEn,
      notation: `${compound.pair[0]}/${compound.pair[1]}`,
      wild: false,
      carrier: false,
      risk: compound.risk,
    });
  }

  return {
    id: input.id,
    nameJa: input.nameJa,
    nameEn: input.nameEn,
    inheritance: "allelic_series",
    alleles: [
      { id: "N", nameJa: "ノーマル", nameEn: "Wild type" },
      ...input.alleles.map((allele) => ({
        id: allele.id,
        nameJa: allele.nameJa,
        nameEn: allele.nameEn,
      })),
    ],
    genotypes,
    states: [
      certain("wild", "ノーマル（遺伝子なし）"),
      ...genotypes
        .filter((genotype) => !genotype.wild)
        .map((genotype) => certain(genotype.id, genotype.nameJa)),
      UNKNOWN_STATE,
    ],
    phenotypeOrder: input.phenotypeOrder,
    confidence: input.confidence,
    notesJa: input.notesJa,
    beginnerDescription: input.beginnerDescription,
    pickerEntries: input.alleles.map((allele) => ({
      id: allele.singleId,
      labelJa: allele.nameJa,
      stateId: allele.singleId,
      shortNoteJa: allele.shortNoteJa,
    })),
  };
}
