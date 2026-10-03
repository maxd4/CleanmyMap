import {
  listStorageBusinessDomains,
} from "./storage-business-taxonomy";
import type {
  StorageUsageObjectRow,
  StorageUsageSnapshotRecord,
  StorageUsageSnapshot,
  StorageUsageBreakdownItem,
} from "./storage-usage";
import { STORAGE_BUSINESS_CONTRIBUTION_POLICY } from "./storage-business-contribution-policy";
import {
  buildStorageBusinessContributionAlerts,
  buildStorageBusinessContributionAlertId,
  getAlertSeverityRank,
  getAlertSignalRank,
  pushStorageBusinessContributionAlert,
} from "./storage-business-contribution-alerts";
import {
  buildStorageBusinessContributionMimeSubtypesByDomain,
  buildStorageBusinessContributionTopFilesByDomain,
} from "./storage-business-contribution-analysis";
import {
  buildStorageBusinessContributionHistoryPoints,
  selectStorageBusinessContributionHistory,
} from "./storage-business-contribution-history";
import type {
  StorageBusinessContributionAlert,
  StorageBusinessContributionItem,
  StorageBusinessContributionReport,
} from "./storage-business-contribution-contracts";

export type {
  StorageBusinessContributionAlert,
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionItem,
  StorageBusinessContributionReport,
} from "./storage-business-contribution-contracts";

function getItemPriorityScore(item: {
  currentBytes: number;
  currentSharePercent: number;
  deltaBytes: number;
  alerts: StorageBusinessContributionAlert[];
}): number {
  const criticalAlertScore = item.alerts.reduce((max, alert) => {
    const signalRank = getAlertSignalRank(alert.signal);
    const severityRank = getAlertSeverityRank(alert.severity);
    return Math.max(max, severityRank * 10 + signalRank);
  }, 0);

  const quotaPriority = item.currentSharePercent >= STORAGE_BUSINESS_CONTRIBUTION_POLICY.priorityQuotaCriticalPercent ? 100 : 0;
  const shareScore = Math.round(item.currentSharePercent * 2);
  const growthScore = item.deltaBytes > 0
    ? Math.min(
        STORAGE_BUSINESS_CONTRIBUTION_POLICY.priorityGrowthCap,
        Math.round(item.deltaBytes / STORAGE_BUSINESS_CONTRIBUTION_POLICY.priorityGrowthBytesPerPoint),
      )
    : 0;

  return quotaPriority + criticalAlertScore + shareScore + growthScore;
}

function sortContributionItems(
  items: StorageBusinessContributionItem[],
): StorageBusinessContributionItem[] {
  return items
    .filter((item) => item.currentBytes > 0 || item.previousBytes > 0)
    .sort((left, right) => {
      const leftPriority = getItemPriorityScore(left);
      const rightPriority = getItemPriorityScore(right);
      if (rightPriority !== leftPriority) {
        return rightPriority - leftPriority;
      }
      if (right.currentBytes !== left.currentBytes) {
        return right.currentBytes - left.currentBytes;
      }
      if (right.deltaBytes !== left.deltaBytes) {
        return right.deltaBytes - left.deltaBytes;
      }
      return left.label.localeCompare(right.label, "fr");
    });
}

function sortContributionAlerts(
  alerts: StorageBusinessContributionAlert[],
): StorageBusinessContributionAlert[] {
  return alerts.sort((left, right) => {
    const leftRank = getAlertSeverityRank(left.severity);
    const rightRank = getAlertSeverityRank(right.severity);
    if (rightRank !== leftRank) {
      return rightRank - leftRank;
    }
    const leftSignalRank = getAlertSignalRank(left.signal);
    const rightSignalRank = getAlertSignalRank(right.signal);
    if (rightSignalRank !== leftSignalRank) {
      return rightSignalRank - leftSignalRank;
    }
    if (right.currentSharePercent !== left.currentSharePercent) {
      return right.currentSharePercent - left.currentSharePercent;
    }
    return left.label.localeCompare(right.label, "fr");
  });
}

function buildPhotoDominanceGlobalAlert(
  items: StorageBusinessContributionItem[],
): StorageBusinessContributionAlert | null {
  const topPhotoItem = items.find((item) => item.id === "pieces_jointes_photo") ?? null;
  if (!topPhotoItem || items[0]?.id !== "pieces_jointes_photo") {
    return null;
  }

  const currentHistory = topPhotoItem.history[0] ?? null;
  return {
    id: buildStorageBusinessContributionAlertId(
      "pieces_jointes_photo",
      "photo-dominance-global",
      currentHistory?.snapshotMonth ?? "current",
    ),
    domainId: "pieces_jointes_photo",
    label: topPhotoItem.label,
    title: "Les pièces jointes photo dominent",
    message: "Les pièces jointes photo sont la catégorie métier la plus coûteuse du mois.",
    severity: topPhotoItem.currentSharePercent >= 40 ? "critical" : "warning",
    signal: "photoDominance",
    snapshotMonth: currentHistory?.snapshotMonth ?? "current",
    currentBytes: topPhotoItem.currentBytes,
    thresholdBytes: null,
    currentSharePercent: topPhotoItem.currentSharePercent,
    thresholdSharePercent: topPhotoItem.currentSharePercent >= 40 ? 40 : 30,
  };
}

