import { describe, expect, it } from "vitest";
import {
  buildStorageUsageComparison,
  buildStorageUsageHistory,
  getStorageHistoryLimit,
  serializeStorageUsageBreakdowns,
  toStorageUsageSnapshot,
} from "./storage-usage-history";

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    generated_at: "2026-10-27T12:00:00.000Z",
    snapshot_month: "2026-10-01",
    quota_bytes: 1_000,
    total_bytes: 800,
    remaining_bytes: 200,
    usage_percent: 80,
    object_count: 2,
    bucket_breakdown: [{ key: "actions", label: "Actions", bytes: 800, count: 2 }],
    extension_breakdown: [{ key: "pdf", label: "Document", bytes: 800, count: 2 }],
    business_breakdown: [],
    largest_files: [],
    warnings: ["warning"],
    ...overrides,
  } as never;
}

describe("storage usage history projections", () => {
  it("normalizes persisted arrays, numeric strings and remaining labels", () => {
    const normalized = toStorageUsageSnapshot(snapshot({
      total_bytes: 1_024,
      remaining_bytes: -24,
      usage_percent: "102.4",
      bucket_breakdown: null,
      extension_breakdown: "invalid",
      business_breakdown: [{ key: "impact", label: "Impact", bytes: 1, count: 1 }],
      largest_files: null,
      warnings: null,
    }));

    expect(normalized).toMatchObject({
      totalLabel: "1 KB",
      remainingLabel: "0 B",
      usagePercent: 102.4,
      bucketCount: 0,
      bucketBreakdown: [],
      extensionBreakdown: [],
      businessBreakdown: [{ key: "impact" }],
      largestFiles: [],
      warnings: [],
      source: "default_free",
    });
  });

  it("serializes all breakdowns without dropping zero or empty projections", () => {
    const current = toStorageUsageSnapshot(snapshot(), "configured_bytes");
    expect(serializeStorageUsageBreakdowns(current)).toEqual({
      bucket_breakdown: current.bucketBreakdown,
      extension_breakdown: current.extensionBreakdown,
      business_breakdown: current.businessBreakdown,
      largest_files: current.largestFiles,
      warnings: current.warnings,
    });
    expect(current.source).toBe("configured_bytes");
  });

  it("computes positive, negative and newly observed breakdown deltas deterministically", () => {
    const current = toStorageUsageSnapshot(snapshot({
      snapshot_month: "2026-11-01",
      total_bytes: 1_200,
      bucket_breakdown: [
        { key: "actions", label: "Actions", bytes: 1_000, count: 2 },
        { key: "photos", label: "Photos", bytes: 200, count: 1 },
      ],
      extension_breakdown: [],
    }));
    const previous = toStorageUsageSnapshot(snapshot({
      total_bytes: 1_000,
      bucket_breakdown: [
        { key: "actions", label: "Actions", bytes: 1_100, count: 2 },
        { key: "old", label: "Ancien", bytes: 100, count: 1 },
      ],
      extension_breakdown: [],
    }));

    const comparison = buildStorageUsageComparison(current, previous);
    expect(comparison).toMatchObject({ previousSnapshotMonth: "2026-10-01", deltaBytes: 200, deltaPercent: 20 });
    expect(comparison.bucketGrowth).toEqual([
      expect.objectContaining({ key: "photos", previousBytes: 0, deltaBytes: 200, deltaPercent: null }),
      expect.objectContaining({ key: "actions", previousBytes: 1_100, deltaBytes: -100, deltaPercent: expect.closeTo(-9.0909, 3) }),
    ]);
  });

  it("returns null growth against no usable previous total and orders a bounded history", () => {
    const current = toStorageUsageSnapshot(snapshot({ total_bytes: 10 }));
    expect(buildStorageUsageComparison(current, null)).toMatchObject({
      previousSnapshotMonth: null,
      deltaBytes: 10,
      deltaPercent: null,
      bucketGrowth: expect.any(Array),
    });

    const history = buildStorageUsageHistory([
      snapshot({ snapshot_month: "invalid-month", usage_percent: "bad" }),
      snapshot({ snapshot_month: "2026-08-01", usage_percent: "20" }),
      snapshot({ snapshot_month: "2026-10-01", usage_percent: 10 }),
    ]);
    expect(history.map((item) => item.snapshotMonth)).toEqual(["invalid-month", "2026-10-01", "2026-08-01"]);
    expect(history[0]).toMatchObject({ monthLabel: "invalid-month", usagePercent: NaN });
    expect(getStorageHistoryLimit()).toBe(12);
  });
});
