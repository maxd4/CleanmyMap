import { describe, expect, it, vi } from "vitest";
import {
  ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE,
  ACTION_MEDIA_REPORT_MAX_ROWS,
  ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE,
  loadActionMediaReportReadiness,
} from "./action-media-report";

type ReportRow = {
  id: string;
  action_id: string;
  created_by_clerk_id: string;
};

type PageResult = { data: unknown; error: unknown; count?: number | null };
type Cursor = { actionId: string; mediaId: string } | null;

function makePagedSupabase(
  loadPage: (actionIds: string[], from: number, to: number, cursor: Cursor) => PageResult,
) {
  const queries: Array<{
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
  }> = [];
  const supabase = {
    from: vi.fn(() => {
      let actionIds: string[] = [];
      let cursorExpression: string | null = null;
      const query = {
        select: vi.fn(() => query),
        in: vi.fn((_column: string, values: string[]) => {
          actionIds = values;
          return query;
        }),
        eq: vi.fn(() => query),
        or: vi.fn((expression: string) => {
          cursorExpression = expression;
          return query;
        }),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => Promise.resolve(loadPage(
          actionIds,
          from,
          to,
          cursorExpression ? parseCursor(cursorExpression) : null,
        ))),
      };
      queries.push(query);
      return query;
    }),
  };
  return { supabase, queries };
}

function parseCursor(expression: string): Cursor {
  const match = /^action_id\.gt\.([^,]+),and\(action_id\.eq\.([^,]+),id\.gt\.([^)]+)\)$/.exec(expression);
  return match ? { actionId: match[2], mediaId: match[3] } : null;
}

function compareRows(left: ReportRow, right: ReportRow): number {
  return left.action_id.localeCompare(right.action_id) || left.id.localeCompare(right.id);
}

function pageRows(rows: ReportRow[], actionIds: string[], from: number, to: number, cursor: Cursor = null): PageResult {
  const filteredRows = rows
    .filter((row) => actionIds.includes(row.action_id))
    .sort(compareRows);
  const firstIndex = cursor
    ? filteredRows.findIndex((row) => compareRows(row, {
      id: cursor.mediaId,
      action_id: cursor.actionId,
      created_by_clerk_id: "",
    }) > 0)
    : 0;
  const start = firstIndex < 0 ? filteredRows.length : firstIndex;
  return {
    data: filteredRows.slice(start, start + to - from + 1),
    error: null,
    count: filteredRows.length - start,
  };
}