function getBreakdownNumber(
  item: StorageUsageBreakdownItem | undefined,
  key: "bytes" | "count" | "sharePercent" | "averageBytes",
): number {
  return item?.[key] ?? 0;
}

function getLatestHistoryNumber(
  history: ReturnType<typeof buildStorageBusinessContributionHistoryPoints>,
  key: "cumulative3MonthBytes" | "accelerationBytes",
  fallback: number,
): number {
  return history[0]?.[key] ?? fallback;
}

function getLatestHistoryPercent(
  history: ReturnType<typeof buildStorageBusinessContributionHistoryPoints>,
  key: "cumulative3MonthPercent" | "accelerationPercent",
): number | null {
  return history[0]?.[key] ?? null;
}

function buildContributionItemMeasurements(
  current: StorageUsageBreakdownItem | undefined,
  previous: StorageUsageBreakdownItem | undefined,
  history: ReturnType<typeof buildStorageBusinessContributionHistoryPoints>,
) {
  const currentBytes = getBreakdownNumber(current, "bytes");
  const previousBytes = getBreakdownNumber(previous, "bytes");
  const deltaBytes = currentBytes - previousBytes;

  return {
    currentBytes,
    currentCount: getBreakdownNumber(current, "count"),
    currentSharePercent: getBreakdownNumber(current, "sharePercent"),
    currentAverageBytes: getBreakdownNumber(current, "averageBytes"),
    previousBytes,
    previousCount: getBreakdownNumber(previous, "count"),
    deltaBytes,
    deltaPercent: previousBytes > 0 ? (deltaBytes / previousBytes) * 100 : null,
    deltaCount: getBreakdownNumber(current, "count") - getBreakdownNumber(previous, "count"),
    cumulative3MonthBytes: getLatestHistoryNumber(history, "cumulative3MonthBytes", deltaBytes),
    cumulative3MonthPercent: getLatestHistoryPercent(history, "cumulative3MonthPercent"),
    accelerationBytes: getLatestHistoryNumber(history, "accelerationBytes", 0),
    accelerationPercent: getLatestHistoryPercent(history, "accelerationPercent"),
  };
}

function buildContributionItem(params: {
  domain: ReturnType<typeof listStorageBusinessDomains>[number];
  currentSnapshot: StorageUsageSnapshot;
  previousById: Map<string, StorageUsageBreakdownItem>;
  topFilesByDomain: ReturnType<typeof buildStorageBusinessContributionTopFilesByDomain>;
  mimeSubtypesByDomain: ReturnType<typeof buildStorageBusinessContributionMimeSubtypesByDomain>;
  historySnapshots: StorageUsageSnapshot[];
  reportAlerts: StorageBusinessContributionAlert[];
}): StorageBusinessContributionItem {
  const { domain, currentSnapshot, previousById, topFilesByDomain, mimeSubtypesByDomain, historySnapshots, reportAlerts } = params;
  const current = currentSnapshot.businessBreakdown.find((item) => item.key === domain.id);
  const previous = previousById.get(domain.id);
  const history = buildStorageBusinessContributionHistoryPoints(historySnapshots, domain.id);
  const measurements = buildContributionItemMeasurements(current, previous, history);
  const topFiles = topFilesByDomain.get(domain.id) ?? [];
  const alerts = buildStorageBusinessContributionAlerts({
    domainId: domain.id,
    label: domain.label,
    history,
    currentBytes: measurements.currentBytes,
    currentSharePercent: measurements.currentSharePercent,
    topFiles,
  });
  reportAlerts.push(...alerts);

  return {
    id: domain.id,
    label: domain.label,
    description: domain.description,
    ...measurements,
    history,
    topFiles,
    mimeSubtypes: mimeSubtypesByDomain.get(domain.id) ?? [],
    alerts,
  };
}

export function buildStorageBusinessContributions(params: {
  objects: StorageUsageObjectRow[];
  currentSnapshot: StorageUsageSnapshot;
  previousSnapshot: StorageUsageSnapshot | null;
  historyRecords?: StorageUsageSnapshotRecord[];
}): StorageBusinessContributionReport {
  const previousById = new Map(
    (params.previousSnapshot?.businessBreakdown ?? []).map(
      (item: StorageUsageBreakdownItem) => [item.key, item] as const,
    ),
  );

  const topFilesByDomain = buildStorageBusinessContributionTopFilesByDomain(params.objects);
  const mimeSubtypesByDomain = buildStorageBusinessContributionMimeSubtypesByDomain(params.objects);
  const historySnapshots = selectStorageBusinessContributionHistory(
    params.historyRecords,
    params.currentSnapshot,
  );
  const reportAlerts: StorageBusinessContributionAlert[] = [];

  const items = sortContributionItems(
    listStorageBusinessDomains().map((domain) => buildContributionItem({
      domain,
      currentSnapshot: params.currentSnapshot,
      previousById,
      topFilesByDomain,
      mimeSubtypesByDomain,
      historySnapshots,
      reportAlerts,
    })),
  );

  const photoDominanceAlert = buildPhotoDominanceGlobalAlert(items);
  if (photoDominanceAlert) {
    pushStorageBusinessContributionAlert(reportAlerts, photoDominanceAlert);
  }

  return {
    previousSnapshotMonth: params.previousSnapshot?.snapshotMonth ?? null,
    historyMonths: historySnapshots.map((snapshot) => snapshot.snapshotMonth),
    alerts: sortContributionAlerts(reportAlerts),
    items,
  };
}
