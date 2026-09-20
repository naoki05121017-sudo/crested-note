export const ANIMAL_CODE_SEQ_TABLE = "animal_code_seq";

export function animalCodeSeqWriteRow(userId: string, storedValue: number, nextValue: number) {
  return {
    user_id: userId,
    value: Math.max(0, storedValue, nextValue),
  };
}

export function animalCodeSeqValueForUser(
  rows: { user_id?: unknown; value?: unknown }[] | null | undefined,
  userId: string,
): number {
  const row = (rows ?? []).find((item) => String(item.user_id) === userId);
  return Number(row?.value) || 0;
}
