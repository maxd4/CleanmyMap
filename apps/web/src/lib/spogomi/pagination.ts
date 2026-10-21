export const SPOGOMI_QUERY_PAGE_SIZE = 1_000;

type SpogomiPageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

function assertExactCount(label: string, result: SpogomiPageResult<unknown>, expectedCount: number | null): number | null {
  if (result.count == null) throw new Error(`SPOGOMI ${label} read failed: exact row count unavailable`);
  if (expectedCount !== null && result.count !== expectedCount) throw new Error(`SPOGOMI ${label} read failed: row count changed during pagination`);
  return result.count;
}

function hasIncompleteExpectedPage(label: string, rowsLength: number, expectedCount: number, pageLength: number): boolean {
  if (rowsLength === expectedCount) return false;
  if (rowsLength > expectedCount || pageLength === 0 || pageLength < SPOGOMI_QUERY_PAGE_SIZE) throw new Error(`SPOGOMI ${label} read failed: incomplete paginated result`);
  return true;
}

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
    if (options.requireExactCount) expectedCount = assertExactCount(label, result, expectedCount);
    else if (result.count != null) expectedCount = assertExactCount(label, result, expectedCount);
    const page = result.data ?? [];
    rows.push(...page);
    if (expectedCount !== null) {
      if (!hasIncompleteExpectedPage(label, rows.length, expectedCount, page.length)) return rows;
    } else if (page.length < SPOGOMI_QUERY_PAGE_SIZE) {
      return rows;
    }
  }
}
