import { LOCI } from "./catalog";
import type { CappuccinoMorphDisplay } from "./allelic-visual";
import { geneStatusLabelJa } from "./format";
import { copiesToStatus } from "./phenotype";
import type { AlleleCopies } from "./types";

/** Display helper only — does not change pairing math. */
export function formatCopiesAsGenotype(
  copies: Record<string, AlleleCopies>,
  cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
): string {
  const tokens: string[] = [];
  for (const locus of LOCI) {
    const value = copies[locus.id] ?? 0;
    if (value === 0) continue;
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
