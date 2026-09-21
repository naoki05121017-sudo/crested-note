import type { DatabaseFile } from "@/lib/db/types";

export const ANIMAL_CODE_PREFIX = "NC-";
export const ANIMAL_CODE_PAD = 6;

export type AnimalIdFields = {
  code?: string;
};

export function formatAnimalCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error("個体IDの連番が不正です。");
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

/** User-facing 個体ID. Pads NC-0002 → NC-000002. Does not use Crest Link IDs. */
export function displayAnimalId(animal: AnimalIdFields | string | undefined): string {
  const raw = typeof animal === "string" ? animal : animal?.code;
  const text = raw?.trim() ?? "";
  if (!text) return "未発行";
  const seq = parseAnimalCodeSeq(text);
  if (seq > 0) return formatAnimalCode(seq);
  return text;
}

export function displayAnimalCode(code: string | undefined): string {
  return displayAnimalId(code);
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
 * Next keeper 個体ID. 6-digit display. Does not reuse seq after delete.
 * Crest Link numbering is a separate internal counter.
 */
export function issueAnimalCode(
  db: Pick<DatabaseFile, "animalCodeSeq" | "animals">,
): string {
  raiseAnimalCodeHighWater(db);
  const used = new Set(
    db.animals.map((animal) => parseAnimalCodeSeq(animal.code)).filter((seq) => seq > 0),
  );
  let next = db.animalCodeSeq;
  do {
    next += 1;
  } while (used.has(next));
  db.animalCodeSeq = next;
  return formatAnimalCode(next);
}

/** Do not overwrite stored codes. High-water only. */
export function syncAnimalCodes(db: DatabaseFile): void {
  raiseAnimalCodeHighWater(db);
}
