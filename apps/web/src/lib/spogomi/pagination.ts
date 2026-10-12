export const SPOGOMI_QUERY_PAGE_SIZE = 1_000;

type SpogomiPageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function readAllSpogomiPages<T>(
  label: string,
  loadPage: (from: number, to: number) => PromiseLike<SpogomiPageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += SPOGOMI_QUERY_PAGE_SIZE) {
    const result = await loadPage(from, from + SPOGOMI_QUERY_PAGE_SIZE - 1);
    if (result.error) throw new Error(`SPOGOMI ${label} read failed: ${result.error.message}`);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < SPOGOMI_QUERY_PAGE_SIZE) return rows;
  }
}
