export const SPOGOMI_QUERY_PAGE_SIZE = 1_000;

type SpogomiPageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

export async function readAllSpogomiPages<T>(
  label: string,
  loadPage: (from: number, to: number) => PromiseLike<SpogomiPageResult<T>>,
  options: { requireExactCount?: boolean } = {},
): Promise<T[]> {
  const rows: T[] = [];
  let expectedCount: number | null = null;

  for (let from = 0; ; from += SPOGOMI_QUERY_PAGE_SIZE) {
    const result = await loadPage(from, from + SPOGOMI_QUERY_PAGE_SIZE - 1);
    if (result.error) throw new Error(`SPOGOMI ${label} read failed: ${result.error.message}`);
    if (options.requireExactCount && result.count == null) {
      throw new Error(`SPOGOMI ${label} read failed: exact row count unavailable`);
    }
    if (result.count != null) {
      if (expectedCount !== null && result.count !== expectedCount) {
        throw new Error(`SPOGOMI ${label} read failed: row count changed during pagination`);
      }
      expectedCount = result.count;
    }
    const page = result.data ?? [];
    rows.push(...page);
    if (expectedCount !== null) {
      if (rows.length === expectedCount) return rows;
      if (rows.length > expectedCount || page.length === 0 || page.length < SPOGOMI_QUERY_PAGE_SIZE) {
        throw new Error(`SPOGOMI ${label} read failed: incomplete paginated result`);
      }
    } else if (page.length < SPOGOMI_QUERY_PAGE_SIZE) {
      return rows;
    }
  }
}
