import { describe, expect, it } from "vitest";
import {
  buildStorageBusinessContributionHistoryPoints,
  selectStorageBusinessContributionHistory,
} from "./storage-business-contribution-history";
import {
  buildStorageUsageSnapshot,
  type StorageQuotaInfo,
  type StorageUsageSnapshot,
  type StorageUsageSnapshotRecord,
} from "./storage-usage";

const quotaInfo: StorageQuotaInfo = {
  bytes: 100_000,
  label: "97.66 KB",
  source: "configured_bytes",
  configuredValue: "100000",
};

describe("storage business contribution history", () => {
  it("excludes the duplicate current record, orders descending, and limits to four months", () => {
    const current = snapshot("2026-05-01", 100, 10);
    const records = ["2026-05-01", "2026-04-01", "2026-03-01", "2026-02-01", "2026-01-01"]
      .map((month, index) => record(month, 100 - index * 20, 10 - index));

    expect(selectStorageBusinessContributionHistory(records, current).map((item) => item.snapshotMonth)).toEqual([
      "2026-05-01",
      "2026-04-01",
      "2026-03-01",
      "2026-02-01",
    ]);
  });

  it("computes monthly delta, cumulative three-month delta, and acceleration", () => {
    const points = buildStorageBusinessContributionHistoryPoints(
      [
        snapshot("2026-05-01", 100, 10),
        snapshot("2026-04-01", 80, 8),
        snapshot("2026-03-01", 50, 5),
        snapshot("2026-02-01", 20, 2),
      ],
      "actions_terrain",
    );

    expect(points[0]).toMatchObject({
      snapshotMonth: "2026-05-01",
      deltaBytes: 20,
      deltaCount: 2,
      deltaPercent: 25,
      cumulative3MonthBytes: 50,
      cumulative3MonthPercent: 100,
      accelerationBytes: -10,
      accelerationPercent: -33.33333333333333,
    });
  });

  it("uses null percentages and zero baselines for a first snapshot", () => {
    const [point] = buildStorageBusinessContributionHistoryPoints(
      [snapshot("2026-05-01", 100, 10)],
      "actions_terrain",
    );

    expect(point).toMatchObject({
      deltaBytes: 100,
      deltaCount: 10,
      deltaPercent: null,
      cumulative3MonthBytes: 100,
      cumulative3MonthPercent: null,
      accelerationBytes: 100,
      accelerationPercent: null,
    });
  });
});

function snapshot(month: string, bytes: number, count: number): StorageUsageSnapshot {
  return {
    ...buildStorageUsageSnapshot([], quotaInfo, `${month}T12:00:00.000Z`),
    snapshotMonth: month,
    businessBreakdown: [
      {
        key: "actions_terrain",
        label: "Actions terrain",
        bytes,
        count,
        sharePercent: bytes / 10,
        averageBytes: count > 0 ? bytes / count : 0,
      },
    ],
  };
}

function record(month: string, bytes: number, count: number): StorageUsageSnapshotRecord {
  return {
    snapshot_month: month,
    generated_at: `${month}T12:00:00.000Z`,
    quota_bytes: quotaInfo.bytes,
    total_bytes: bytes,
    remaining_bytes: quotaInfo.bytes - bytes,
    usage_percent: bytes / quotaInfo.bytes * 100,
    object_count: count,
    bucket_breakdown: [],
    extension_breakdown: [],
    business_breakdown: [{
      key: "actions_terrain",
      label: "Actions terrain",
      bytes,
      count,
      sharePercent: bytes / 10,
      averageBytes: count > 0 ? bytes / count : 0,
    }],
    largest_files: [],
    business_contributions: [],
    warnings: [],
  };
}
