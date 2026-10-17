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

function makePagedSupabase(
  loadPage: (actionIds: string[], from: number, to: number) => PageResult,
) {
  const queries: Array<{
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
  }> = [];
  const supabase = {
    from: vi.fn(() => {
      let actionIds: string[] = [];
      const query = {
        select: vi.fn(() => query),
        in: vi.fn((_column: string, values: string[]) => {
          actionIds = values;
          return query;
        }),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => Promise.resolve(loadPage(actionIds, from, to))),
      };
      queries.push(query);
      return query;
    }),
  };
  return { supabase, queries };
}

function pageRows(rows: ReportRow[], actionIds: string[], from: number, to: number): PageResult {
  const filteredRows = rows.filter((row) => actionIds.includes(row.action_id));
  return {
    data: filteredRows.slice(from, to + 1),
    error: null,
    count: filteredRows.length,
  };
}

describe("action media report readiness", () => {
  it("reads a complete deterministic projection without exposing private media objects", async () => {
    const rows: ReportRow[] = [
      { id: "m-1", action_id: "a1", created_by_clerk_id: "user-1" },
      { id: "m-2", action_id: "a1", created_by_clerk_id: "user-1" },
      { id: "m-3", action_id: "a2", created_by_clerk_id: "user-1" },
    ];
    const { supabase, queries } = makePagedSupabase((actionIds, from, to) =>
      pageRows(rows, actionIds, from, to),
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
    const { supabase } = makePagedSupabase((actionIds, from, to) => {
      ranges.push([from, to]);
      return pageRows(rows, actionIds, from, to);
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(ranges).toEqual([
      [0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1],
      [ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE * 2 - 1],
    ]);
    expect(result.availability).toBe("available");
    expect(result.readyCountByActionId).toEqual(
      new Map([["a1", ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE + 17]]),
    );
  });

  it("fails closed when an intermediate page errors and discards partial counts", async () => {
    const ranges: Array<[number, number]> = [];
    const { supabase } = makePagedSupabase((actionIds, from, to) => {
      ranges.push([from, to]);
      if (from === ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE) {
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
    const { supabase } = makePagedSupabase((actionIds, from, to) => {
      ranges.push([from, to]);
      return pageRows(rows, actionIds, from, to);
    });

    const result = await loadActionMediaReportReadiness(supabase as never, ["a1"], "user-1");

    expect(ranges).toEqual([[0, ACTION_MEDIA_REPORT_QUERY_PAGE_SIZE - 1]]);
    expect(result.availability).toBe("unavailable");
    expect(result.readyCountByActionId.size).toBe(0);
  });

  it("refuses the whole projection when a ready row belongs to another reader", async () => {
    const { supabase } = makePagedSupabase((actionIds, from, to) =>
      pageRows(
        [{ id: "m-third-party", action_id: "a1", created_by_clerk_id: "other-user" }],
        actionIds,
        from,
        to,
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
