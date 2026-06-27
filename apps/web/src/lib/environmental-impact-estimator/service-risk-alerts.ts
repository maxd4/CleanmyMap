import type { EnvironmentalImpactSnapshotRecord } from "./types";
import type { EnvironmentalImpactInfrastructureServiceKey } from "./types";
import type {
  ServiceThresholdAlert,
  ServiceThresholdAlertSignal,
} from "./service-risk";

type ServiceRiskSource = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  monthlyKgCo2eProxy: number | null;
  sharePercent: number;
  confidencePercent: number;
  metricEstimates: Array<{
    referenceMonthlyQuantity: number;
    quantityPerMonth: number | null;
  }>;
};

function round(value: number): number {
  return Math.round(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getGrowthPercent(currentKgCo2eProxy: number, previousKgCo2eProxy: number | null | undefined): number {
  if (currentKgCo2eProxy <= 0) {
    return 0;
  }
  if (previousKgCo2eProxy === null || previousKgCo2eProxy === undefined) {
    return 0;
  }
  if (previousKgCo2eProxy <= 0) {
    return 100;
  }
  return round(clamp(((currentKgCo2eProxy - previousKgCo2eProxy) / previousKgCo2eProxy) * 100, 0, 100));
}

function formatMonthLabel(snapshotDate: string): string {
  const parsed = new Date(`${snapshotDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return snapshotDate;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatPercentValue(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 0 : 0,
  }).format(value);
}

function getStreakEndLabel<T>(series: T[], predicate: (item: T) => boolean): number {
  if (series.length === 0 || !predicate(series[0])) {
    return -1;
  }
  let index = 0;
  while (index + 1 < series.length && predicate(series[index + 1])) {
    index += 1;
  }
  return index;
}

function getRecommendedAction(signal: ServiceThresholdAlertSignal): string {
  switch (signal) {
    case "quotaShare":
      return "Réduire les usages non critiques de la catégorie, reporter les charges lourdes et revalider le quota.";
    case "trend":
      return "Auditer la pente sur deux mois, confirmer le signal et préparer un plan de réduction ciblé.";
    case "growth":
    default:
      return "Identifier la source de croissance, corriger les usages coûteux et vérifier le prochain snapshot.";
  }
}

type HistorySnapshot = {
  snapshotDate: string;
  monthLabel: string;
  services: ServiceRiskSource[];
};

type QuotaPoint = {
  snapshotDate: string;
  monthLabel: string;
  sharePercent: number;
  monthlyKgCo2eProxy: number;
};

function buildHistorySnapshots(params: {
  currentGeneratedAt: string;
  currentServices: ServiceRiskSource[];
  snapshots: EnvironmentalImpactSnapshotRecord[];
}): HistorySnapshot[] {
  const currentSnapshotDate = params.currentGeneratedAt.slice(0, 10);
  const currentSnapshotMonth = currentSnapshotDate.slice(0, 7);
  return [
    {
      snapshotDate: currentSnapshotDate,
      monthLabel: formatMonthLabel(currentSnapshotDate),
      services: params.currentServices,
    },
    ...params.snapshots
      .filter((snapshot) => snapshot.snapshotDate.slice(0, 7) !== currentSnapshotMonth)
      .slice(0, 4)
      .map((snapshot) => ({
        snapshotDate: snapshot.snapshotDate,
        monthLabel: formatMonthLabel(snapshot.snapshotDate),
        services: snapshot.model.infrastructure.services,
      })),
  ];
}

function buildQuotaSeries(service: ServiceRiskSource, historySnapshots: HistorySnapshot[]): QuotaPoint[] {
  return historySnapshots
    .map((snapshot) => {
      const item = snapshot.services.find((entry) => entry.key === service.key);
      if (!item) {
        return null;
      }
      return {
        snapshotDate: snapshot.snapshotDate,
        monthLabel: snapshot.monthLabel,
        sharePercent: clamp(item.sharePercent, 0, 100),
        monthlyKgCo2eProxy: item.monthlyKgCo2eProxy ?? 0,
      };
    })
    .filter((item): item is QuotaPoint => item !== null);
}

function buildQuotaAlert(service: ServiceRiskSource, current: QuotaPoint): ServiceThresholdAlert {
  const overage = current.sharePercent - 70;
  return {
    id: `${service.key}:quotaShare:${current.snapshotDate}`,
    serviceKey: service.key,
    serviceLabel: service.label,
    severity: "critical",
    signal: "quotaShare",
    title: "Quota de catégorie dépassé",
    thresholdLabel: "usage > 70 % du quota alloué à la catégorie",
    details: `${formatPercentValue(current.sharePercent)} % consommés, soit +${formatPercentValue(overage)} points au-dessus du seuil.`,
    sinceLabel: current.monthLabel,
    recommendedAction: getRecommendedAction("quotaShare"),
  };
}

function buildGrowthAlert(service: ServiceRiskSource, current: QuotaPoint, currentGrowth: number): ServiceThresholdAlert {
  const overage = currentGrowth - 15;
  return {
    id: `${service.key}:growth:${current.snapshotDate}`,
    serviceKey: service.key,
    serviceLabel: service.label,
    severity: "critical",
    signal: "growth",
    title: "Croissance mensuelle excessive",
    thresholdLabel: "croissance > +15 % sur un mois",
    details: `Croissance de +${formatPercentValue(currentGrowth)} % ce mois-ci, soit +${formatPercentValue(overage)} points au-dessus du seuil.`,
    sinceLabel: current.monthLabel,
    recommendedAction: getRecommendedAction("growth"),
  };
}

function buildTrendAlert(
  service: ServiceRiskSource,
  current: QuotaPoint,
  currentGrowth: number,
  previousGrowth: number,
  sinceLabel: string,
): ServiceThresholdAlert {
  return {
    id: `${service.key}:trend:${current.snapshotDate}`,
    serviceKey: service.key,
    serviceLabel: service.label,
    severity: "warning",
    signal: "trend",
    title: "Pente forte sur 2 mois",
    thresholdLabel: "croissance > +10 % sur deux mois d'affilée",
    details: `Croissance de +${formatPercentValue(currentGrowth)} % ce mois-ci et +${formatPercentValue(previousGrowth)} % le mois précédent.`,
    sinceLabel,
    recommendedAction: getRecommendedAction("trend"),
  };
}

function buildGrowthSeries(quotaSeries: QuotaPoint[]) {
  return quotaSeries
    .slice(0, Math.max(0, quotaSeries.length - 1))
    .map((item, index) => ({
      monthLabel: item.monthLabel,
      growthPercent: getGrowthPercent(item.monthlyKgCo2eProxy, quotaSeries[index + 1]?.monthlyKgCo2eProxy ?? null),
    }));
}

function getQuotaAlertIfNeeded(service: ServiceRiskSource, quotaSeries: QuotaPoint[]): ServiceThresholdAlert | null {
  if (getStreakEndLabel(quotaSeries, (item) => item.sharePercent >= 70) < 0) {
    return null;
  }
  return buildQuotaAlert(service, quotaSeries[0]);
}

function getGrowthAlertIfNeeded(
  service: ServiceRiskSource,
  quotaSeries: QuotaPoint[],
  growthSeries: Array<{ monthLabel: string; growthPercent: number }>,
): ServiceThresholdAlert | null {
  const currentGrowth = growthSeries[0]?.growthPercent ?? 0;
  if (currentGrowth < 15 || getStreakEndLabel(growthSeries, (item) => item.growthPercent >= 15) < 0) {
    return null;
  }
  return buildGrowthAlert(service, quotaSeries[0], currentGrowth);
}

function buildTrendSinceLabel(
  growthSeries: Array<{ monthLabel: string; growthPercent: number }>,
  quotaSeries: QuotaPoint[],
): string {
  const trendStreakEnd = getStreakEndLabel(growthSeries, (item) => item.growthPercent >= 10);
  const current = quotaSeries[0];
  const previous = quotaSeries[1] ?? null;
  return trendStreakEnd >= 0
    ? growthSeries[trendStreakEnd]?.monthLabel ?? previous?.monthLabel ?? current.monthLabel
    : previous?.monthLabel ?? current.monthLabel;
}

function getTrendAlertIfNeeded(
  service: ServiceRiskSource,
  quotaSeries: QuotaPoint[],
  growthSeries: Array<{ monthLabel: string; growthPercent: number }>,
): ServiceThresholdAlert | null {
  const current = quotaSeries[0];
  const currentGrowth = growthSeries[0]?.growthPercent ?? 0;
  const previousGrowth = growthSeries[1]?.growthPercent ?? null;
  if (currentGrowth < 10 || previousGrowth === null || previousGrowth < 10) {
    return null;
  }
  return buildTrendAlert(service, current, currentGrowth, previousGrowth, buildTrendSinceLabel(growthSeries, quotaSeries));
}

function buildServiceThresholdAlertForService(
  service: ServiceRiskSource,
  historySnapshots: HistorySnapshot[],
): ServiceThresholdAlert | null {
  const quotaSeries = buildQuotaSeries(service, historySnapshots);
  if (quotaSeries.length === 0) {
    return null;
  }
  const growthSeries = buildGrowthSeries(quotaSeries);
  return (
    getQuotaAlertIfNeeded(service, quotaSeries) ??
    getGrowthAlertIfNeeded(service, quotaSeries, growthSeries) ??
    getTrendAlertIfNeeded(service, quotaSeries, growthSeries)
  );
}

export function buildServiceThresholdAlerts(params: {
  currentGeneratedAt: string;
  currentServices: ServiceRiskSource[];
  snapshots: EnvironmentalImpactSnapshotRecord[];
}): ServiceThresholdAlert[] {
  const historySnapshots = buildHistorySnapshots(params);
  return params.currentServices
    .flatMap((service) => {
      const alert = buildServiceThresholdAlertForService(service, historySnapshots);
      return alert ? [alert] : [];
    })
    .sort(compareServiceThresholdAlerts);
}

function compareServiceThresholdAlerts(left: ServiceThresholdAlert, right: ServiceThresholdAlert): number {
  if (left.severity !== right.severity) {
    return left.severity === "critical" ? -1 : 1;
  }
  const signalRank: Record<ServiceThresholdAlertSignal, number> = {
    quotaShare: 0,
    growth: 1,
    trend: 2,
  };
  if (signalRank[left.signal] !== signalRank[right.signal]) {
    return signalRank[left.signal] - signalRank[right.signal];
  }
  return left.serviceLabel.localeCompare(right.serviceLabel, "fr");
}
