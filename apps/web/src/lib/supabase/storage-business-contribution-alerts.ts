import { formatStorageBytes } from "./storage-usage";
import { STORAGE_BUSINESS_CONTRIBUTION_POLICY } from "./storage-business-contribution-policy";
import type {
  StorageBusinessContributionAlert,
  StorageBusinessContributionAlertSeverity,
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionTopFile,
} from "./storage-business-contribution";
import type { StorageBusinessDomainId } from "./storage-business-taxonomy";

export function getAlertSeverityRank(severity: StorageBusinessContributionAlertSeverity): number {
  if (severity === "critical") {
    return 3;
  }
  if (severity === "warning") {
    return 2;
  }
  return 1;
}

export function getAlertSignalRank(signal: StorageBusinessContributionAlert["signal"]): number {
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

type StorageAlertParams = {
  domainId: StorageBusinessDomainId;
  label: string;
  history: StorageBusinessContributionHistoryPoint[];
  currentBytes: number;
  currentSharePercent: number;
  topFiles: StorageBusinessContributionTopFile[];
};

export function buildStorageBusinessContributionAlertId(
  domainId: StorageBusinessDomainId,
  signal: string,
  snapshotMonth: string,
) {
  return `${domainId}:${signal}:${snapshotMonth}`;
}

export function pushStorageBusinessContributionAlert(
  alerts: StorageBusinessContributionAlert[],
  alert: StorageBusinessContributionAlert,
) {
  if (!alerts.some((item) => item.id === alert.id)) {
    alerts.push(alert);
  }
}

function pushQuotaShareAlerts(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  const { shareWarningPercent: shareWarning, shareCriticalPercent: shareCritical } = STORAGE_BUSINESS_CONTRIBUTION_POLICY;
  if (!current) {
    return;
  }
  const critical = params.currentSharePercent >= shareCritical;
  if (critical || params.currentSharePercent >= shareWarning) {
    pushStorageBusinessContributionAlert(alerts, {
      id: buildStorageBusinessContributionAlertId(params.domainId, critical ? "quotaShare-critical" : "quotaShare-warning", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: critical ? "Part de quota critique" : "Part de quota élevée",
      message: `${params.label} ${critical ? "consomme" : "représente"} ${params.currentSharePercent.toFixed(1)}% du stockage métier.`,
      severity: critical ? "critical" : "warning",
      signal: "quotaShare",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: critical ? shareCritical : shareWarning,
    });
  }
}

function pushGrowthAlerts(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  if (!current || current.deltaPercent === null) {
    return;
  }
  const { growthWarningPercent, growthCriticalPercent } = STORAGE_BUSINESS_CONTRIBUTION_POLICY;
  const critical = current.deltaPercent >= growthCriticalPercent;
  if (critical || current.deltaPercent >= growthWarningPercent) {
    pushStorageBusinessContributionAlert(alerts, {
      id: buildStorageBusinessContributionAlertId(params.domainId, critical ? "growth-critical" : "growth-warning", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: critical ? "Croissance critique" : "Croissance rapide",
      message: `${params.label} progresse de ${current.deltaPercent.toFixed(1)}% sur le dernier mois.`,
      severity: critical ? "critical" : "warning",
      signal: "growth",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: null,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  }
}

function pushAccelerationAlerts(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  if (!current) {
    return;
  }
  const { accelerationWarningBytes, accelerationCriticalBytes } = STORAGE_BUSINESS_CONTRIBUTION_POLICY;
  const critical = current.accelerationBytes >= accelerationCriticalBytes;
  if (critical || current.accelerationBytes >= accelerationWarningBytes) {
    pushStorageBusinessContributionAlert(alerts, {
      id: buildStorageBusinessContributionAlertId(params.domainId, critical ? "acceleration-critical" : "acceleration-warning", current.snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: critical ? "Accélération anormale" : "Accélération à surveiller",
      message: `${params.label} accélère ${critical ? "fortement " : ""}sur les derniers mois (+${formatStorageBytes(current.accelerationBytes)} de surcroît).`,
      severity: critical ? "critical" : "warning",
      signal: "acceleration",
      snapshotMonth: current.snapshotMonth,
      currentBytes: params.currentBytes,
      thresholdBytes: critical ? accelerationCriticalBytes : accelerationWarningBytes,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  }
}

function pushPhotoDominanceAlert(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  const { photoDominanceSharePercent } = STORAGE_BUSINESS_CONTRIBUTION_POLICY;
  if (params.domainId !== "pieces_jointes_photo" || params.currentSharePercent < photoDominanceSharePercent) {
    return;
  }
  const snapshotMonth = current?.snapshotMonth ?? "current";
  pushStorageBusinessContributionAlert(alerts, {
    id: buildStorageBusinessContributionAlertId(params.domainId, "photo-dominance", snapshotMonth),
    domainId: params.domainId,
    label: params.label,
    title: "Les photos dominent",
    message: `${params.label} représente ${params.currentSharePercent.toFixed(1)}% du stockage métier et domine la répartition.`,
    severity: "warning",
    signal: "photoDominance",
    snapshotMonth,
    currentBytes: params.currentBytes,
    thresholdBytes: null,
    currentSharePercent: params.currentSharePercent,
    thresholdSharePercent: photoDominanceSharePercent,
  });
}

function pushHeavyExportAlerts(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  if (params.domainId !== "socle_estimateur_impact") {
    return;
  }
  const { socleHeavyExportBytes } = STORAGE_BUSINESS_CONTRIBUTION_POLICY;
  const topFile = params.topFiles[0] ?? null;
  const snapshotMonth = current?.snapshotMonth ?? "current";
  if (topFile && topFile.bytes >= socleHeavyExportBytes) {
    pushStorageBusinessContributionAlert(alerts, {
      id: buildStorageBusinessContributionAlertId(params.domainId, "heavy-exports", snapshotMonth),
      domainId: params.domainId,
      label: params.label,
      title: "Exports du socle trop lourds",
      message: `Le plus gros export du socle atteint ${topFile.sizeLabel} et mérite une surveillance.`,
      severity: "critical",
      signal: "heavyExports",
      snapshotMonth,
      currentBytes: topFile.bytes,
      thresholdBytes: socleHeavyExportBytes,
      currentSharePercent: params.currentSharePercent,
      thresholdSharePercent: null,
    });
  } else if (params.currentBytes >= socleHeavyExportBytes && current) {
    pushStorageBusinessContributionAlert(alerts, {
      id: buildStorageBusinessContributionAlertId(params.domainId, "heavy-exports-total", current.snapshotMonth),
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

function pushAccelerationAnomalyAlert(
  params: StorageAlertParams,
  current: StorageBusinessContributionHistoryPoint | null,
  previous: StorageBusinessContributionHistoryPoint | null,
  alerts: StorageBusinessContributionAlert[],
): void {
  if (params.history.length < 3 || !current || !previous || current.deltaBytes <= 0 || previous.deltaBytes <= 0 || current.deltaBytes <= previous.deltaBytes * 1.5) {
    return;
  }
  pushStorageBusinessContributionAlert(alerts, {
    id: buildStorageBusinessContributionAlertId(params.domainId, "anomaly", current.snapshotMonth),
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

export function buildStorageBusinessContributionAlerts(params: StorageAlertParams): StorageBusinessContributionAlert[] {
  const alerts: StorageBusinessContributionAlert[] = [];
  const current = params.history[0] ?? null;
  const previous = params.history[1] ?? null;
  pushQuotaShareAlerts(params, current, alerts);
  pushGrowthAlerts(params, current, alerts);
  pushAccelerationAlerts(params, current, alerts);
  pushPhotoDominanceAlert(params, current, alerts);
  pushHeavyExportAlerts(params, current, alerts);
  pushAccelerationAnomalyAlert(params, current, previous, alerts);
  return alerts;
}
