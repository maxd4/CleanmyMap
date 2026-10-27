import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentalImpactSnapshotRecord } from "./types";

const canUseSupabaseMock = vi.hoisted(() => vi.fn(() => false));
const allowFallbackMock = vi.hoisted(() => vi.fn(() => true));
const readLocalMock = vi.hoisted(() => vi.fn());
const writeLocalMock = vi.hoisted(() => vi.fn(async () => undefined));
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({ canUseSupabaseServerPersistence: canUseSupabaseMock, allowLocalFileStoreFallback: allowFallbackMock }));
vi.mock("@/lib/persistence/local-record-store", () => ({ readLocalRecordStore: readLocalMock, writeLocalRecordStore: writeLocalMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseMock }));

import { getEnvironmentalImpactSnapshotDate, listEnvironmentalImpactSnapshots, upsertEnvironmentalImpactSnapshot } from "./snapshot-store";

const model = { site: { totalKgCo2eProxy: 4 }, user: { totalKgCo2eProxy: 2 } };
const snapshot = {
  id: "s1", snapshotKey: "cleanmymap-project", snapshotDate: "2026-10-27", generatedAt: "2026-10-27T12:00:00Z", version: "v1",
  totalKgCo2eProxy: 6, monthlyKgCo2eProxy: 2, annualKgCo2eProxy: 24, siteKgCo2eProxy: 4, userKgCo2eProxy: 2,
  confidencePercent: 80, uncertaintyPercent: 20, launchedAt: null, accountCreatedAt: null, model, signals: { periodDays: 30, notes: [] },
} as unknown as EnvironmentalImpactSnapshotRecord;

function table(result: unknown) {
  const chain = {
    upsert: vi.fn(async () => result), select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain), limit: vi.fn(async () => result),
  };
  return chain;
}

describe("environmental impact snapshot store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseMock.mockReturnValue(false);
    allowFallbackMock.mockReturnValue(true);
    readLocalMock.mockResolvedValue({ updatedAt: "now", records: [snapshot] });
  });

  it("uses the generated day and current day only for invalid dates", () => {
    vi.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
    expect(getEnvironmentalImpactSnapshotDate("2026-10-26T23:00:00-02:00")).toBe("2026-10-27");
    expect(getEnvironmentalImpactSnapshotDate("not-a-date")).toBe("2026-10-27");
  });

  it("upserts locally by snapshot identity and limits history", async () => {
    await upsertEnvironmentalImpactSnapshot({ ...snapshot, totalKgCo2eProxy: 9 });
    expect(writeLocalMock).toHaveBeenCalledWith(expect.stringContaining("environmental_impact_snapshots.json"), [expect.objectContaining({ totalKgCo2eProxy: 9 })]);
  });

  it("normalizes nullable Supabase proxy columns from the model and lists ordered rows", async () => {
    canUseSupabaseMock.mockReturnValue(true);
    const row = { id: 12, snapshot_key: "cleanmymap-project", snapshot_date: "2026-10-27", generated_at: "2026-10-27T12:00:00Z", version: "v1", total_kg_co2e_proxy: 6, monthly_kg_co2e_proxy: 2, annual_kg_co2e_proxy: 24, site_kg_co2e_proxy: null, user_kg_co2e_proxy: null, confidence_percent: null, uncertainty_percent: null, launched_at: null, account_created_at: null, model, signals: { periodDays: 30, notes: [] } };
    const supabaseTable = table({ data: [row], error: null });
    getSupabaseMock.mockReturnValue({ from: vi.fn(() => supabaseTable) });

    await upsertEnvironmentalImpactSnapshot(snapshot);
    const rows = await listEnvironmentalImpactSnapshots(1);
    expect(rows).toEqual([expect.objectContaining({ id: "12", siteKgCo2eProxy: 4, userKgCo2eProxy: 2, confidencePercent: 0 })]);
  });

  it("falls back when allowed and returns safe empty data when mandatory persistence is unavailable", async () => {
    canUseSupabaseMock.mockReturnValue(true);
    const failed = table({ data: null, error: { message: "db unavailable" } });
    getSupabaseMock.mockReturnValue({ from: vi.fn(() => failed) });
    await expect(listEnvironmentalImpactSnapshots()).resolves.toEqual([snapshot]);
    allowFallbackMock.mockReturnValue(false);
    await expect(listEnvironmentalImpactSnapshots()).resolves.toEqual([]);
    await expect(upsertEnvironmentalImpactSnapshot(snapshot)).rejects.toThrow("persistence failed");
  });
});
