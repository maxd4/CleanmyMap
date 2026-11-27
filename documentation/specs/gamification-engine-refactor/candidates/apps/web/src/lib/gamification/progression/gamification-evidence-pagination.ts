import { readBoundedPages } from "@/lib/actions/pagination";

export const GAMIFICATION_EVIDENCE_PAGE_SIZE = 1_000;
const MAX_GAMIFICATION_EVIDENCE_ROWS = 100_000;

type EvidencePage<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
};

type EvidenceRow = { id?: string | number | null };

/**
 * Complete, bounded inventory for destructive reconciliation.
 * The caller must request an exact count and a unique stable ordering.
 * Offset advances by actual rows, including a lower PostgREST server cap.
 * This verifies cardinality and identity, not a transactional source snapshot.
 */
export async function loadCompleteGamificationRows<T extends EvidenceRow>(
  resource: string,
  loadPage: (from: number, to: number) => PromiseLike<EvidencePage<T>>,
): Promise<T[]> {
  let expectedCount: number | null = null;
  const seen = new Set<string>();
  const fail = (reason: string): never => {
    throw new Error(`Incomplete gamification evidence (${resource}): ${reason}`);
  };

  return readBoundedPages<T>({
    requestedLimit: null,
    pageSize: GAMIFICATION_EVIDENCE_PAGE_SIZE,
    safetyError: `Incomplete gamification evidence (${resource}): page budget exceeded`,
    loadPage: async ({ from, to }) => {
      if (expectedCount !== null && from === expectedCount) return [];
      const result = await loadPage(from, to);
      if (result.error) throw new Error(result.error.message);
      const count = result.count;
      if (count === null || !Number.isSafeInteger(count) || count < 0) {
        return fail("exact count unavailable");
      }
      if (count > MAX_GAMIFICATION_EVIDENCE_ROWS) return fail("row budget exceeded");
      if (expectedCount !== null && count !== expectedCount) return fail("count changed");
      expectedCount = count;
      const page = result.data;
      if (!Array.isArray(page)) return fail("invalid page");
      if (page.length > to - from + 1 || from + page.length > count) return fail("invalid cardinality");
      if (page.length === 0 && from < count) return fail("truncated page");
      for (const row of page) {
        const id = row?.id;
        if ((typeof id !== "string" && typeof id !== "number") || String(id).length === 0) {
          return fail("missing row identity");
        }
        const key = String(id);
        if (seen.has(key)) return fail("duplicate row identity");
        seen.add(key);
      }
      return page;
    },
  });
}

/** Batch an IN filter to bound request URLs without relaxing the source count. */
export async function loadCompleteGamificationRowsByIds<T extends EvidenceRow>(
  resource: string,
  ids: readonly string[],
  loadPage: (batch: string[], from: number, to: number) => PromiseLike<EvidencePage<T>>,
): Promise<T[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: T[] = [];
  const seen = new Set<string>();
  if (uniqueIds.length > MAX_GAMIFICATION_EVIDENCE_ROWS) {
    throw new Error(`Incomplete gamification evidence (${resource}): ID budget exceeded`);
  }
  for (let index = 0; index < uniqueIds.length; index += 200) {
    const batch = uniqueIds.slice(index, index + 200);
    const batchRows = await loadCompleteGamificationRows(resource, (from, to) => loadPage(batch, from, to));
    for (const row of batchRows) {
      const id = String(row.id);
      if (seen.has(id)) throw new Error(`Incomplete gamification evidence (${resource}): duplicate row identity across batches`);
      seen.add(id);
      rows.push(row);
      if (rows.length > MAX_GAMIFICATION_EVIDENCE_ROWS) {
        throw new Error(`Incomplete gamification evidence (${resource}): row budget exceeded`);
      }
    }
  }
  return rows;
}
