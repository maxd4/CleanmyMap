import { describe, expect, it } from "vitest";
import { readAllSpogomiPages, SPOGOMI_QUERY_PAGE_SIZE } from "./pagination";

describe("SPOGOMI exhaustive reads", () => {
  it("reads all deterministic pages beyond the Supabase response limit", async () => {
    const source = Array.from({ length: SPOGOMI_QUERY_PAGE_SIZE + 17 }, (_, index) => index);
    const ranges: Array<[number, number]> = [];
    const rows = await readAllSpogomiPages("synthetic rows", async (from, to) => {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(rows).toEqual(source);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it("fails closed when a page read is interrupted", async () => {
    await expect(readAllSpogomiPages("interrupted rows", async () => ({
      data: null,
      error: { message: "connection interrupted" },
    }))).rejects.toThrow("SPOGOMI interrupted rows read failed: connection interrupted");
  });

  it("fails closed when an exact-count page disappears", async () => {
    const source = Array.from({ length: SPOGOMI_QUERY_PAGE_SIZE * 2 }, (_, index) => index);
    await expect(readAllSpogomiPages("missing page", async (from, to) => ({
      data: from === 0 ? source.slice(from, to + 1) : [],
      count: source.length,
      error: null,
    }), { requireExactCount: true })).rejects.toThrow("SPOGOMI missing page read failed: incomplete paginated result");
  });

  it("refuses a reconciliation source without an exact count", async () => {
    await expect(readAllSpogomiPages("unbounded source", async () => ({
      data: [], count: null, error: null,
    }), { requireExactCount: true })).rejects.toThrow("SPOGOMI unbounded source read failed: exact row count unavailable");
  });
});
