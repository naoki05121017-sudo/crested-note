import { LOCI } from "./catalog";
import { CSH_PHENOTYPE_JA, CSH_VISUAL_KEY, isCshDiplotype, type CshDiplotype } from "./csh";
import { phenotypeFromKeys } from "./reference-combos";
import type { CappuccinoMorphDisplay } from "./allelic-visual";
import type {
  AlleleCopies,
  GeneStatus,
  Genotype,
  LocusDefinition,
  ZygosityKind,
} from "./types";

const AXANTHIC_IDS = LOCI.filter((locus) => locus.id.startsWith("axanthic")).map(
  (locus) => locus.id,
);

const RECESSIVE_KEYS: Record<string, string> = {
  phantom: "phantom",
  patternless: "patternless",
  charcoal: "charcoal",
  chocho: "chocho",
  albino: "albino",
  redBase: "red",
  superStripe: "superStripe",
};

export function phenotypeKeysFromState(
  copies: Record<string, AlleleCopies>,
  csh: CshDiplotype = "NN",
): { visualKeys: string[]; hetKeys: string[] } {
  const visualKeys: string[] = [];
  const hetKeys: string[] = [];

  const cshKey = CSH_VISUAL_KEY[csh];
  if (cshKey) visualKeys.push(cshKey);

  const lw = copies.lillyWhite ?? 0;
  if (lw === 1) visualKeys.push("lw");
  if (lw === 2) visualKeys.push("superLw");

  const eb = copies.emptyBack ?? 0;
  if (eb === 1) visualKeys.push("emptyBack");
  if (eb === 2) visualKeys.push("superEB");

  for (const [locusId, key] of Object.entries(RECESSIVE_KEYS)) {
    const value = copies[locusId] ?? 0;
    if (value === 2) visualKeys.push(key);
    if (value === 1) hetKeys.push(key);
  }

  const visualAx = AXANTHIC_IDS.filter((id) => (copies[id] ?? 0) === 2);
  const hetAx = AXANTHIC_IDS.filter((id) => (copies[id] ?? 0) === 1);
  if (visualAx.length === 1) {
    visualKeys.push(visualAx[0] === "axanthicTug" ? "axanthic" : visualAx[0]);
  } else {
    visualKeys.push(...visualAx);
  }
  if (hetAx.length === 1 && visualAx.length === 0) {
    hetKeys.push(hetAx[0] === "axanthicTug" ? "axanthic" : hetAx[0]);
  } else {
    hetKeys.push(...hetAx);
  }

  return { visualKeys, hetKeys };
}

export function phenotypeFromState(
  copies: Record<string, AlleleCopies>,
  csh: CshDiplotype = "NN",
): string {
  const { visualKeys, hetKeys } = phenotypeKeysFromState(copies, csh);
  return phenotypeFromKeys(visualKeys, hetKeys);
}

export function describeCopies(
  locus: LocusDefinition,
  copies: AlleleCopies,
  cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
  csh?: CshDiplotype,
): { kind: ZygosityKind; token: string | null } {
  if (locus.id === "cappuccino" && csh) {
    const name = CSH_PHENOTYPE_JA[csh];
    if (csh === "NN") return { kind: "wild", token: null };
    if (csh.startsWith("N/")) return { kind: "visual", token: name };
    return { kind: "super", token: name };
  }

  if (copies === 0) return { kind: "wild", token: null };

  if (cappuccinoMorph === "sable" && locus.id === "cappuccino") {
    if (copies === 1) return { kind: "visual", token: "セーブル" };
    return { kind: "super", token: "スーパーセーブル" };
  }

  if (locus.inheritance === "recessive") {
    if (copies === 1) return { kind: "het", token: `ヘテロ ${locus.nameJa}` };
    return { kind: "visual", token: locus.visualNameJa };
  }

  if (copies === 1) return { kind: "visual", token: locus.visualNameJa };
  return { kind: "super", token: locus.superNameJa ?? `スーパー${locus.nameJa}` };
}

export function locusOutcomeLabel(
  locus: LocusDefinition,
  copies: AlleleCopies,
  cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
  csh?: CshDiplotype,
): string {
  return describeCopies(locus, copies, cappuccinoMorph, csh).token ?? "ノーマル";
}

export function combinePhenotype(
  parts: { locus: LocusDefinition; copies: AlleleCopies }[],
  _cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
  csh: CshDiplotype = "NN",
): string {
  const copiesById: Record<string, AlleleCopies> = {};
  for (const part of parts) copiesById[part.locus.id] = part.copies;
  return phenotypeFromState(copiesById, csh);
}

export function copiesToStatus(copies: AlleleCopies): GeneStatus {
  if (copies === 0) return "wild";
  if (copies === 1) return "het";
  return "visual";
}

export function genotypeFromCopies(
  copies: Record<string, AlleleCopies>,
  csh?: CshDiplotype,
): Genotype {
  const genotype: Genotype = {};
  for (const [locusId, value] of Object.entries(copies)) {
    const status = copiesToStatus(value);
    if (status !== "wild") genotype[locusId] = status;
  }
  if (csh && csh !== "NN") genotype.csh = csh;
  return genotype;
}

export function formatGenotypeLabel(genotype: Genotype): string {
  const possibleTokens: string[] = [];
  const mendelian: Record<string, AlleleCopies> = {};
  for (const locus of LOCI) {
    const status = genotype[locus.id] ?? "wild";
    if (status === "wild" || status === "unknown") continue;
    if (status === "possible_50") {
      possibleTokens.push(`50%ヘテロ ${locus.nameJa}`);
      continue;
    }
    if (status === "possible_66") {
      possibleTokens.push(`66%ヘテロ ${locus.nameJa}`);
      continue;
    }
    mendelian[locus.id] = status === "visual" ? 2 : 1;
  }
  const named = phenotypeFromState(
    mendelian,
    isCshDiplotype(genotype.csh) ? genotype.csh : "NN",
  );
  if (possibleTokens.length === 0) return named;
  if (named === "ノーマル") return possibleTokens.join(" ");
  return `${named} ${possibleTokens.join(" ")}`;
}
