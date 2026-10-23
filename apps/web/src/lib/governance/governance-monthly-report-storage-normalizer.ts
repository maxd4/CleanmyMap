import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";
import type { GovernanceMonthlyReportPayload } from "./governance-monthly-report-store";

export function normalizeStoragePayload(
  payload: GovernanceMonthlyReportPayload["storage"] | null | undefined,
): GovernanceMonthlyReportPayload["storage"] {
  const emptyBusinessContributions: StorageBusinessContributionReport = {
    previousSnapshotMonth: null,
    historyMonths: [],
    alerts: [],
    items: [],
  };

  if (!payload) {
    return {
      quotaBytes: 0,
      quotaLabel: "0 B",
      totalBytes: 0,
      totalLabel: "0 B",
      remainingBytes: 0,
      remainingLabel: "0 B",
      usagePercent: 0,
      objectCount: 0,
      snapshotCount: 0,
      latestSnapshotMonth: null,
      deltaBytes: 0,
      deltaPercent: null,
      topBucketLabel: null,
      topBucketBytes: 0,
      topExtensionLabel: null,
      topExtensionBytes: 0,
      growthHighlights: [],
      topContributionLabel: null,
      topContributionBytes: 0,
      topContributionSharePercent: 0,
      topContributionDeltaBytes: 0,
      topContributionDeltaPercent: null,
      fastestGrowingLabel: null,
      fastestGrowingBytes: 0,
      fastestGrowingDeltaBytes: 0,
      fastestGrowingDeltaPercent: null,
      businessContributions: emptyBusinessContributions,
      contributionHighlights: [],
    };
  }

  return {
    quotaBytes: payload.quotaBytes ?? 0,
    quotaLabel: payload.quotaLabel ?? "0 B",
    totalBytes: payload.totalBytes ?? 0,
    totalLabel: payload.totalLabel ?? "0 B",
    remainingBytes: payload.remainingBytes ?? 0,
    remainingLabel: payload.remainingLabel ?? "0 B",
    usagePercent: payload.usagePercent ?? 0,
    objectCount: payload.objectCount ?? 0,
    snapshotCount: payload.snapshotCount ?? 0,
    latestSnapshotMonth: payload.latestSnapshotMonth ?? null,
    deltaBytes: payload.deltaBytes ?? 0,
    deltaPercent: payload.deltaPercent ?? null,
    topBucketLabel: payload.topBucketLabel ?? null,
    topBucketBytes: payload.topBucketBytes ?? 0,
    topExtensionLabel: payload.topExtensionLabel ?? null,
    topExtensionBytes: payload.topExtensionBytes ?? 0,
    topContributionLabel: payload.topContributionLabel ?? null,
    topContributionBytes: payload.topContributionBytes ?? 0,
    topContributionSharePercent: payload.topContributionSharePercent ?? 0,
    topContributionDeltaBytes: payload.topContributionDeltaBytes ?? 0,
    topContributionDeltaPercent: payload.topContributionDeltaPercent ?? null,
    fastestGrowingLabel: payload.fastestGrowingLabel ?? null,
    fastestGrowingBytes: payload.fastestGrowingBytes ?? 0,
    fastestGrowingDeltaBytes: payload.fastestGrowingDeltaBytes ?? 0,
    fastestGrowingDeltaPercent: payload.fastestGrowingDeltaPercent ?? null,
    businessContributions: {
      previousSnapshotMonth: payload.businessContributions?.previousSnapshotMonth ?? null,
      historyMonths: Array.isArray(payload.businessContributions?.historyMonths) ? payload.businessContributions.historyMonths : [],
      alerts: Array.isArray(payload.businessContributions?.alerts) ? payload.businessContributions.alerts : [],
      items: Array.isArray(payload.businessContributions?.items)
        ? payload.businessContributions.items.map((item) => ({
            ...item,
            currentAverageBytes: item.currentAverageBytes ?? 0,
            currentSharePercent: item.currentSharePercent ?? 0,
            previousBytes: item.previousBytes ?? 0,
            previousCount: item.previousCount ?? 0,
            deltaBytes: item.deltaBytes ?? 0,
            deltaPercent: item.deltaPercent ?? null,
            deltaCount: item.deltaCount ?? 0,
            cumulative3MonthBytes: item.cumulative3MonthBytes ?? 0,
            cumulative3MonthPercent: item.cumulative3MonthPercent ?? null,
            accelerationBytes: item.accelerationBytes ?? 0,
            accelerationPercent: item.accelerationPercent ?? null,
            history: Array.isArray(item.history) ? item.history : [],
            topFiles: Array.isArray(item.topFiles) ? item.topFiles : [],
            mimeSubtypes: Array.isArray(item.mimeSubtypes) ? item.mimeSubtypes : [],
            alerts: Array.isArray(item.alerts) ? item.alerts : [],
          }))
        : [],
    },
    growthHighlights: Array.isArray(payload.growthHighlights) ? payload.growthHighlights : [],
    contributionHighlights: Array.isArray(payload.contributionHighlights) ? payload.contributionHighlights : [],
  };
}
