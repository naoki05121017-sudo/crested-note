import {
  TRAIT_CATEGORY_LABEL,
  VISUAL_TRAITS,
  getLocus,
  getLocusState,
  getVisualTrait,
  listLoci,
  selectableStates,
  type Genotype,
  type LocusDefinition,
} from "@/lib/genetics";
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

export type CalculatorPickerCategory = "mendelian" | VisualTraitCategory;

export type CalculatorTraitOption = {
  /** Picker entry id. Locus aliases such as セーブル keep their own id. */
  id: string;
  label: string;
  kind: CalculatorTraitKind;
  category: CalculatorPickerCategory;
  locus?: LocusDefinition;
  /** State applied when the entry is picked. */
  defaultStateId?: string;
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

/** The row id a picker entry manages: a locus id, `axanthic`, or a trait id. */
export function rowIdForOption(option: CalculatorTraitOption): string {
  if (option.kind === "axanthic") return AXANTHIC_TRAIT_ID;
  if (option.kind === "locus" && option.locus) return option.locus.id;
  return option.id;
}

export function calculatorTraitOptions(): CalculatorTraitOption[] {
  const options: CalculatorTraitOption[] = [];

  for (const locus of listLoci()) {
    if (AXANTHIC_SET.has(locus.id)) continue;
    const entries = locus.pickerEntries ?? [
      { id: locus.id, labelJa: locus.nameJa, stateId: "het" },
    ];
    for (const entry of entries) {
      options.push({
        id: entry.id,
        label: entry.labelJa,
        kind: "locus",
        category: "mendelian",
        locus,
        defaultStateId: entry.stateId,
        hint: locus.beginnerDescription,
        shortNote: entry.shortNoteJa,
        searchText: `${entry.labelJa} ${locus.nameJa} ${locus.nameEn} ${locus.id} ${entry.id}`,
      });
    }
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
  const option = calculatorTraitOptions().find((row) => row.id === id);
  if (option) return option.label;
  if (id === AXANTHIC_TRAIT_ID) return "アザンティック";
  return getLocus(id)?.nameJa ?? getVisualTrait(id)?.nameJa ?? id;
}

/** Rows to show for a parent: one per active locus, plus polygenic tags. */
export function visibleTraitsFromParent(
  genotype: Genotype,
  traits: readonly string[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const locus of listLoci()) {
    const stateId = genotype[locus.id];
    if (!stateId || stateId === "wild") continue;
    const id = AXANTHIC_SET.has(locus.id) ? AXANTHIC_TRAIT_ID : locus.id;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  for (const tag of traits) {
    if (seen.has(tag)) continue;
    if (!getVisualTrait(tag)) continue;
    seen.add(tag);
    ids.push(tag);
  }

  return ids;
}

export function axanthicFromGenotype(genotype: Genotype): {
  locusId: string;
  stateId: string;
} {
  const active = AXANTHIC_LOCI.find((row) => {
    const stateId = genotype[row.id];
    return stateId && stateId !== "wild";
  });
  return {
    locusId: active?.id ?? AXANTHIC_LOCI[0].id,
    stateId: active ? (genotype[active.id] as string) : "wild",
  };
}

export function setAxanthicGenotype(
  genotype: Genotype,
  fromLocusId: string,
  toLocusId: string,
  stateId: string,
): Genotype {
  const next = { ...genotype };
  if (fromLocusId !== toLocusId) delete next[fromLocusId];
  if (stateId === "wild") delete next[toLocusId];
  else next[toLocusId] = stateId;
  return next;
}

export function clearTraitFromGenotype(
  genotype: Genotype,
  rowId: string,
): Genotype {
  const next = { ...genotype };
  if (rowId === AXANTHIC_TRAIT_ID) {
    for (const id of AXANTHIC_LOCUS_IDS) delete next[id];
    return next;
  }
  delete next[rowId];
  return next;
}

/** Select options for one locus row, honouring the catalog order. */
export function locusStateOptions(locus: LocusDefinition) {
  return selectableStates(locus).map((state) => ({
    value: state.id,
    label: state.labelJa,
  }));
}

export function isValidLocusState(locusId: string, stateId: string): boolean {
  return Boolean(getLocusState(locusId, stateId));
}
