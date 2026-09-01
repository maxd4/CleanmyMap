import { buildGovernanceMethodologyLinks } from "@/lib/governance/governance-links";
import {
  buildServiceQuotaSummary,
  buildServiceRiskRows,
  buildServiceThresholdAlerts,
  formatServiceQuotaStateLabel,
  formatServiceRiskBandLabel,
  isDevelopmentAiServiceKey,
} from "@/lib/environmental-impact-estimator/service-risk";
import type {
  ServiceQuotaMetricSummary,
  ServiceQuotaSummary,
  ServiceRiskRow,
  ServiceThresholdAlert,
} from "@/lib/environmental-impact-estimator/service-risk";
import { getServicePlanInfo } from "@/lib/environmental-impact-estimator/service-plan";
import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator";
import type { EnvironmentalImpactInfrastructureServiceKey } from "@/lib/environmental-impact-estimator/types";
import type { ServiceStatusInfo } from "@/lib/dashboard/status";

export type ServicePressureRow = {
  key: string;
  label: string;
  currentKgCo2eProxy: number;
  previousKgCo2eProxy: number;
  deltaKgCo2eProxy: number;
  confidencePercent: number;
};

export type FreePlanServicesPanelRiskCard = {
  row: ServiceRiskRow;
  service: EnvironmentalImpactInfrastructureServiceEstimate;
  health: ServiceStatusInfo | undefined;
  planInfo: ReturnType<typeof getServicePlanInfo>;
  quotaSummary: ServiceQuotaSummary;
  primaryQuota: ServiceQuotaMetricSummary | null;
  extraQuotaMetrics: ServiceQuotaMetricSummary[];
  quotaStateLabel: string;
  quotaValue: string;
  impactLabel: string;
  deltaLabel: string;
  estimateTone: string;
  estimateLabel: string;
};

export type FreePlanServicesPanelModelInput = {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  snapshots: EnvironmentalImpactSnapshotRecord[];
  generatedAt: string | null;
  serviceHealth: Record<string, ServiceStatusInfo>;
};

export type FreePlanServicesPanelModel = {
  quotaServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  snapshots: EnvironmentalImpactSnapshotRecord[];
  snapshotCount: number;
  generatedAt: string | null;
  generatedAtLabel: string;
  serviceHealth: Record<string, ServiceStatusInfo>;
  readyServices: number;
  trackedServices: number;
  monitoredMetrics: number;
  inputMetrics: number;
  derivedMetrics: number;
  referenceMetrics: number;
  sortedServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousSnapshot: EnvironmentalImpactSnapshotRecord | null;
  previousSnapshotLabel: string | null;
  servicePressureRows: ServicePressureRow[];
  servicePressureGrowth: ServicePressureRow[];
  servicePressureLeader: ServicePressureRow | null;
  inputMetricsLabel: string;
  trackedServicesLabel: string;
  snapshotLabel: string;
  totalMonthlyPressure: number;
  reportMonth: string;
  methodologyLinks: ReturnType<typeof buildGovernanceMethodologyLinks>;
  serviceRiskRows: ServiceRiskRow[];
  serviceRiskLeader: ServiceRiskRow | null;
  serviceRiskCounts: Record<ServiceRiskRow["band"], number>;
  serviceThresholdAlerts: ServiceThresholdAlert[];
  serviceRiskCards: FreePlanServicesPanelRiskCard[];
};

export function formatNumber(value: number | null, maximumFractionDigits?: number): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits:
      maximumFractionDigits ?? (Math.abs(value) < 10 ? 2 : 0),
  }).format(value);
}

