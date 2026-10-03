import type {
  StorageBusinessDomainId,
} from "./storage-business-taxonomy";
import {
  toStorageUsageSnapshot,
  type StorageUsageSnapshot,
  type StorageUsageSnapshotRecord,
} from "./storage-usage";
import type { StorageBusinessContributionHistoryPoint } from "./storage-business-contribution-contracts";

const STORAGE_BUSINESS_CONTRIBUTION_HISTORY_LIMIT = 4;

function formatMonthLabel(snapshotMonth: string): string {
  const parsed = new Date(`${snapshotMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return snapshotMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function selectStorageBusinessContributionHistory(
  historyRecords: StorageUsageSnapshotRecord[] | undefined,
  currentSnapshot: StorageUsageSnapshot,
): StorageUsageSnapshot[] {
  const snapshots = [currentSnapshot];
  for (const record of historyRecords ?? []) {
    if (record.snapshot_month === currentSnapshot.snapshotMonth) {
      continue;
    }
    snapshots.push(toStorageUsageSnapshot(record, currentSnapshot.source));
  }

  return snapshots
    .slice()
    .sort((left, right) => right.snapshotMonth.localeCompare(left.snapshotMonth))
    .slice(0, STORAGE_BUSINESS_CONTRIBUTION_HISTORY_LIMIT);
}

export function buildStorageBusinessContributionHistoryPoints(
  snapshots: StorageUsageSnapshot[],
  domainId: StorageBusinessDomainId,
): StorageBusinessContributionHistoryPoint[] {
  const points = snapshots
    .map((snapshot) => {
      const item = snapshot.businessBreakdown.find((entry) => entry.key === domainId);
      return {
        snapshotMonth: snapshot.snapshotMonth,
        monthLabel: formatMonthLabel(snapshot.snapshotMonth),
        currentBytes: item?.bytes ?? 0,
        currentCount: item?.count ?? 0,
        sharePercent: item?.sharePercent ?? 0,
      };
    })
    .sort((left, right) => right.snapshotMonth.localeCompare(left.snapshotMonth));

  return points.map((point, index) => {
    const previous = points[index + 1] ?? null;
    const older = points[index + 2] ?? null;
    const deltaBytes = point.currentBytes - (previous?.currentBytes ?? 0);
    const deltaCount = point.currentCount - (previous?.currentCount ?? 0);
    const deltaPercent =
      previous && previous.currentBytes > 0
        ? (deltaBytes / previous.currentBytes) * 100
        : null;
    const cumulative3MonthBytes = point.currentBytes - (older?.currentBytes ?? 0);
    const cumulative3MonthPercent =
      older && older.currentBytes > 0
        ? (cumulative3MonthBytes / older.currentBytes) * 100
        : null;
    const previousDelta = previous
      ? previous.currentBytes - (older?.currentBytes ?? 0)
      : 0;
    const accelerationBytes = deltaBytes - previousDelta;
    const accelerationPercent =
      previousDelta !== 0 ? (accelerationBytes / Math.abs(previousDelta)) * 100 : null;

    return {
      ...point,
      deltaBytes,
      deltaCount,
      deltaPercent,
      cumulative3MonthBytes,
      cumulative3MonthPercent,
      accelerationBytes,
      accelerationPercent,
    };
  });
}
