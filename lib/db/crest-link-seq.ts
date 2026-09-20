export const CREST_LINK_SEQ_ID = 1;

export function crestLinkSeqWriteRow(storedValue: number, nextValue: number) {
  return {
    id: CREST_LINK_SEQ_ID,
    value: Math.max(0, storedValue, nextValue),
  };
}

export function crestLinkSeqValue(
  rows: { id?: unknown; value?: unknown }[] | null | undefined,
): number {
  const row = (rows ?? []).find((item) => Number(item.id) === CREST_LINK_SEQ_ID);
  return Number(row?.value) || 0;
}
