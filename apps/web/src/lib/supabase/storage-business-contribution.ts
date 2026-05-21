import {
  listStorageBusinessDomains,
  type StorageBusinessDomainId,
} from "./storage-business-taxonomy";
import {
  classifyStorageBusinessObject,
  type StorageBusinessClassificationSignalType,
} from "./storage-business-classification";
import {
  formatStorageBytes,
  inferStorageFileTypeLabel,
  type StorageUsageObjectRow,
  type StorageUsageSnapshotRecord,
  type StorageUsageSnapshot,
  type StorageUsageBreakdownItem,
  toStorageUsageSnapshot,
} from "./storage-usage";

export type StorageBusinessContributionTopFile = {
  bucketId: string;
  bucketLabel: string;
  businessSignal?: StorageBusinessClassificationSignalType;
  businessEvidence?: string;
  businessDomain?: string | null;
  sourceTable?: string | null;
  businessContext?: string | null;
  name: string;
  extension: string;
  bytes: number;
  sizeLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StorageBusinessContributionMimeSubtype = {
  key: string;
  label: string;
  bytes: number;
  count: number;
  sharePercent: number;
  averageBytes: number;
};

export type StorageBusinessContributionHistoryPoint = {
  snapshotMonth: string;
  monthLabel: string;
  currentBytes: number;
  currentCount: number;
  sharePercent: number;
  deltaBytes: number;
  deltaCount: number;
  deltaPercent: number | null;
  cumulative3MonthBytes: number;
  cumulative3MonthPercent: number | null;
  accelerationBytes: number;
  accelerationPercent: number | null;
};

export type StorageBusinessContributionAlertSeverity = "info" | "warning" | "critical";

export type StorageBusinessContributionAlert = {
  id: string;
  domainId: StorageBusinessDomainId;
  label: string;
  title: string;
  message: string;
  severity: StorageBusinessContributionAlertSeverity;
  signal:
    | "quotaShare"
    | "growth"
    | "photoDominance"
    | "heavyExports"
    | "acceleration";
  snapshotMonth: string;
  currentBytes: number;
  thresholdBytes: number | null;
  currentSharePercent: number;
  thresholdSharePercent: number | null;
};

export type StorageBusinessContributionItem = {
  id: StorageBusinessDomainId;
  label: string;
  description: string;
  currentBytes: number;
  currentCount: number;
  currentSharePercent: number;
  currentAverageBytes: number;
  previousBytes: number;
  previousCount: number;
  deltaBytes: number;
  deltaPercent: number | null;
  deltaCount: number;
  cumulative3MonthBytes: number;
  cumulative3MonthPercent: number | null;
  accelerationBytes: number;
  accelerationPercent: number | null;
  history: StorageBusinessContributionHistoryPoint[];
  topFiles: StorageBusinessContributionTopFile[];
  mimeSubtypes: StorageBusinessContributionMimeSubtype[];
  alerts: StorageBusinessContributionAlert[];
};

export type StorageBusinessContributionReport = {
  previousSnapshotMonth: string | null;
  historyMonths: string[];
  alerts: StorageBusinessContributionAlert[];
  items: StorageBusinessContributionItem[];
};

function extractExtension(name: string): string {
  const fileName = name.split("/").pop() ?? name;
  const index = fileName.lastIndexOf(".");
  if (index <= 0 || index === fileName.length - 1) {
    return "";
  }
  return fileName.slice(index + 1).toLowerCase();
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatMonthLabel(snapshotMonth: string): string {
  const parsed = new Date(`${snapshotMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return snapshotMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getHistorySeries(
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
    .slice(0, 4);
}

function extractSizeBytes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

function buildTopFilesByDomain(
  objects: StorageUsageObjectRow[],
): Map<StorageBusinessDomainId, StorageBusinessContributionTopFile[]> {
  const grouped = new Map<StorageBusinessDomainId, StorageBusinessContributionTopFile[]>();

  for (const object of objects) {
    const size = extractSizeBytes(object.metadata?.["size"]);
    const classification = classifyStorageBusinessObject({
      bucketId: object.bucket_id,
      name: object.name,
      mimeType: toStringOrNull(object.metadata?.["mimetype"]),
      metadata: object.metadata ?? null,
    });

    const current = grouped.get(classification.id) ?? [];
    current.push({
      bucketId: object.bucket_id,
      bucketLabel: object.bucket_id,
      businessSignal: classification.signal,
      businessEvidence: classification.evidence,
      businessDomain: classification.businessDomain,
      sourceTable: classification.sourceTable,
      businessContext: classification.businessContext,
      name: object.name,
      extension: extractExtension(object.name) || "sans-extension",
      bytes: size,
      sizeLabel: formatStorageBytes(size),
      createdAt: toStringOrNull(object.created_at),
      updatedAt: toStringOrNull(object.updated_at),
    });
    grouped.set(classification.id, current);
  }

  for (const domain of listStorageBusinessDomains()) {
    const files = grouped.get(domain.id);
    if (!files) {
      continue;
    }
    files.sort((left, right) => {
      if (right.bytes !== left.bytes) {
        return right.bytes - left.bytes;
      }
      return left.name.localeCompare(right.name, "fr");
    });
    grouped.set(domain.id, files.slice(0, 3));
  }

  return grouped;
}

function buildMimeSubtypesByDomain(
  objects: StorageUsageObjectRow[],
): Map<StorageBusinessDomainId, StorageBusinessContributionMimeSubtype[]> {
  const grouped = new Map<
    StorageBusinessDomainId,
    Map<string, { label: string; bytes: number; count: number }>
  >();

  for (const object of objects) {
    const size = extractSizeBytes(object.metadata?.["size"]);
    const classification = classifyStorageBusinessObject({
      bucketId: object.bucket_id,
      name: object.name,
      mimeType: toStringOrNull(object.metadata?.["mimetype"]),
      metadata: object.metadata ?? null,
    });
    const mimeType = toStringOrNull(object.metadata?.["mimetype"]);
    const extension = extractExtension(object.name);
    const key = mimeType ?? `file-type:${extension || "sans-extension"}`;
    const label = mimeType ?? inferStorageFileTypeLabel(extension, mimeType);

    const domain = grouped.get(classification.id) ?? new Map();
    const current = domain.get(key) ?? {
      label,
      bytes: 0,
      count: 0,
    };
    current.bytes += size;
    current.count += 1;
    domain.set(key, current);
    grouped.set(classification.id, domain);
  }

  const result = new Map<StorageBusinessDomainId, StorageBusinessContributionMimeSubtype[]>();

  for (const [domainId, entries] of grouped.entries()) {
    const sortedEntries = Array.from(entries.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        bytes: item.bytes,
        count: item.count,
        sharePercent: 0,
        averageBytes: item.count > 0 ? item.bytes / item.count : 0,
      }))
      .sort((left, right) => {
        if (right.bytes !== left.bytes) {
          return right.bytes - left.bytes;
        }
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.label.localeCompare(right.label, "fr");
      });

    const totalBytes = sortedEntries.reduce((sum, item) => sum + item.bytes, 0);
    const topFive = sortedEntries.slice(0, 5);
    result.set(
      domainId,
      topFive.map((item) => ({
        ...item,
        sharePercent: totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0,
      })),
    );
  }

  return result;
}

function computeTrendPointSeries(
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

function buildAlertId(domainId: StorageBusinessDomainId, signal: string, snapshotMonth: string) {
  return `${domainId}:${signal}:${snapshotMonth}`;
}

function pushAlert(
  alerts: StorageBusinessContributionAlert[],
  alert: StorageBusinessContributionAlert,
) {
  if (alerts.some((item) => item.id === alert.id)) {
    return;
  }
  alerts.push(alert);
}

function getAlertSeverityRank(severity: StorageBusinessContributionAlertSeverity): number {
  if (severity === "critical") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}

function getAlertSignalRank(signal: StorageBusinessContributionAlert["signal"]): number {
  switch (signal) {
    case "growth":
      return 5;
    case "acceleration":
      return 4;
    case "heavyExports":
      return 3;
    case "photoDominance":
      return 2;
    case "quotaShare":
      return 1;
    default:
      return 0;
  }
}

function buildAlertsForDomain(params: {
  domainId: StorageBusinessDomainId;
  label: string;
  history: StorageBusinessContributionHistoryPoint[];
  currentBytes: number;
  currentSharePercent: number;
  topFiles: StorageBusinessContributionTopFile[];
}): StorageBusinessContributionAlert[] {
  const alerts: StorageBusinessContributionAlert[] = [];
  const current = params.history[0] ?? null;
  const previous = params.history[1] ?? null;

  const shareWarning = 25;
  const shareCritical = 40;
  const growthWarningPercent = 35;
  const growthCriticalPercent = 75;
  const accelerationWarningBytes = 3 * 1024 * 1024;
  const accelerationCriticalBytes = 6 * 1024 * 1024;
  const photoDominanceShare = 30;
  const socleHeavyExportBytes = 4 * 1024 * 1024;

  if (current && params.currentSharePercent >= shareCritical) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "quotaShare-critical", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Part de quota critique",
      message: `${params.label} consomme ${params.currentSharePercent.toFixed(1)}% du stockage métier.`,
      severity: "critical",
      signal: "quotaShare",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: shareCritical,
    });
  } else if (current && params.currentSharePercent >= shareWarning) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "quotaShare-warning", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Part de quota élevée",
      message: `${params.label} représente ${params.currentSharePercent.toFixed(1)}% du stockage métier.`,
      severity: "warning",
      signal: "quotaShare",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: shareWarning,
    });
  }

  if (current && current.deltaPercent !== null) {
    if (current.deltaPercent >= growthCriticalPercent) {
      pushAlert(alerts, {
        id: buildAlertId(params.domainId, "growth-critical", current.snapshotMonth),
        domainId: params.domainId,
        label: params.label,
        title: "Croissance critique",
        message: `${params.label} progresse de ${current.deltaPercent.toFixed(1)}% sur le dernier mois.`,
        severity: "critical",
        signal: "growth",
        snapshotMonth: current.snapshotMonth,
        currentBytes: params.currentBytes,
        thresholdBytes: null,
        currentSharePercent: params.currentSharePercent,
        thresholdSharePercent: null,
      });
    } else if (current.deltaPercent >= growthWarningPercent) {
      pushAlert(alerts, {
        id: buildAlertId(params.domainId, "growth-warning", current.snapshotMonth),
        domainId: params.domainId,
        label: params.label,
        title: "Croissance rapide",
        message: `${params.label} progresse de ${current.deltaPercent.toFixed(1)}% sur le dernier mois.`,
        severity: "warning",
        signal: "growth",
        snapshotMonth: current.snapshotMonth,
        currentBytes: params.currentBytes,
        thresholdBytes: null,
        currentSharePercent: params.currentSharePercent,
        thresholdSharePercent: null,
      });
    }
  }

  if (current && current.accelerationBytes >= accelerationCriticalBytes) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "acceleration-critical", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Accélération anormale",
      message: `${params.label} accélère fortement sur les derniers mois (+${formatStorageBytes(current.accelerationBytes)} de surcroît).`,
      severity: "critical",
      signal: "acceleration",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: accelerationCriticalBytes,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  } else if (current && current.accelerationBytes >= accelerationWarningBytes) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "acceleration-warning", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Accélération à surveiller",
      message: `${params.label} accélère sur les derniers mois (+${formatStorageBytes(current.accelerationBytes)} de surcroît).`,
      severity: "warning",
      signal: "acceleration",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: accelerationWarningBytes,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  }

  if (params.domainId === "pieces_jointes_photo" && params.currentSharePercent >= photoDominanceShare) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "photo-dominance", current?.snapshotMonth ?? "current"),
      domainId: params.domainId,
      label: params.label,
      title: "Les photos dominent",
      message: `${params.label} représente ${params.currentSharePercent.toFixed(1)}% du stockage métier et domine la répartition.`,
      severity: "warning",
      signal: "photoDominance",
      snapshotMonth: current?.snapshotMonth ?? "current",
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: photoDominanceShare,
    });
  }

  if (params.domainId === "socle_estimateur_impact") {
    const topFile = params.topFiles[0] ?? null;
    if (topFile && topFile.bytes >= socleHeavyExportBytes) {
      pushAlert(alerts, {
        id: buildAlertId(params.domainId, "heavy-exports", current?.snapshotMonth ?? "current"),
        domainId: params.domainId,
        label: params.label,
        title: "Exports du socle trop lourds",
        message: `Le plus gros export du socle atteint ${topFile.sizeLabel} et mérite une surveillance.`,
        severity: "critical",
        signal: "heavyExports",
        snapshotMonth: current?.snapshotMonth ?? "current",
        currentBytes: topFile.bytes,
        thresholdBytes: socleHeavyExportBytes,
        currentSharePercent: params.currentSharePercent,
        thresholdSharePercent: null,
      });
    } else if (params.currentBytes >= socleHeavyExportBytes && current) {
      pushAlert(alerts, {
        id: buildAlertId(params.domainId, "heavy-exports-total", current.snapshotMonth),
        domainId: params.domainId,
        label: params.label,
        title: "Exports du socle lourds",
        message: `${params.label} pèse ${formatStorageBytes(params.currentBytes)} dans le quota métier.`,
        severity: "warning",
        signal: "heavyExports",
        snapshotMonth: current.snapshotMonth,
        currentBytes: params.currentBytes,
        thresholdBytes: socleHeavyExportBytes,
        currentSharePercent: params.currentSharePercent,
        thresholdSharePercent: null,
      });
    }
  }

  if (
    params.history.length >= 3 &&
    current &&
    previous &&
    current.deltaBytes > 0 &&
    previous.deltaBytes > 0 &&
    current.deltaBytes > previous.deltaBytes * 1.5
  ) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "anomaly", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Accélération anormale détectée",
      message: `${params.label} progresse plus vite que le mois précédent (${formatStorageBytes(previous.deltaBytes)} -> ${formatStorageBytes(current.deltaBytes)}).`,
      severity: "warning",
      signal: "acceleration",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  }

  return alerts;
}

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

  const quotaPriority = item.currentSharePercent >= 40 ? 100 : 0;
  const shareScore = Math.round(item.currentSharePercent * 2);
  const growthScore = item.deltaBytes > 0 ? Math.min(40, Math.round(item.deltaBytes / 50_000)) : 0;

  return quotaPriority + criticalAlertScore + shareScore + growthScore;
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

  const topFilesByDomain = buildTopFilesByDomain(params.objects);
  const mimeSubtypesByDomain = buildMimeSubtypesByDomain(params.objects);
  const historySnapshots = getHistorySeries(params.historyRecords, params.currentSnapshot);
  const reportAlerts: StorageBusinessContributionAlert[] = [];

  const items = listStorageBusinessDomains()
    .map((domain) => {
      const current = params.currentSnapshot.businessBreakdown.find((item) => item.key === domain.id);
      const previous = previousById.get(domain.id);
      const currentBytes = current?.bytes ?? 0;
      const previousBytes = previous?.bytes ?? 0;
      const currentCount = current?.count ?? 0;
      const previousCount = previous?.count ?? 0;
      const deltaBytes = currentBytes - previousBytes;
      const deltaCount = currentCount - previousCount;
      const history = computeTrendPointSeries(historySnapshots, domain.id);
      const alerts = buildAlertsForDomain({
        domainId: domain.id,
        label: domain.label,
        history,
        currentBytes,
        currentSharePercent: current?.sharePercent ?? 0,
        topFiles: topFilesByDomain.get(domain.id) ?? [],
      });
      reportAlerts.push(...alerts);

      return {
        id: domain.id,
        label: domain.label,
        description: domain.description,
        currentBytes,
        currentCount,
        currentSharePercent: current?.sharePercent ?? 0,
        currentAverageBytes: current?.averageBytes ?? 0,
        previousBytes,
        previousCount,
        deltaBytes,
        deltaPercent: previousBytes > 0 ? (deltaBytes / previousBytes) * 100 : null,
        deltaCount,
        cumulative3MonthBytes: history[0]?.cumulative3MonthBytes ?? deltaBytes,
        cumulative3MonthPercent: history[0]?.cumulative3MonthPercent ?? null,
        accelerationBytes: history[0]?.accelerationBytes ?? 0,
        accelerationPercent: history[0]?.accelerationPercent ?? null,
        history,
        topFiles: topFilesByDomain.get(domain.id) ?? [],
        mimeSubtypes: mimeSubtypesByDomain.get(domain.id) ?? [],
        alerts,
      };
    })
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

  const topPhotoItem = items.find((item) => item.id === "pieces_jointes_photo") ?? null;
  if (topPhotoItem && items[0]?.id === "pieces_jointes_photo") {
    const currentHistory = topPhotoItem.history[0] ?? null;
    pushAlert(reportAlerts, {
      id: buildAlertId("pieces_jointes_photo", "photo-dominance-global", currentHistory?.snapshotMonth ?? "current"),
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
    });
  }

  return {
    previousSnapshotMonth: params.previousSnapshot?.snapshotMonth ?? null,
    historyMonths: historySnapshots.map((snapshot) => snapshot.snapshotMonth),
    alerts: reportAlerts.sort((left, right) => {
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
    }),
    items,
  };
}
