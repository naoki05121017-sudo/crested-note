import {
  TRAIT_CATEGORY_LABEL,
  VISUAL_TRAITS,
  getVisualTrait,
  listLoci,
  type GeneStatus,
  type Genotype,
} from "@/lib/genetics";
import { allelicVisualCoversLocus } from "@/lib/genetics/allelic-visual";
import type { LocusDefinition } from "@/lib/genetics/types";
import type { VisualTraitCategory } from "@/lib/genetics/visual-traits";

export const AXANTHIC_TRAIT_ID = "axanthic";

export const AXANTHIC_LOCI = [
  { id: "axanthicTug", lineJa: "TUG" },
  { id: "axanthicMelanistic", lineJa: "Melanistic" },
  { id: "axanthicArv", lineJa: "ARV" },
  { id: "axanthicLava", lineJa: "Lava" },
] as const;

export const AXANTHIC_LOCUS_IDS = AXANTHIC_LOCI.map((row) => row.id);

const AXANTHIC_SET = new Set<string>(AXANTHIC_LOCUS_IDS);

export type CalculatorTraitKind = "locus" | "axanthic" | "visual";

export type CalculatorPickerCategory =
  | "mendelian"
  | VisualTraitCategory;

export type CalculatorTraitOption = {
  id: string;
  label: string;
  kind: CalculatorTraitKind;
  category: CalculatorPickerCategory;
  locus?: LocusDefinition;
  alleleOf?: string;
  hint?: string;
  badge?: string;
  shortNote?: string;
  searchText: string;
};

export const PICKER_CATEGORY_ORDER: CalculatorPickerCategory[] = [
  "mendelian",
  "reference",
  "pattern",
  "feature",
];

export const PICKER_CATEGORY_LABEL: Record<CalculatorPickerCategory, string> = {
  mendelian: "遺伝計算",
  ...TRAIT_CATEGORY_LABEL,
};

export function calculatorTraitOptions(): CalculatorTraitOption[] {
  const options: CalculatorTraitOption[] = [];
  for (const locus of listLoci()) {
    if (AXANTHIC_SET.has(locus.id)) continue;
    options.push({
      id: locus.id,
      label: locus.nameJa,
      kind: "locus",
      category: "mendelian",
      locus,
      hint: locus.beginnerDescription,
      searchText: `${locus.nameJa} ${locus.nameEn} ${locus.id}`,
    });
  }
  options.push({
    id: AXANTHIC_TRAIT_ID,
    label: "アザンティック",
    kind: "axanthic",
    category: "mendelian",
    hint: "劣性です。系統は別の遺伝子として計算します。",
    searchText: "アザンティック Axanthic axanthic",
  });
  for (const trait of VISUAL_TRAITS) {
    options.push({
      id: trait.id,
      label: trait.nameJa,
      kind: "visual",
      category: trait.category,
      alleleOf: trait.alleleOf,
      hint: trait.beginnerDescription,
      badge: trait.badge
        ? trait.badge
        : trait.category === "reference"
          ? "参考"
          : trait.category === "feature"
            ? "特徴"
            : "見た目",
      shortNote: trait.shortNote,
      searchText: `${trait.nameJa} ${trait.nameEn} ${trait.id}`,
    });
  }
  return options;
}

export function traitLabel(id: string): string {
  return calculatorTraitOptions().find((row) => row.id === id)?.label ?? id;
}

export function visibleTraitsFromParent(
  genotype: Genotype,
  visualTags: string[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const locus of listLoci()) {
    const status = genotype[locus.id];
    if (!status || status === "wild") continue;
    if (allelicVisualCoversLocus(visualTags, locus.id)) continue;
    const id = AXANTHIC_SET.has(locus.id) ? AXANTHIC_TRAIT_ID : locus.id;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  for (const tag of visualTags) {
    if (seen.has(tag)) continue;
    if (!getVisualTrait(tag)) continue;
    seen.add(tag);
    ids.push(tag);
  }
  return ids;
}

export function axanthicFromGenotype(genotype: Genotype): {
  locusId: string;
  status: GeneStatus;
} {
  const active = AXANTHIC_LOCI.find((row) => {
    const status = genotype[row.id];
    return status && status !== "wild";
  });
  return {
    locusId: active?.id ?? AXANTHIC_LOCI[0].id,
    status: active ? (genotype[active.id] as GeneStatus) : "wild",
  };
}

export function setAxanthicGenotype(
  genotype: Genotype,
  fromLocusId: string,
  toLocusId: string,
  status: GeneStatus,
): Genotype {
  const next = { ...genotype };
  if (fromLocusId !== toLocusId) delete next[fromLocusId];
  if (status === "wild") delete next[toLocusId];
  else next[toLocusId] = status;
  return next;
}

export function clearTraitFromGenotype(genotype: Genotype, traitId: string): Genotype {
  const next = { ...genotype };
  if (traitId === AXANTHIC_TRAIT_ID) {
    for (const id of AXANTHIC_LOCUS_IDS) delete next[id];
    return next;
  }
  delete next[traitId];
  return next;
}
