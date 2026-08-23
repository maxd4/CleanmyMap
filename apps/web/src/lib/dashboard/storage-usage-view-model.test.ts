import { describe, expect, it } from "vitest";
import {
  buildStorageUsageChartData,
  buildStorageUsageViewModel,
  formatStorageUsageDelta,
  formatStorageUsagePercent,
  normalizeStorageUsageComparison,
  type StorageUsageResponse,
} from "./storage-usage-view-model";

const gigabyte = 1024 * 1024 * 1024;

describe("storage usage view model", () => {
  it("preserves chart ordering, GB conversion and quota fallback", () => {
    const history = [
      {
        monthLabel: "Janvier",
        totalBytes: 2 * gigabyte,
        usagePercent: 20,
      },
      {
        monthLabel: "Février",
        totalBytes: 3 * gigabyte,
        usagePercent: 30,
      },
    ] as StorageUsageResponse["history"];

    expect(buildStorageUsageChartData(history, null)).toEqual([
      {
        monthLabel: "Février",
        usedGb: 3,
        quotaGb: 1,
        usagePercent: 30,
      },
      {
        monthLabel: "Janvier",
        usedGb: 2,
        quotaGb: 1,
        usagePercent: 20,
      },
    ]);
  });

  it("preserves formatting and empty comparison defaults", () => {
    expect(formatStorageUsagePercent(12.34)).toBe("12,3");
    expect(formatStorageUsageDelta(0)).toBe("0 B");
    expect(formatStorageUsageDelta(gigabyte)).toBe("+1 GB");
    expect(normalizeStorageUsageComparison(undefined)).toEqual({
      previousSnapshotMonth: null,
      deltaBytes: 0,
      deltaPercent: null,
      bucketGrowth: [],
      extensionGrowth: [],
    });
  });

  it("keeps the empty view model safe for loading and empty states", () => {
    expect(buildStorageUsageViewModel(undefined)).toEqual({
      chartData: [],
      comparisonData: {
        previousSnapshotMonth: null,
        deltaBytes: 0,
        deltaPercent: null,
        bucketGrowth: [],
        extensionGrowth: [],
      },
    });
  });
});