export function toReportMonth(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    const year = fallback.getUTCFullYear();
    const month = String(fallback.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function getHealthTone(state: ServiceStatusInfo["state"]): string {
  switch (state) {
    case "ready":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "external":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "defer":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "missing":
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }
}

export function getHealthLabel(state: ServiceStatusInfo["state"]): string {
  switch (state) {
    case "ready":
      return "Configuré";
    case "external":
      return "Externe";
    case "defer":
      return "Différé";
    case "missing":
    default:
      return "Manquant";
  }
}

export function getEstimateTone(
  status: EnvironmentalImpactInfrastructureServiceEstimate["status"],
): string {
  switch (status) {
    case "ready":
      return "text-emerald-300";
    case "derived":
      return "text-sky-200";
    case "partial":
      return "text-amber-200";
    case "reference":
    default:
      return "text-rose-200";
  }
}

export function getEstimateLabel(
  status: EnvironmentalImpactInfrastructureServiceEstimate["status"],
): string {
  switch (status) {
    case "ready":
      return "branché";
    case "derived":
      return "estimé";
    case "partial":
      return "mixte";
    case "reference":
    default:
      return "référence";
  }
}

export function getRiskTone(score: number): string {
  if (score >= 80) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }

  if (score >= 60) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (score >= 30) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
}

export function getAlertTone(severity: "warning" | "critical"): string {
  return severity === "critical"
    ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
    : "border-amber-500/20 bg-amber-500/10 text-amber-100";
}

export function countMetricsBySource(
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  source: EnvironmentalImpactInfrastructureMetricEstimate["source"],
): number {
  return services.reduce(
    (acc, service) =>
      acc +
      service.metricEstimates.filter((metric) => metric.source === source).length,
    0,
  );
}

export function getSnapshotServiceCharge(
  snapshot: EnvironmentalImpactSnapshotRecord | null | undefined,
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): number {
  if (!snapshot) {
    return 0;
  }

  const service = snapshot.model.infrastructure.services.find(
    (item) => item.key === serviceKey,
  );

  return service?.monthlyKgCo2eProxy ?? 0;
}

function formatGeneratedAt(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

function formatSnapshotMonth(snapshot: EnvironmentalImpactSnapshotRecord | null): string | null {
  return snapshot
    ? new Intl.DateTimeFormat("fr-FR", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(snapshot.snapshotDate))
    : null;
}

function buildServicePressureRows(
  sortedServices: EnvironmentalImpactInfrastructureServiceEstimate[],
  previousSnapshot: EnvironmentalImpactSnapshotRecord | null,
): ServicePressureRow[] {
  return sortedServices.map((service) => {
    const previousKgCo2eProxy = getSnapshotServiceCharge(previousSnapshot, service.key);
    const currentKgCo2eProxy = service.monthlyKgCo2eProxy ?? 0;
    return {
      key: service.key,
      label: service.label,
      currentKgCo2eProxy,
      previousKgCo2eProxy,
      deltaKgCo2eProxy: currentKgCo2eProxy - previousKgCo2eProxy,
      confidencePercent: service.confidencePercent,
    };
  });
}

function buildRiskCards(
  rows: ServiceRiskRow[],
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  previousSnapshot: EnvironmentalImpactSnapshotRecord | null,
  serviceHealth: Record<string, ServiceStatusInfo>,
): FreePlanServicesPanelRiskCard[] {
  const serviceByKey = new Map(services.map((service) => [service.key, service] as const));

  return rows.flatMap((row) => {
    const service = serviceByKey.get(row.key);
    if (!service) {
      return [];
    }

    const quotaSummary = buildServiceQuotaSummary(service);
    const primaryQuota = quotaSummary.primaryMetric;
    const primaryQuotaConsumedPercent = primaryQuota?.consumedPercent ?? null;

    return [
      {
        row,
        service,
        health: serviceHealth[service.key],
        planInfo: getServicePlanInfo(service.key),
        quotaSummary,
        primaryQuota,
        extraQuotaMetrics: quotaSummary.metrics.slice(1),
        quotaStateLabel: formatServiceQuotaStateLabel(quotaSummary.state),
        quotaValue:
          primaryQuotaConsumedPercent === null
            ? "NA"
            : `${formatNumber(primaryQuotaConsumedPercent, 0)}%`,
        impactLabel:
          service.monthlyKgCo2eProxy === null
            ? "NA"
            : `${formatNumber(service.monthlyKgCo2eProxy, 2)} kg CO2e proxy`,
        deltaLabel:
          previousSnapshot === null
            ? "NA"
            : `${row.deltaKgCo2eProxy > 0 ? "+" : ""}${formatNumber(row.deltaKgCo2eProxy, 2)} kg`,
        estimateTone: getEstimateTone(service.status),
        estimateLabel: getEstimateLabel(service.status),
      },
    ];
  });
}

export function buildFreePlanServicesPanelModel({
  services,
  snapshots,
  generatedAt,
  serviceHealth,
}: FreePlanServicesPanelModelInput): FreePlanServicesPanelModel {
  const quotaServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const previousServices = (snapshots[1]?.model.infrastructure.services ?? []).filter(
    (service) => !isDevelopmentAiServiceKey(service.key),
  );
  const snapshotCount = snapshots.length;
  const readyServices = Object.values(serviceHealth).filter(
    (service) => service.state === "ready",
  ).length;
  const trackedServices = Object.values(serviceHealth).filter(
    (service) => service.state !== "external",
  ).length;
  const monitoredMetrics = quotaServices.reduce(
    (acc, service) => acc + service.metricCount,
    0,
  );
  const inputMetrics = countMetricsBySource(quotaServices, "input");
  const derivedMetrics = countMetricsBySource(quotaServices, "derived");
  const referenceMetrics = countMetricsBySource(quotaServices, "reference");
  const sortedServices = quotaServices.slice().sort((left, right) => {
    const byCharge =
      (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
    if (byCharge !== 0) {
      return byCharge;
    }

    return left.label.localeCompare(right.label);
  });
  const previousSnapshot = snapshots[1] ?? null;
  const servicePressureRows = buildServicePressureRows(sortedServices, previousSnapshot);
  const servicePressureGrowth = servicePressureRows
    .slice()
    .sort((left, right) => right.deltaKgCo2eProxy - left.deltaKgCo2eProxy);
  const servicePressureLeader = servicePressureRows[0] ?? null;
  const totalMonthlyPressure = sortedServices.reduce(
    (acc, service) => acc + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const reportMonth = toReportMonth(generatedAt);
  const serviceRiskRows = buildServiceRiskRows(quotaServices, previousServices);
  const serviceThresholdAlerts = buildServiceThresholdAlerts({
    currentGeneratedAt: generatedAt ?? new Date().toISOString(),
    currentServices: quotaServices,
    snapshots,
  });
  const serviceRiskLeader = serviceRiskRows[0] ?? null;
  const serviceRiskCounts = serviceRiskRows.reduce(
    (acc, row) => {
      acc[row.band] += 1;
      return acc;
    },
    { faible: 0, surveiller: 0, alerte: 0, critique: 0 },
  );

  return {
    quotaServices,
    previousServices,
    snapshots,
    snapshotCount,
    generatedAt,
    generatedAtLabel: formatGeneratedAt(generatedAt),
    serviceHealth,
    readyServices,
    trackedServices,
    monitoredMetrics,
    inputMetrics,
    derivedMetrics,
    referenceMetrics,
    sortedServices,
    previousSnapshot,
    previousSnapshotLabel: formatSnapshotMonth(previousSnapshot),
    servicePressureRows,
    servicePressureGrowth,
    servicePressureLeader,
    inputMetricsLabel: inputMetrics === 1 ? "métrique branchée" : "métriques branchées",
    trackedServicesLabel: trackedServices === 1 ? "service actif" : "services actifs",
    snapshotLabel: snapshotCount === 1 ? "snapshot conservé" : "snapshots conservés",
    totalMonthlyPressure,
    reportMonth,
    methodologyLinks: buildGovernanceMethodologyLinks(reportMonth),
    serviceRiskRows,
    serviceRiskLeader,
    serviceRiskCounts,
    serviceThresholdAlerts,
    serviceRiskCards: buildRiskCards(
      serviceRiskRows,
      quotaServices,
      previousSnapshot,
      serviceHealth,
    ),
  };
}

export { formatServiceQuotaStateLabel, formatServiceRiskBandLabel };
