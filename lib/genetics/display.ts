import { LOCI } from "./catalog";
import { geneStatusLabelJa } from "./format";
import { copiesToStatus } from "./phenotype";
import type { AlleleCopies } from "./types";

/** Display helper only — does not change pairing math. */
export function formatCopiesAsGenotype(
  copies: Record<string, AlleleCopies>,
): string {
  const tokens: string[] = [];
  for (const locus of LOCI) {
    const value = copies[locus.id] ?? 0;
    if (value === 0) continue;
    const status = copiesToStatus(value);
    tokens.push(
      `${locus.nameJa}：${geneStatusLabelJa(status, locus.inheritance, locus.nameJa)}`,
    );
  }
  return tokens.length > 0 ? tokens.join(" / ") : "野生型";
}
