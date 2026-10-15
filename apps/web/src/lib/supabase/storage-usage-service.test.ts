import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  resolveSupabaseStorageQuotaInfo: vi.fn(),
  isCronSecretConfigured: vi.fn(),
  buildStorageUsageCronStatus: vi.fn(),
  fetchAllStorageObjects: vi.fn(),
  getStorageHistoryLimit: vi.fn(),
  buildStorageUsageSnapshot: vi.fn(),
  toStorageUsageSnapshot: vi.fn(),
  buildStorageUsageHistory: vi.fn(),
  buildStorageUsageComparison: vi.fn(),
  serializeStorageUsageBreakdowns: vi.fn(),
  buildStorageBusinessContributions: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/supabase/storage-quota", () => ({
  resolveSupabaseStorageQuotaInfo: mocks.resolveSupabaseStorageQuotaInfo,
}));
vi.mock("@/lib/http/cron-auth", () => ({
  isCronSecretConfigured: mocks.isCronSecretConfigured,
}));
vi.mock("@/lib/supabase/storage-usage-cron", () => ({
  buildStorageUsageCronStatus: mocks.buildStorageUsageCronStatus,
}));
vi.mock("@/lib/supabase/storage-usage", () => ({
  fetchAllStorageObjects: mocks.fetchAllStorageObjects,
  getStorageHistoryLimit: mocks.getStorageHistoryLimit,
  buildStorageUsageSnapshot: mocks.buildStorageUsageSnapshot,
  toStorageUsageSnapshot: mocks.toStorageUsageSnapshot,
  buildStorageUsageHistory: mocks.buildStorageUsageHistory,
  buildStorageUsageComparison: mocks.buildStorageUsageComparison,
  serializeStorageUsageBreakdowns: mocks.serializeStorageUsageBreakdowns,
}));
vi.mock("@/lib/supabase/storage-business-contribution", () => ({
  buildStorageBusinessContributions: mocks.buildStorageBusinessContributions,
}));

import {
  captureStorageUsageReport,
  loadStorageUsageReport,
  StorageUsageCaptureError,
} from "./storage-usage-service";

const quotaInfo = { bytes: 1_000, source: "environment" };
const currentSnapshot = {
  snapshotMonth: "2026-10-01",
  generatedAt: "2026-10-15T12:00:00.000Z",
  quotaBytes: 1_000,
  totalBytes: 400,
  remainingBytes: 600,
  usagePercent: 40,
  objectCount: 2,
  bucketBreakdown: [{ bucket: "action-media", bytes: 400 }],
  extensionBreakdown: [{ extension: "jpg", bytes: 400 }],
  businessBreakdown: [{ category: "actions", bytes: 400 }],
  largestFiles: [],
  warnings: [],
};
const previousSnapshot = {
  ...currentSnapshot,
  snapshotMonth: "2026-09-01",
  generatedAt: "2026-09-30T12:00:00.000Z",
  totalBytes: 300,
  remainingBytes: 700,
  usagePercent: 30,
};
const previousRecord = {
  snapshot_month: "2026-09-01",
  generated_at: previousSnapshot.generatedAt,
  quota_bytes: 1_000,
  total_bytes: 300,
  remaining_bytes: 700,
  usage_percent: 30,
  object_count: 1,
  bucket_breakdown: [{ bucket: "action-media", bytes: 300 }],
  extension_breakdown: [{ extension: "jpg", bytes: 300 }],
  business_breakdown: [{ category: "actions", bytes: 300 }],
  largest_files: [],
  business_contributions: null,
  warnings: [],
};
const currentRecord = {
  ...previousRecord,
  snapshot_month: currentSnapshot.snapshotMonth,
  generated_at: currentSnapshot.generatedAt,
  total_bytes: currentSnapshot.totalBytes,
  remaining_bytes: currentSnapshot.remainingBytes,
  usage_percent: currentSnapshot.usagePercent,
  object_count: currentSnapshot.objectCount,
  bucket_breakdown: currentSnapshot.bucketBreakdown,
  extension_breakdown: currentSnapshot.extensionBreakdown,
  business_breakdown: currentSnapshot.businessBreakdown,
};
const contributionReport = {
  previousSnapshotMonth: previousSnapshot.snapshotMonth,
  historyMonths: [previousSnapshot.snapshotMonth],
  alerts: [],
  items: [{ category: "actions", totalBytes: 400 }],
};

function createSupabaseHarness() {
  const historyResponses: Array<{ data: unknown[]; error: Error | null }> = [];
  const limit = vi.fn(async () => historyResponses.shift() ?? { data: [], error: null });
  const order = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ order }));
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === "supabase_storage_usage_snapshots") return { select, upsert };
    throw new Error(`Unexpected table: ${table}`);
  });
  const schema = vi.fn(() => ({ from: vi.fn(() => ({}) ) }));
  return {
    client: { from, schema },
    historyResponses,
    limit,
    upsert,
  };
}

