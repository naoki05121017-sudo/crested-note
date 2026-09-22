import { geneStatusLabelJa, getVisualTrait } from "@/lib/genetics";
import type { GeneStatus, Inheritance, LocusDefinition } from "@/lib/genetics/types";

const CSH_TRAIT_IDS = new Set(["cappuccino", "sable", "highway"]);

export const RECESSIVE_PARENT_STATUSES: GeneStatus[] = [
  "wild",
  "het",
  "visual",
  "possible_50",
  "possible_66",
];

export const INCOMPLETE_PARENT_STATUSES: GeneStatus[] = ["wild", "het", "visual"];

export function isCshAllelicTrait(traitId: string, locus?: LocusDefinition): boolean {
  if (CSH_TRAIT_IDS.has(traitId)) return true;
  if (locus?.id === "cappuccino" || locus?.alleleGroup === "cappuccino") return true;
  return getVisualTrait(traitId)?.alleleOf === "cappuccino";
}

export function isIncompleteDominantParentTrait(
  traitId: string,
  locus?: LocusDefinition,
): boolean {
  if (isCshAllelicTrait(traitId, locus)) return true;
  return locus?.inheritance === "incomplete_dominant";
}

export function parentStatusesFor(
  traitId: string,
  locus?: LocusDefinition,
): GeneStatus[] {
  return isIncompleteDominantParentTrait(traitId, locus)
    ? INCOMPLETE_PARENT_STATUSES
    : RECESSIVE_PARENT_STATUSES;
}

export function parentInheritanceFor(
  traitId: string,
  locus?: LocusDefinition,
): Inheritance {
  return isIncompleteDominantParentTrait(traitId, locus)
    ? "incomplete_dominant"
    : "recessive";
}

export function parentStatusDisplayName(
  traitId: string,
  locus?: LocusDefinition,
): string {
  if (traitId === "sable") return "セーブル";
  if (traitId === "highway") return "ハイウェイ";
  if (traitId === "cappuccino") return "カプチーノ";
  return locus?.nameJa ?? traitId;
}

export function coerceParentStatus(
  status: string | undefined,
  traitId: string,
  locus?: LocusDefinition,
  fallback: GeneStatus = "het",
): GeneStatus {
  const allowed = parentStatusesFor(traitId, locus);
  if (status && allowed.includes(status as GeneStatus)) return status as GeneStatus;
  if (status === "possible_50" || status === "possible_66") {
    return allowed.includes("het") ? "het" : allowed[0] ?? fallback;
  }
  return allowed.includes(fallback) ? fallback : (allowed[0] ?? "wild");
}

export function parentStatusOptions(
  traitId: string,
  locus?: LocusDefinition,
): { status: GeneStatus; label: string }[] {
  const inheritance = parentInheritanceFor(traitId, locus);
  const nameJa = parentStatusDisplayName(traitId, locus);
  if (isCshAllelicTrait(traitId, locus)) {
    return [
      { status: "wild", label: "なし" },
      { status: "het", label: nameJa },
      { status: "visual", label: `スーパー${nameJa}` },
    ];
  }
  return parentStatusesFor(traitId, locus).map((status) => ({
    status,
    label: geneStatusLabelJa(status, inheritance, nameJa),
  }));
}
