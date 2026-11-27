import { describe, expect, it, vi } from "vitest";
import { loadCompleteGamificationRows, loadCompleteGamificationRowsByIds } from "./gamification-evidence-pagination";

const rows = Array.from({ length: 1_203 }, (_, id) => ({ id: id + 1 }));

describe("complete gamification evidence", () => {
  it("advances by actual rows despite a lower server page cap", async () => {
    const load = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, Math.min(to + 1, from + 300)),
      error: null, count: rows.length,
    }));
    expect(await loadCompleteGamificationRows("facts", load)).toEqual(rows);
    expect(load.mock.calls.map(([from]) => from)).toEqual([0, 300, 600, 900, 1200]);
  });

  it("deduplicates requested IDs and bounds IN filters without dropping rows", async () => {
    const ids = Array.from({ length: 401 }, (_, index) => String(index));
    const load = vi.fn(async (batch: string[]) => ({ data: batch.map((id) => ({ id })), error: null, count: batch.length }));
    const result = await loadCompleteGamificationRowsByIds("actions", [...ids, ids[0]!], load);
    expect(result.map((row) => row.id)).toEqual(ids);
    expect(load.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 1]);
  });

  it("does not request a further page after an exact complete result", async () => {
    const load = vi.fn(async () => ({ data: [{ id: "a" }], error: null, count: 1 }));
    expect(await loadCompleteGamificationRows("facts", load)).toEqual([{ id: "a" }]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("accepts an explicitly empty complete source", async () => {
    expect(await loadCompleteGamificationRows("facts", async () => ({
      data: [], error: null, count: 0,
    }))).toEqual([]);
  });

  it.each([
    { data: [], error: null, count: null },
    { data: null, error: null, count: 0 },
    { data: [], error: null, count: 2 },
    { data: [{ id: "a" }, { id: "a" }], error: null, count: 2 },
    { data: [{ id: null }], error: null, count: 1 },
    { data: [], error: null, count: 100_001 },
    { data: [], error: null, count: -1 },
  ])("rejects an invalid or incomplete inventory: %j", async (page) => {
    await expect(loadCompleteGamificationRows("facts", async () => page)).rejects.toThrow("Incomplete gamification evidence");
  });

  it("rejects a changing count and an intermediate transport error", async () => {
    await expect(loadCompleteGamificationRows("facts", async (from) => ({
      data: [{ id: from }], error: null, count: from === 0 ? 2 : 3,
    }))).rejects.toThrow("count changed");
    await expect(loadCompleteGamificationRows("facts", async (from) => from === 0
      ? { data: [{ id: 1 }], error: null, count: 2 }
      : { data: null, error: { message: "page unavailable" }, count: null },
    )).rejects.toThrow("page unavailable");
  });
});