function configureDefaults() {
  mocks.resolveSupabaseStorageQuotaInfo.mockReturnValue(quotaInfo);
  mocks.isCronSecretConfigured.mockReturnValue(true);
  mocks.buildStorageUsageCronStatus.mockReturnValue({ configured: true, lastRunAt: null });
  mocks.fetchAllStorageObjects.mockResolvedValue([{ bucket_id: "action-media", name: "photo.jpg", metadata: { size: 400 } }]);
  mocks.getStorageHistoryLimit.mockReturnValue(3);
  mocks.buildStorageUsageSnapshot.mockReturnValue(currentSnapshot);
  mocks.toStorageUsageSnapshot.mockImplementation((record: typeof previousRecord) =>
    record.snapshot_month === previousSnapshot.snapshotMonth ? previousSnapshot : currentSnapshot,
  );
  mocks.buildStorageUsageHistory.mockReturnValue([
    { snapshotMonth: currentSnapshot.snapshotMonth, totalBytes: 400 },
    { snapshotMonth: previousSnapshot.snapshotMonth, totalBytes: 300 },
  ]);
  mocks.buildStorageUsageComparison.mockReturnValue({ previousSnapshotMonth: previousSnapshot.snapshotMonth, deltaBytes: 100 });
  mocks.serializeStorageUsageBreakdowns.mockReturnValue({
    bucket_breakdown: currentSnapshot.bucketBreakdown,
    extension_breakdown: currentSnapshot.extensionBreakdown,
    business_breakdown: currentSnapshot.businessBreakdown,
    largest_files: currentSnapshot.largestFiles,
    warnings: currentSnapshot.warnings,
  });
  mocks.buildStorageBusinessContributions.mockReturnValue(contributionReport);
}

beforeEach(() => {
  vi.clearAllMocks();
  configureDefaults();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("captureStorageUsageReport", () => {
  it("captures, persists and returns the current and previous storage snapshots", async () => {
    const harness = createSupabaseHarness();
    harness.historyResponses.push(
      { data: [previousRecord], error: null },
      { data: [currentRecord, previousRecord], error: null },
    );
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);

    const report = await captureStorageUsageReport();

    expect(report).toMatchObject({
      current: currentSnapshot,
      businessContributions: contributionReport,
      snapshotPersisted: true,
      comparison: { previousSnapshotMonth: previousSnapshot.snapshotMonth },
    });
    expect(report.history[0]).toMatchObject({
      snapshotMonth: currentSnapshot.snapshotMonth,
      bucketBreakdown: currentRecord.bucket_breakdown,
      extensionBreakdown: currentRecord.extension_breakdown,
      businessBreakdown: currentRecord.business_breakdown,
    });
    expect(harness.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_month: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        total_bytes: currentSnapshot.totalBytes,
        object_count: currentSnapshot.objectCount,
      }),
      { onConflict: "snapshot_month" },
    );
    expect(mocks.fetchAllStorageObjects).toHaveBeenCalledOnce();
  });

  it("keeps the report usable and exposes a warning when persistence returns an error", async () => {
    const harness = createSupabaseHarness();
    harness.historyResponses.push(
      { data: [previousRecord], error: null },
      { data: [previousRecord], error: null },
    );
    harness.upsert.mockImplementationOnce(async () => ({ error: new Error("snapshot unavailable") } as never));
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);

    const report = await captureStorageUsageReport();

    expect(report.snapshotPersisted).toBe(false);
    expect(report.warnings).toContain("Impossible d'enregistrer l'historique mensuel du stockage.");
  });

  it("classifies an upsert exception as a capture failure without a partial mutation", async () => {
    const harness = createSupabaseHarness();
    harness.historyResponses.push({ data: [previousRecord], error: null });
    harness.upsert.mockRejectedValueOnce(new Error("provider unavailable"));
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);

    await expect(captureStorageUsageReport()).rejects.toMatchObject({
      name: "StorageUsageCaptureError",
      stage: "capture",
      partialMutation: false,
    });
  });

  it("classifies a post-write history failure as a partial mutation", async () => {
    const harness = createSupabaseHarness();
    harness.limit
      .mockResolvedValueOnce({ data: [previousRecord], error: null })
      .mockRejectedValueOnce(new Error("history unavailable"));
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);

    const failure = captureStorageUsageReport();
    await expect(failure).rejects.toBeInstanceOf(StorageUsageCaptureError);
    expect(harness.upsert).toHaveBeenCalledOnce();
    expect(harness.limit).toHaveBeenCalledTimes(2);
    await expect(failure).rejects.toMatchObject({
      stage: "post_write",
      partialMutation: true,
    });
  });
});

describe("loadStorageUsageReport", () => {
  it("returns an explicit empty state when no snapshot has been stored", async () => {
    const harness = createSupabaseHarness();
    harness.historyResponses.push({ data: [], error: null });
    mocks.buildStorageUsageSnapshot.mockReturnValue({ ...currentSnapshot, totalBytes: 0, objectCount: 0 });
    mocks.buildStorageUsageComparison.mockReturnValue({ previousSnapshotMonth: null });
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);

    const report = await loadStorageUsageReport();

    expect(report.history).toEqual([]);
    expect(report.snapshotPersisted).toBe(false);
    expect(report.businessContributions.items).toEqual([]);
    expect(report.warnings.join(" ")).toContain("Aucun snapshot de stockage");
  });

  it("normalizes malformed persisted contributions and rebuilds the useful report", async () => {
    const harness = createSupabaseHarness();
    harness.historyResponses.push({
      data: [{ ...currentRecord, business_contributions: { alerts: "invalid", items: [] } }],
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(harness.client);
    mocks.buildStorageBusinessContributions.mockReturnValueOnce({
      previousSnapshotMonth: null,
      historyMonths: [],
      alerts: [],
      items: [{ category: "actions", totalBytes: 400 }],
    });

    const report = await loadStorageUsageReport();

    expect(report.snapshotPersisted).toBe(true);
    expect(report.businessContributions.items).toEqual([{ category: "actions", totalBytes: 400 }]);
    expect(report.businessContributions.alerts).toEqual([]);
    expect(mocks.buildStorageBusinessContributions).toHaveBeenCalledWith(
      expect.objectContaining({ objects: [], currentSnapshot, previousSnapshot: null, historyRecords: expect.any(Array) }),
    );
  });
});
