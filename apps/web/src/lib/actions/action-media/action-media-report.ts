import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionMediaReportReadiness = {
  readyCountByActionId: Map<string, number>;
  availability: "available" | "unavailable";
};

export const ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE = 200;
export const ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE = 1_000;
export const ACTION_MEDIA_REPORT_MAX_ROWS = 10_000;

type ActionMediaReportRow = {
  action_id?: unknown;
  created_by_clerk_id?: unknown;
};

type ActionMediaReportPage = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

function unavailableReadiness(): ActionMediaReportReadiness {
  return { readyCountByActionId: new Map(), availability: "unavailable" };
}

async function readActionMediaReportBatch(
  supabase: SupabaseClient,
  actionIds: readonly string[],
  maxRows: number,
): Promise<ActionMediaReportRow[] | null> {
  const rows: ActionMediaReportRow[] = [];
  let expectedCount: number | null = null;

  for (let from = 0; ; from += ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE) {
    let page: ActionMediaReportPage;
    try {
      page = (await supabase
        .from("action_media")
        .select("id, action_id, created_by_clerk_id", { count: "exact" })
        .in("action_id", [...actionIds])
        .eq("upload_state", "ready")
        .order("action_id", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1)) as ActionMediaReportPage;
    } catch {
      return null;
    }

    if (
      page.error ||
      !Array.isArray(page.data) ||
      typeof page.count !== "number" ||
      !Number.isInteger(page.count) ||
      page.count < 0
    ) {
      return null;
    }

    if (expectedCount !== null && page.count !== expectedCount) {
      return null;
    }
    if (expectedCount === null) {
      expectedCount = page.count;
    }
    if (expectedCount > maxRows) {
      return null;
    }

    if (
      page.data.length > ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE ||
      rows.length + page.data.length > maxRows
    ) {
      return null;
    }

    rows.push(...(page.data as ActionMediaReportRow[]));
    if (rows.length > expectedCount) {
      return null;
    }
    if (rows.length === expectedCount) {
      return rows;
    }
    if (page.data.length < ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE) {
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
