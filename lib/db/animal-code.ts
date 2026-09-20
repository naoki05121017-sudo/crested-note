import type { DatabaseFile } from "@/lib/db/types";

/** Display prefix only. Crest Link IDs (NC-000001) are a separate lifetime identity. */
export const ANIMAL_CODE_PREFIX = "NC-";
export const ANIMAL_CODE_PAD = 4;

export function formatAnimalCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error("管理番号の連番が不正です。");
  }
  const width = Math.max(ANIMAL_CODE_PAD, String(seq).length);
  return `${ANIMAL_CODE_PREFIX}${String(seq).padStart(width, "0")}`;
}

export function parseAnimalCodeSeq(code: string): number {
  const match = /^NC-(\d+)$/i.exec(code.trim());
  if (!match) return 0;
  const seq = Number(match[1]);
  return Number.isInteger(seq) && seq > 0 ? seq : 0;
}

export function displayAnimalCode(code: string | undefined): string {
  const text = code?.trim() ?? "";
  return text || "未発行";
}

export function raiseAnimalCodeHighWater(
  db: Pick<DatabaseFile, "animalCodeSeq" | "animals">,
): void {
  let max = Number.isFinite(db.animalCodeSeq) ? db.animalCodeSeq : 0;
  for (const animal of db.animals) {
    max = Math.max(max, parseAnimalCodeSeq(animal.code));
  }
  db.animalCodeSeq = max;
}

/**
 * Allocates the next display code and advances the persistent counter.
 * Does not use living-max-only, so deleted numbers are not reused.
 */
export function issueAnimalCode(
  db: Pick<DatabaseFile, "animalCodeSeq" | "animals">,
): string {
  raiseAnimalCodeHighWater(db);
  const used = new Set(
    db.animals.map((animal) => animal.code.trim()).filter(Boolean),
  );
  let next = db.animalCodeSeq;
  let code = "";
  do {
    next += 1;
    code = formatAnimalCode(next);
  } while (used.has(code));
  db.animalCodeSeq = next;
  return code;
}

/** Keep existing codes. Fill blanks once so older rows get a display number. */
export function syncAnimalCodes(db: DatabaseFile): void {
  raiseAnimalCodeHighWater(db);
  for (const animal of db.animals) {
    if (!animal.code.trim()) {
      animal.code = issueAnimalCode(db);
    }
  }
}
