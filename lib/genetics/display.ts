import { LOCI } from "./catalog";
import { CSH_PHENOTYPE_JA, type CshDiplotype } from "./csh";
import type { CappuccinoMorphDisplay } from "./allelic-visual";
import { geneStatusLabelJa } from "./format";
import { copiesToStatus } from "./phenotype";
import type { AlleleCopies } from "./types";

/** Display helper only — does not change pairing math. */
export function formatCopiesAsGenotype(
  copies: Record<string, AlleleCopies>,
  cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
  csh?: CshDiplotype,
): string {
  const tokens: string[] = [];
  if (csh && csh !== "NN") {
    tokens.push(`CSH：${CSH_PHENOTYPE_JA[csh]}`);
  }
  for (const locus of LOCI) {
    const value = copies[locus.id] ?? 0;
    if (value === 0) continue;
    if (locus.id === "cappuccino" && csh && csh !== "NN") continue;
    const status = copiesToStatus(value);
    const sableSeat = cappuccinoMorph === "sable" && locus.id === "cappuccino";
    const nameJa = sableSeat ? "セーブル" : locus.nameJa;
    const inheritance = sableSeat ? "incomplete_dominant" : locus.inheritance;
    tokens.push(
      `${nameJa}：${geneStatusLabelJa(status, inheritance, nameJa)}`,
    );
  }
  return tokens.length > 0 ? tokens.join(" / ") : "野生型";
}
