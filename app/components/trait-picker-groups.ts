import type { CalculatorTraitOption } from "@/app/components/calculator-traits";

export type TraitPickerGroup = "basic" | "other";

export type OtherSection = "genetic" | "pattern" | "special";

export const TRAIT_PICKER_GROUP_ORDER: TraitPickerGroup[] = ["basic", "other"];

export const TRAIT_PICKER_GROUP_LABEL: Record<TraitPickerGroup, string> = {
  basic: "よく使うモルフ",
  other: "その他のモルフ・形質",
};

export const OTHER_SECTION_ORDER: OtherSection[] = ["genetic", "pattern", "special"];

export const OTHER_SECTION_LABEL: Record<OtherSection, string> = {
  genetic: "遺伝モルフ",
  pattern: "見た目／ライン",
  special: "特殊・研究中",
};

/** Always-visible calculator morphs. Display order only — does not change genetics. */
const BASIC_IDS = [
  "lillyWhite",
  "sable",
  "cappuccino",
  "phantom",
  "axanthic",
  "patternless",
  "pinstripe",
  "dalmatian",
  "harlequin",
  "flame",
  "tiger",
  "whiteWall",
] as const;

const BASIC_SET = new Set<string>(BASIC_IDS);

export function pickerGroupFor(option: CalculatorTraitOption): TraitPickerGroup {
  return BASIC_SET.has(option.id) ? "basic" : "other";
}

export function otherSectionFor(option: CalculatorTraitOption): OtherSection {
  if (option.kind === "locus" || option.kind === "axanthic") return "genetic";
  if (option.alleleOf) return "genetic";
  if (option.category === "pattern") return "pattern";
  return "special";
}

export function traitMatchesQuery(option: CalculatorTraitOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (option.searchText ?? option.label).toLowerCase().includes(needle);
}

export function sortPickerOptions(options: CalculatorTraitOption[]): CalculatorTraitOption[] {
  const pin = new Map<string, number>(BASIC_IDS.map((id, index) => [id, index]));
  return [...options].sort((a, b) => {
    const aPin = pin.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPin = pin.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aPin !== bPin) return aPin - bPin;
    const groupDiff =
      (pickerGroupFor(a) === "basic" ? 0 : 1) - (pickerGroupFor(b) === "basic" ? 0 : 1);
    if (groupDiff !== 0) return groupDiff;
    return a.label.localeCompare(b.label, "ja");
  });
}

export function optionsInGroup(
  options: CalculatorTraitOption[],
  group: TraitPickerGroup,
): CalculatorTraitOption[] {
  return sortPickerOptions(options.filter((option) => pickerGroupFor(option) === group));
}

export function traitMetaLabel(option: CalculatorTraitOption): string | undefined {
  if (option.kind === "locus" && option.locus) {
    return option.locus.inheritance === "recessive" ? "劣性" : "不完全優性";
  }
  if (option.kind === "axanthic") return "劣性";
  return option.badge;
}
