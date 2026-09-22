/**
 * Cappuccino / Sable / Highway — one incomplete-dominant locus, four alleles.
 * Source: https://crested-gecko-calc.pages.dev/ (calcOffspring / calcCappAllelic)
 */

export const CSH_DIPLOTYPES = [
  "NN",
  "N/Capp",
  "N/Sable",
  "N/Highway",
  "Capp/Capp",
  "Sable/Sable",
  "Highway/Highway",
  "Capp/Sable",
  "Capp/Highway",
  "Sable/Highway",
] as const;

export type CshDiplotype = (typeof CSH_DIPLOTYPES)[number];
export type CshAllele = "N" | "Capp" | "Sable" | "Highway";

export const CSH_PHENOTYPE_JA: Record<CshDiplotype, string> = {
  NN: "ノーマル",
  "N/Capp": "カプチーノ",
  "N/Sable": "セーブル",
  "N/Highway": "ハイウェイ",
  "Capp/Capp": "スーパーカプチーノ",
  "Sable/Sable": "スーパーセーブル",
  "Highway/Highway": "スーパーハイウェイ",
  "Capp/Sable": "ルアク",
  "Capp/Highway": "カプチーノ/ハイウェイ",
  "Sable/Highway": "セーブル/ハイウェイ",
};

export const CSH_VISUAL_KEY: Record<CshDiplotype, string | null> = {
  NN: null,
  "N/Capp": "capp",
  "N/Sable": "sable",
  "N/Highway": "highway",
  "Capp/Capp": "superCapp",
  "Sable/Sable": "superSable",
  "Highway/Highway": "superHighway",
  "Capp/Sable": "luwak",
  "Capp/Highway": "cappHighway",
  "Sable/Highway": "sableHighway",
};

export const CSH_HEALTH_RISK: ReadonlySet<CshDiplotype> = new Set([
  "Capp/Capp",
  "Highway/Highway",
  "Capp/Sable",
  "Capp/Highway",
]);

const GAMETES: Record<CshDiplotype, [CshAllele, CshAllele]> = {
  NN: ["N", "N"],
  "N/Capp": ["N", "Capp"],
  "N/Sable": ["N", "Sable"],
  "N/Highway": ["N", "Highway"],
  "Capp/Capp": ["Capp", "Capp"],
  "Sable/Sable": ["Sable", "Sable"],
  "Highway/Highway": ["Highway", "Highway"],
  "Capp/Sable": ["Capp", "Sable"],
  "Capp/Highway": ["Capp", "Highway"],
  "Sable/Highway": ["Sable", "Highway"],
};

export function isCshDiplotype(value: string | undefined): value is CshDiplotype {
  return Boolean(value && (CSH_DIPLOTYPES as readonly string[]).includes(value));
}

export function pairCshAlleles(a: CshAllele, b: CshAllele): CshDiplotype {
  if (a === "N" && b === "N") return "NN";
  if ((a === "N" && b === "Capp") || (a === "Capp" && b === "N")) return "N/Capp";
  if ((a === "N" && b === "Sable") || (a === "Sable" && b === "N")) return "N/Sable";
  if ((a === "N" && b === "Highway") || (a === "Highway" && b === "N")) {
    return "N/Highway";
  }
  if (a === "Capp" && b === "Capp") return "Capp/Capp";
  if (a === "Sable" && b === "Sable") return "Sable/Sable";
  if (a === "Highway" && b === "Highway") return "Highway/Highway";
  if ((a === "Capp" && b === "Sable") || (a === "Sable" && b === "Capp")) {
    return "Capp/Sable";
  }
  if ((a === "Capp" && b === "Highway") || (a === "Highway" && b === "Capp")) {
    return "Capp/Highway";
  }
  return "Sable/Highway";
}

export function cshPunnett(
  parentA: CshDiplotype,
  parentB: CshDiplotype,
): { diplotype: CshDiplotype; probability: number }[] {
  const a = GAMETES[parentA];
  const b = GAMETES[parentB];
  const counts = new Map<CshDiplotype, number>();
  for (const alleleA of a) {
    for (const alleleB of b) {
      const diplotype = pairCshAlleles(alleleA, alleleB);
      counts.set(diplotype, (counts.get(diplotype) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([diplotype, count]) => ({ diplotype, probability: count / 4 }))
    .sort((left, right) => right.probability - left.probability);
}

export function defaultCshForTrait(traitId: string): CshDiplotype {
  if (traitId === "sable") return "N/Sable";
  if (traitId === "highway") return "N/Highway";
  if (traitId === "cappuccino") return "N/Capp";
  return "NN";
}

export function cshToCopies(diplotype: CshDiplotype): 0 | 1 | 2 {
  if (diplotype === "NN") return 0;
  if (diplotype.startsWith("N/")) return 1;
  return 2;
}

export function cshToGeneStatus(diplotype: CshDiplotype): GeneStatusLike {
  if (diplotype === "NN") return "wild";
  if (diplotype.startsWith("N/")) return "het";
  return "visual";
}

type GeneStatusLike = "wild" | "het" | "visual";

function hasTag(tags: Iterable<string>, id: string): boolean {
  for (const tag of tags) {
    if (tag === id) return true;
  }
  return false;
}

/**
 * Infer the CSH diplotype from visual tags and the cappuccino seat.
 * Stored `csh` is ignored so a leftover value cannot leak sable onto the other parent.
 */
export function inferCshDiplotype(
  genotype: { csh?: string; cappuccino?: string; sable?: string; highway?: string } & Record<
    string,
    string | undefined
  >,
  visualTags: string[] = [],
): CshDiplotype {
  const tags = [
    ...visualTags,
    ...Object.keys(genotype).filter((key) => {
      if (key === "csh") return false;
      return Boolean(genotype[key] && genotype[key] !== "wild");
    }),
  ];
  const sable = hasTag(tags, "sable");
  const highway = hasTag(tags, "highway");
  const capStatus = genotype.cappuccino;
  const twoCopies = capStatus === "visual";
  const hasCappSeat = Boolean(capStatus && capStatus !== "wild");

  if (sable && highway) return "Sable/Highway";
  if (sable && visualTags.includes("cappuccino")) return "Capp/Sable";
  if (highway && visualTags.includes("cappuccino")) return "Capp/Highway";
  if (sable) return twoCopies ? "Sable/Sable" : "N/Sable";
  if (highway) return twoCopies ? "Highway/Highway" : "N/Highway";
  if (hasCappSeat) return twoCopies ? "Capp/Capp" : "N/Capp";
  return "NN";
}
