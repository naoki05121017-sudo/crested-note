import { LOCI, getLocusState, type Genotype } from "@/lib/genetics";
import { POLYGENIC_TRAITS } from "@/lib/genetics/catalog";
import {
  ANIMAL_STATUSES,
  EGG_RESULTS,
  FEEDBACK_STATUSES,
  FEEDBACK_USER_CATEGORIES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  SEXES,
  type AnimalStatus,
  type EggResult,
  type FeedbackStatus,
  type FeedbackUserCategory,
  type ProjectRole,
  type ProjectStatus,
  type Sex,
} from "./types";

export function textField(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseSex(value: string): Sex {
  return SEXES.includes(value as Sex) ? (value as Sex) : "unknown";
}

export function parseAnimalStatus(value: string): AnimalStatus {
  return ANIMAL_STATUSES.includes(value as AnimalStatus)
    ? (value as AnimalStatus)
    : "active";
}

export function parseEggResult(value: string): EggResult {
  return EGG_RESULTS.includes(value as EggResult)
    ? (value as EggResult)
    : "incubating";
}

export function parseProjectStatus(value: string): ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : "active";
}

export function parseProjectRole(value: string): ProjectRole {
  return PROJECT_ROLES.includes(value as ProjectRole)
    ? (value as ProjectRole)
    : "candidate";
}

export function parseFeedbackCategory(value: string): FeedbackUserCategory {
  return FEEDBACK_USER_CATEGORIES.includes(value as FeedbackUserCategory)
    ? (value as FeedbackUserCategory)
    : "other";
}

export function parseFeedbackStatus(value: string): FeedbackStatus {
  return FEEDBACK_STATUSES.includes(value as FeedbackStatus)
    ? (value as FeedbackStatus)
    : "open";
}

export function parseGenotype(formData: FormData): Genotype {
  const genotype: Genotype = {};
  for (const locus of LOCI) {
    const raw = textField(formData, `gene:${locus.id}`);
    if (!raw || raw === "wild") continue;
    const state = getLocusState(locus.id, raw);
    if (state && state.id !== "wild" && state.id !== "unknown") {
      genotype[locus.id] = state.id;
    }
  }
  return genotype;
}

export function parseTraits(formData: FormData): string[] {
  const allowed = new Set<string>(POLYGENIC_TRAITS.map((trait) => trait.id));
  return formData
    .getAll("trait")
    .map((value) => String(value))
    .filter((id) => allowed.has(id));
}

export function parseTraitLevels(
  formData: FormData,
  traits: string[],
): Record<string, number> {
  const selected = new Set(traits);
  const levels: Record<string, number> = {};
  for (const trait of POLYGENIC_TRAITS) {
    if (!trait.graded || !selected.has(trait.id)) continue;
    const raw = Number(textField(formData, `traitLevel:${trait.id}`));
    if (Number.isInteger(raw) && raw >= 1 && raw <= (trait.gradeLabels?.length ?? 4)) {
      levels[trait.id] = raw;
    } else {
      levels[trait.id] = 2;
    }
  }
  return levels;
}

export function nowIso(): string {
  return new Date().toISOString();
}
