import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionMediaReportReadiness = {
  readyCountByActionId: Map<string, number>;
  availability: "available" | "unavailable";
};

export const ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE = 200;
export const ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE = 1_000;
export const ACTION_MEDIA_REPORT_MAX_ROWS = 10_000;

type ActionMediaReportRow = {
  id?: unknown;
  action_id?: unknown;
  created_by_clerk_id?: unknown;
};

type ActionMediaReportPage = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type ActionMediaReportCursor = {
  actionId: string;
  mediaId: string;
};

type ReportPageRead = {
  page: ActionMediaReportPage;
  cursor: ActionMediaReportCursor | null;
};

function unavailableReadiness(): ActionMediaReportReadiness {
  return { readyCountByActionId: new Map(), availability: "unavailable" };
}

async function readReportPage(
  supabase: SupabaseClient,
  actionIds: readonly string[],
  cursor: ActionMediaReportCursor | null,
): Promise<ReportPageRead | null> {
  try {
    let query = supabase
      .from("action_media")
      .select("id, action_id, created_by_clerk_id", { count: "exact" })
      .in("action_id", [...actionIds])
      .eq("upload_state", "ready");
    if (cursor) {
      query = query.or(`action_id.gt.${cursor.actionId},and(action_id.eq.${cursor.actionId},id.gt.${cursor.mediaId})`);
    }
    const page = (await query
      .order("action_id", { ascending: true })
      .order("id", { ascending: true })
      .range(0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1)) as ActionMediaReportPage;
    return { page, cursor };
  } catch {
    return null;
  }
}

function validateReportPageEnvelope(
  page: ActionMediaReportPage,
  expectedCount: number | null,
  rowsRead: number,
  maxRows: number,
): number | null {
  if (page.error || !Array.isArray(page.data) || typeof page.count !== "number" || !Number.isInteger(page.count) || page.count < 0) return null;
  const resolvedCount = expectedCount ?? page.count;
  if (page.count !== resolvedCount - rowsRead || resolvedCount > maxRows) return null;
  if (page.data.length > ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE || rowsRead + page.data.length > maxRows) return null;
  return resolvedCount;
}

function appendReportPageRows(
  rows: ActionMediaReportRow[],
  seenMediaIds: Set<string>,
  page: ActionMediaReportPage,
  cursor: ActionMediaReportCursor | null,
): { cursor: ActionMediaReportCursor | null; valid: boolean } {
  let nextCursor = cursor;
  const pageRows = page.data as ActionMediaReportRow[];
  for (const row of pageRows) {
    if (typeof row.id !== "string" || row.id.length === 0 || seenMediaIds.has(row.id)) return { cursor: nextCursor, valid: false };
    if (typeof row.action_id !== "string" || row.action_id.length === 0) return { cursor: nextCursor, valid: false };
    if (nextCursor && (row.action_id < nextCursor.actionId || (row.action_id === nextCursor.actionId && row.id <= nextCursor.mediaId))) {
      return { cursor: nextCursor, valid: false };
    }
    seenMediaIds.add(row.id);
    nextCursor = { actionId: row.action_id, mediaId: row.id };
    rows.push(row);
  }
  return { cursor: nextCursor, valid: true };
}

async function readActionMediaReportBatch(
  supabase: SupabaseClient,
  actionIds: readonly string[],
  maxRows: number,
): Promise<ActionMediaReportRow[] | null> {
  const rows: ActionMediaReportRow[] = [];
  const seenMediaIds = new Set<string>();
  let expectedCount: number | null = null;
  let cursor: ActionMediaReportCursor | null = null;

  for (;;) {
    const pageRead = await readReportPage(supabase, actionIds, cursor);
    if (!pageRead) return null;
    const page = pageRead.page;
    expectedCount = validateReportPageEnvelope(page, expectedCount, rows.length, maxRows);
    if (expectedCount === null) return null;
    const appended = appendReportPageRows(rows, seenMediaIds, page, cursor);
    if (!appended.valid) return null;
    cursor = appended.cursor;
    if (rows.length > expectedCount) {
      return null;
    }
    if (rows.length === expectedCount) {
      return rows;
    }
    if ((page.data as ActionMediaReportRow[]).length < ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE) {
      return null;
    }
  }
}

/**
 * Server-only aggregate for report filters.
 *
 * It deliberately selects only action ids and the canonical `ready` state. It
 * never returns storage paths, media metadata, or signed URLs to the browser.
 */
export async function loadActionMediaReportReadiness(
  supabase: SupabaseClient,
  actionIds: readonly string[],
  readerUserId?: string,
): Promise<ActionMediaReportReadiness> {
  const ids = [...new Set(actionIds.filter((id) => id.trim().length > 0))];
  if (ids.length === 0) {
    return { readyCountByActionId: new Map(), availability: "available" };
  }
  if (!readerUserId?.trim()) {
    return unavailableReadiness();
  }

  const readyCountByActionId = new Map<string, number>();
  const requestedActionIds = new Set(ids);
  let rowsRead = 0;

  for (let offset = 0; offset < ids.length; offset += ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE) {
    const batchIds = ids.slice(offset, offset + ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE);
    const rows = await readActionMediaReportBatch(
      supabase,
      batchIds,
      ACTION_MEDIA_REPORT_MAX_ROWS - rowsRead,
    );
    if (!rows) {
      return unavailableReadiness();
    }
    rowsRead += rows.length;

    for (const row of rows) {
      if (
        typeof row.action_id !== "string" ||
        !requestedActionIds.has(row.action_id) ||
        row.created_by_clerk_id !== readerUserId
      ) {
        return unavailableReadiness();
      }

      readyCountByActionId.set(
        row.action_id,
        (readyCountByActionId.get(row.action_id) ?? 0) + 1,
      );
    }
  }

  return { readyCountByActionId, availability: "available" };
}
