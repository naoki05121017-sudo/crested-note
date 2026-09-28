export const POSTGREST_PAGE_SIZE = 500;
export const IN_QUERY_CHUNK = 150;

export function chunkIds(ids: string[], size = IN_QUERY_CHUNK): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export async function selectPagedAll(
  runPage: (
    from: number,
    to: number,
  ) => Promise<{ data?: unknown[] | null; error: { message: string } | null }>,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await runPage(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    const chunk = (data ?? []) as Record<string, unknown>[];
    rows.push(...chunk);
    if (chunk.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }
  return rows;
}

export function countsMatchForDelete(
  dbCount: number | null,
  fetched: number,
): boolean {
  return dbCount != null && dbCount === fetched;
}