describe("action media report readiness", () => {
  it("reads a complete deterministic projection without exposing private media objects", async () => {
    const rows: ReportRow[] = [
      { id: "m-1", action_id: "a1", created_by_clerk_id: "user-1" },
      { id: "m-2", action_id: "a1", created_by_clerk_id: "user-1" },
      { id: "m-3", action_id: "a2", created_by_clerk_id: "user-1" },
    ];
    const { supabase, queries } = makePagedSupabase((actionIds, from, to, cursor) =>
      pageRows(rows, actionIds, from, to, cursor),
    );

    const result = await loadActionMediaReportReadiness(
      supabase as never,
      ["a1", "a2", "a1"],
      "user-1",
    );

    expect(supabase.from).toHaveBeenCalledWith("action_media");
    expect(queries[0].select).toHaveBeenCalledWith("id, action_id, created_by_clerk_id", {
      count: "exact",
    });
    expect(queries[0].in).toHaveBeenCalledWith("action_id", ["a1", "a2"]);
    expect(queries[0].eq).toHaveBeenCalledWith("upload_state", "ready");
    expect(queries[0].order).toHaveBeenNthCalledWith(1, "action_id", { ascending: true });
    expect(queries[0].order).toHaveBeenNthCalledWith(2, "id", { ascending: true });
    expect(result.availability).toBe("available");
    expect(result.readyCountByActionId).toEqual(new Map([["a1", 2], ["a2", 1]]));
  });

  it("reads every page before declaring the projection available", async () => {
    const rows: ReportRow[] = Array.from(
      { length: ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 17 },
      (_, index) => ({
        id: `m-${index}`,
        action_id: "a1",
        created_by_clerk_id: "user-1",
      }),
    );
    const ranges: Array<[number, number]> = [];
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) => {
      ranges.push([from, to]);
      return pageRows(rows, actionIds, from, to, cursor);
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(ranges).toEqual([
      [0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1],
      [0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1],
    ]);
    expect(result.availability).toBe("available");
    expect(result.readyCountByActionId).toEqual(
      new Map([["a1", ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 17]]),
    );
  });

  it("refuses overlapping pages even when the exact count stays unchanged", async () => {
    const rows: ReportRow[] = Array.from(
      { length: ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 1 },
      (_, index) => ({
        id: `m-${String(index).padStart(4, "0")}`,
        action_id: "a1",
        created_by_clerk_id: "user-1",
      }),
    );
    const { supabase } = makePagedSupabase((_actionIds, _from, _to, cursor) => ({
      data: cursor ? [rows[ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1], rows[ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE]] : rows.slice(0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE),
      error: null,
      count: rows.length,
    }));

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it.each([
    {
      name: "duplicate identifiers",
      rows: [
        { id: "m-1", action_id: "a1", created_by_clerk_id: "user-1" },
        { id: "m-1", action_id: "a1", created_by_clerk_id: "user-1" },
      ],
    },
    {
      name: "missing identifiers",
      rows: [{ action_id: "a1", created_by_clerk_id: "user-1" } as unknown as ReportRow],
    },
    {
      name: "disordered identifiers",
      rows: [
        { id: "m-a", action_id: "a1", created_by_clerk_id: "user-1" },
        { id: "m-c", action_id: "a1", created_by_clerk_id: "user-1" },
        { id: "m-b", action_id: "a1", created_by_clerk_id: "user-1" },
      ],
    },
  ])("refuses $name in a page", async ({ rows }) => {
    const { supabase } = makePagedSupabase(() => ({
      data: rows,
      error: null,
      count: rows.length,
    }));

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("refuses a count change that simulates a corpus modification between pages", async () => {
    const rows: ReportRow[] = Array.from(
      { length: ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 1 },
      (_, index) => ({
        id: `m-${String(index).padStart(4, "0")}`,
        action_id: "a1",
        created_by_clerk_id: "user-1",
      }),
    );
    let pageNumber = 0;
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) => {
      pageNumber += 1;
      return {
        ...pageRows(rows, actionIds, from, to, cursor),
        count: pageNumber === 1 ? rows.length : rows.length + 1,
      };
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(pageNumber).toBe(2);
    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("keeps a valid cursor projection complete across pages and actions", async () => {
    const rows: ReportRow[] = [
      ...Array.from({ length: 1_200 }, (_, index) => ({
        id: `a1-${String(index).padStart(4, "0")}`,
        action_id: "a1",
        created_by_clerk_id: "user-1",
      })),
      ...Array.from({ length: 800 }, (_, index) => ({
        id: `a2-${String(index).padStart(4, "0")}`,
        action_id: "a2",
        created_by_clerk_id: "user-1",
      })),
    ];
    const { supabase, queries } = makePagedSupabase((actionIds, from, to, cursor) =>
      pageRows(rows, actionIds, from, to, cursor),
    );

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1", "a2"], "user-1");

    expect(result.availability).toBe("available");
    expect(result.readyCountByActionId).toEqual(new Map([["a1", 1_200], ["a2", 800]]));
    expect(queries[1].or).toHaveBeenCalledWith(
      "action_id.gt.a1,and(action_id.eq.a1,id.gt.a1-0999)",
    );
  });

  it.each([1_000, 1_001, 10_000, 10_001])("enforces the %s media boundary", async (mediaCount) => {
    const rows: ReportRow[] = Array.from({ length: mediaCount }, (_, index) => ({
      id: `m-${String(index).padStart(5, "0")}`,
      action_id: "a1",
      created_by_clerk_id: "user-1",
    }));
    const ranges: Array<[number, number]> = [];
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) => {
      ranges.push([from, to]);
      return pageRows(rows, actionIds, from, to, cursor);
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(result.availability).toBe(mediaCount <= ACTION_MEDIA_REPORT_MAX_ROWS ? "available" : "unavailable");
    expect(ranges).toHaveLength(mediaCount <= ACTION_MEDIA_REPORT_MAX_ROWS
      ? Math.ceil(mediaCount / ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE)
      : 1);
    if (mediaCount <= ACTION_MEDIA_REPORT_MAX_ROWS) {
      expect(result.readyCountByActionId).toEqual(new Map([["a1", mediaCount]]));
    } else {
      expect(result.readyCountByActionId.size).toBe(0);
    }
  });

  it("fails closed when an intermediate page errors and discards partial counts", async () => {
    const ranges: Array<[number, number]> = [];
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) => {
      ranges.push([from, to]);
      if (cursor) {
        return { data: null, error: new Error("connection interrupted") };
      }
      return pageRows(
        Array.from({ length: ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 1 }, (_, index) => ({
          id: `m-${index}`,
          action_id: "a1",
          created_by_clerk_id: "user-1",
        })),
        actionIds,
        from,
        to,
        cursor,
      );
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(ranges).toHaveLength(2);
    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("fails closed when the bounded read cap is exceeded", async () => {
    const ranges: Array<[number, number]> = [];
    const rows: ReportRow[] = Array.from(
      { length: ACTION_MEDIA_REPORT_MAX_ROWS + 1 },
      (_, index) => ({
        id: `m-${index}`,
        action_id: "a1",
        created_by_clerk_id: "user-1",
      }),
    );
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) => {
      ranges.push([from, to]);
      return pageRows(rows, actionIds, from, to, cursor);
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(ranges).toEqual([[0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1]]);
    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("refuses the whole projection when a ready row belongs to another reader", async () => {
    const { supabase } = makePagedSupabase((actionIds, from, to, cursor) =>
      pageRows(
        [{ id: "m-third-party", action_id: "a1", created_by_clerk_id: "other-user" }],
        actionIds,
        from,
        to,
        cursor,
      ),
    );

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("batches large action selections so each request stays bounded", async () => {
    const actionIds = Array.from(
      { length: ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE + 1 },
      (_, index) => `a-${index}`,
    );
    const requestedBatches: string[][] = [];
    const { supabase } = makePagedSupabase((batchIds) => {
      requestedBatches.push(batchIds);
      return { data: [], error: null, count: 0 };
    });

    const result = await loadActionMediaReportReadiness(supabase as never, actionIds, "user-1");

    expect(requestedBatches).toHaveLength(2);
    expect(requestedBatches.every((batch) => batch.length <= ACTION_MEDIA_REPORT_ACTION_ID_BATCH_SIZE)).toBe(true);
    expect(result.availability).toBe("available");
  });

  it("returns unavailable without turning pending or failed rows into evidence", async () => {
    const { supabase } = makePagedSupabase(() => ({
      data: null,
      error: new Error("RLS or source unavailable"),
    }));

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"]);

    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });
});
