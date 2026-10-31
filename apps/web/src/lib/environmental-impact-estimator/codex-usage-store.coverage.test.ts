import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseMock = vi.hoisted(() => vi.fn(() => false));
const allowFallbackMock = vi.hoisted(() => vi.fn(() => true));
const readLocalMock = vi.hoisted(() => vi.fn());
const writeLocalMock = vi.hoisted(() => vi.fn(async () => undefined));
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: canUseSupabaseMock,
  allowLocalFileStoreFallback: allowFallbackMock,
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalMock,
  writeLocalRecordStore: writeLocalMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseMock }));

import {
  buildCodexUsageWeeklySnapshot,
  getCodexUsageWeeklySnapshot,
  listCodexUsageWeeklySnapshots,
  upsertCodexUsageWeeklySnapshot,
} from "./codex-usage-store";

function snapshot(overrides: Record<string, unknown> = {}) {
  return buildCodexUsageWeeklySnapshot({ weekStart: "2026-10-19", weekEnd: "2026-10-25", ...overrides } as never);
}

function supabaseTable(result: unknown, listResult: unknown = result) {
  const table = {
    upsert: vi.fn(async () => result),
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    order: vi.fn(() => table),
    limit: vi.fn(async () => listResult),
    maybeSingle: vi.fn(async () => result),
  };
  return table;
}

describe("Codex usage store business rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseMock.mockReturnValue(false);
    allowFallbackMock.mockReturnValue(true);
    readLocalMock.mockResolvedValue({ updatedAt: "2026-10-27T00:00:00Z", records: [] });
  });

  it("normalizes missing, negative and invalid measures without inventing CO2e", () => {
    const result = buildCodexUsageWeeklySnapshot({
      weekStart: "invalid",
      weekEnd: "2026-10-12",
      sessionCount: -1,
      activeMinutes: Number.NaN,
      notes: ["ok", 3 as never],
      source: "reconstructed",
    });

    expect(result.weekStart).toBe("2026-10-12");
    expect(result.weekEnd).toBe("2026-10-12");
    expect(result.sessionCount).toBe(0);
    expect(result.activeMinutes).toBe(0);
    expect(result.estimatedKgCo2eProxy).toBeNull();
    expect(result.notes).toEqual(["ok", "Activité Codex observée; facteur physique audité absent, impact CO2e = NA."]);
    expect(result.confidencePercent).toBe(76);
  });

  it("uses the canonical Monday week boundary without consulting the host timezone", () => {
    const result = buildCodexUsageWeeklySnapshot({
      weekStart: "invalid",
      weekEnd: "2026-10-11T23:30:00-02:00",
    });

    expect(result.weekStart).toBe("2026-10-12");
    expect(result.weekEnd).toBe("2026-10-12");
  });

  it("repairs reversed ranges, filters duplicate local records and sorts the result", async () => {
    const older = snapshot({ weekStart: "2026-10-12", weekEnd: "2026-10-18" });
    const current = snapshot({ weekStart: "2026-10-19", weekEnd: "2026-10-25" });
    readLocalMock.mockResolvedValue({ updatedAt: "now", records: [older, current] });

    await upsertCodexUsageWeeklySnapshot({ ...current, activeMinutes: 9 });
    expect(writeLocalMock).toHaveBeenCalledWith(expect.stringContaining("codex_usage_weekly_snapshots.json"), expect.arrayContaining([expect.objectContaining({ activeMinutes: 9 })]));
    const writtenRecords = Array.from(writeLocalMock.mock.calls[0] ?? [])[1] as unknown[];
    expect(writtenRecords[0]).toMatchObject({ activeMinutes: 9 });
    expect(await getCodexUsageWeeklySnapshot("2026-10-12")).toMatchObject({ weekStart: "2026-10-12" });
    expect((await listCodexUsageWeeklySnapshots(1))).toHaveLength(1);
  });

  it("uses Supabase rows when available and preserves nullable proxy values", async () => {
    canUseSupabaseMock.mockReturnValue(true);
    const row = { id: 7, snapshot_key: "cleanmymap-codex-usage", week_start: "2026-10-19", week_end: "2026-10-25", generated_at: "2026-10-27T00:00:00Z", version: "v1", source: "manual", session_count: null, confidence_percent: null, uncertainty_percent: null, notes: ["ok", 4], meta: null };
    const table = supabaseTable({ data: row, error: null }, { data: [row], error: null });
    getSupabaseMock.mockReturnValue({ from: vi.fn(() => table) });

    const current = snapshot();
    await upsertCodexUsageWeeklySnapshot(current);
    expect(table.upsert).toHaveBeenCalledWith(expect.objectContaining({ snapshot_key: "cleanmymap-codex-usage" }), { onConflict: "snapshot_key,week_start" });
    await expect(getCodexUsageWeeklySnapshot("2026-10-19")).resolves.toMatchObject({ id: "7", estimatedKgCo2eProxy: null, notes: ["ok"] });
    await expect(listCodexUsageWeeklySnapshots()).resolves.toEqual([expect.objectContaining({ id: "7" })]);
  });

  it("falls back locally when allowed and fails closed when persistence is mandatory", async () => {
    canUseSupabaseMock.mockReturnValue(true);
    const table = supabaseTable({ data: null, error: { message: "db down" } });
    getSupabaseMock.mockReturnValue({ from: vi.fn(() => table) });

    await expect(getCodexUsageWeeklySnapshot("missing")).resolves.toBeNull();
    await expect(listCodexUsageWeeklySnapshots()).resolves.toEqual([]);

    allowFallbackMock.mockReturnValue(false);
    await expect(upsertCodexUsageWeeklySnapshot(snapshot())).rejects.toThrow("persistence failed");
    await expect(getCodexUsageWeeklySnapshot("missing")).rejects.toThrow("lookup failed");
    await expect(listCodexUsageWeeklySnapshots()).resolves.toEqual([]);
  });
});
