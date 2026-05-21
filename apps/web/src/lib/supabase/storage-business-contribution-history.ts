import type { StorageBusinessDomainId } from "./storage-business-taxonomy";
import { formatStorageBytes, type StorageUsageSnapshot, type StorageUsageSnapshotRecord, toStorageUsageSnapshot } from "./storage-usage";
import type {
  StorageBusinessContributionAlert,
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionTopFile,
} from "./storage-business-contribution";

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

export function getHistorySeries(
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

export function computeTrendPointSeries(
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
    const deltaPercent = previous && previous.currentBytes > 0 ? (deltaBytes / previous.currentBytes) * 100 : null;
    const cumulative3MonthBytes = point.currentBytes - (older?.currentBytes ?? 0);
    const cumulative3MonthPercent = older && older.currentBytes > 0 ? (cumulative3MonthBytes / older.currentBytes) * 100 : null;
    const previousDelta = previous ? previous.currentBytes - (older?.currentBytes ?? 0) : 0;
    const accelerationBytes = deltaBytes - previousDelta;
    const accelerationPercent = previousDelta !== 0 ? (accelerationBytes / Math.abs(previousDelta)) * 100 : null;

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

export function buildAlertsForDomain(params: {
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

  if (
    params.history.length >= 3 &&
    current &&
    previous &&
    current.deltaBytes > 0 &&
    previous.deltaBytes > 0 &&
    current.deltaBytes > previous.deltaBytes * 1.5
  ) {
    pushAlert(alerts, {
      id: buildAlertId(params.domainId, "acceleration-critical", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Accélération anormale",
      message: `${params.label} accélère fortement sur les derniers mois (+${formatStorageBytes(current.accelerationBytes)} de surcroît).`,
      severity: current.accelerationBytes >= accelerationCriticalBytes ? "critical" : "warning",
      signal: "acceleration",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: current.accelerationBytes >= accelerationCriticalBytes ? accelerationCriticalBytes : accelerationWarningBytes,
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
