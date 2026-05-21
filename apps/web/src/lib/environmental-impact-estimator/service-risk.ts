import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
  EnvironmentalImpactSnapshotRecord,
} from "./types";

export type ServiceRiskBand = "faible" | "surveiller" | "alerte" | "critique";

export type ServiceRiskDriverBreakdown = {
  quotaConsumedPercent: number;
  growthPercent: number;
  confidencePressurePercent: number;
  criticalityPercent: number;
  thresholdProximityPercent: number;
};

export type ServiceRiskRow = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  score: number;
  band: ServiceRiskBand;
  currentKgCo2eProxy: number;
  previousKgCo2eProxy: number;
  deltaKgCo2eProxy: number;
  quotaConsumedPercent: number;
  growthPercent: number;
  confidencePressurePercent: number;
  criticalityPercent: number;
  thresholdProximityPercent: number;
  driverBreakdown: ServiceRiskDriverBreakdown;
};

export type ServiceThresholdAlertSeverity = "warning" | "critical";
export type ServiceThresholdAlertSignal = "quotaShare" | "growth" | "trend";

export type ServiceThresholdAlert = {
  id: string;
  serviceKey: EnvironmentalImpactInfrastructureServiceKey;
  serviceLabel: string;
  severity: ServiceThresholdAlertSeverity;
  signal: ServiceThresholdAlertSignal;
  title: string;
  thresholdLabel: string;
  details: string;
  sinceLabel: string;
  recommendedAction: string;
};

type ServiceRiskSource = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  monthlyKgCo2eProxy: number | null;
  sharePercent: number;
  confidencePercent: number;
  metricEstimates: EnvironmentalImpactInfrastructureMetricEstimate[];
};

type ServiceRiskPreviousSource = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  monthlyKgCo2eProxy: number | null;
};

const SERVICE_CRITICALITY_BY_KEY: Partial<
  Record<EnvironmentalImpactInfrastructureServiceKey, number>
> = {
  supabase: 100,
  vercel: 95,
  clerk: 90,
  resend: 72,
  stripe: 70,
  upstash: 66,
  sentry: 62,
  posthog: 58,
  pinecone: 56,
  chatgpt: 54,
  codex: 64,
  lwsDomain: 40,
};

function round(value: number): number {
  return Math.round(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRiskBand(score: number): ServiceRiskBand {
  if (score >= 80) {
    return "critique";
  }

  if (score >= 60) {
    return "alerte";
  }

  if (score >= 30) {
    return "surveiller";
  }

  return "faible";
}

function getServiceCriticalityPercent(
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): number {
  return SERVICE_CRITICALITY_BY_KEY[serviceKey] ?? 50;
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

function getThresholdProximityPercent(
  sharePercent: number,
  metricEstimates: EnvironmentalImpactInfrastructureMetricEstimate[],
): number {
  const quotaPressureCandidates = metricEstimates
    .filter(
      (
        metric,
      ): metric is EnvironmentalImpactInfrastructureMetricEstimate & {
        quantityPerMonth: number;
      } => metric.referenceMonthlyQuantity > 0 && metric.quantityPerMonth !== null,
    )
    .map((metric) =>
      clamp((metric.quantityPerMonth / metric.referenceMonthlyQuantity) * 100, 0, 100),
    );

  if (quotaPressureCandidates.length > 0) {
    return round(Math.max(...quotaPressureCandidates));
  }

  return round(clamp(sharePercent, 0, 100));
}

function getGrowthPercent(
  currentKgCo2eProxy: number,
  previousKgCo2eProxy: number | null | undefined,
): number {
  if (currentKgCo2eProxy <= 0) {
    return 0;
  }

  if (previousKgCo2eProxy === null || previousKgCo2eProxy === undefined) {
    return 0;
  }

  if (previousKgCo2eProxy <= 0) {
    return 100;
  }

  return round(
    clamp(
      ((currentKgCo2eProxy - previousKgCo2eProxy) / previousKgCo2eProxy) * 100,
      0,
      100,
    ),
  );
}

function getServiceSummaryFromSnapshot(
  snapshot: EnvironmentalImpactSnapshotRecord | null | undefined,
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): {
  snapshotDate: string;
  monthLabel: string;
  monthlyKgCo2eProxy: number;
  sharePercent: number;
} | null {
  if (!snapshot) {
    return null;
  }

  const service = snapshot.model.infrastructure.services.find((item) => item.key === serviceKey);
  if (!service) {
    return null;
  }

  return {
    snapshotDate: snapshot.snapshotDate,
    monthLabel: formatMonthLabel(snapshot.snapshotDate),
    monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
    sharePercent: clamp(service.sharePercent, 0, 100),
  };
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

export function computeServiceRiskScore(params: {
  service: ServiceRiskSource;
  previousKgCo2eProxy?: number | null;
}): ServiceRiskRow {
  const currentKgCo2eProxy = params.service.monthlyKgCo2eProxy ?? 0;
  const previousKgCo2eProxy = params.previousKgCo2eProxy ?? null;
  const quotaConsumedPercent = round(clamp(params.service.sharePercent, 0, 100));
  const growthPercent = getGrowthPercent(currentKgCo2eProxy, previousKgCo2eProxy);
  const confidencePressurePercent = round(clamp(100 - params.service.confidencePercent, 0, 100));
  const criticalityPercent = getServiceCriticalityPercent(params.service.key);
  const thresholdProximityPercent = getThresholdProximityPercent(
    params.service.sharePercent,
    params.service.metricEstimates,
  );

  const score = clamp(
    quotaConsumedPercent * 0.24 +
      growthPercent * 0.22 +
      confidencePressurePercent * 0.16 +
      criticalityPercent * 0.18 +
      thresholdProximityPercent * 0.2,
    0,
    100,
  );

  return {
    key: params.service.key,
    label: params.service.label,
    score: round(score),
    band: getRiskBand(score),
    currentKgCo2eProxy,
    previousKgCo2eProxy: previousKgCo2eProxy ?? 0,
    deltaKgCo2eProxy: round(currentKgCo2eProxy - (previousKgCo2eProxy ?? 0)),
    quotaConsumedPercent,
    growthPercent,
    confidencePressurePercent,
    criticalityPercent,
    thresholdProximityPercent,
    driverBreakdown: {
      quotaConsumedPercent,
      growthPercent,
      confidencePressurePercent,
      criticalityPercent,
      thresholdProximityPercent,
    },
  };
}

export function buildServiceRiskRows(
  services: ServiceRiskSource[],
  previousServices: ServiceRiskPreviousSource[] | null | undefined = null,
): ServiceRiskRow[] {
  const previousByKey = new Map(
    (previousServices ?? []).map((service) => [service.key, service.monthlyKgCo2eProxy ?? 0] as const),
  );

  return services
    .map((service) =>
      computeServiceRiskScore({
        service,
        previousKgCo2eProxy: previousByKey.get(service.key) ?? null,
      }),
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.currentKgCo2eProxy !== left.currentKgCo2eProxy) {
        return right.currentKgCo2eProxy - left.currentKgCo2eProxy;
      }

      return left.label.localeCompare(right.label, "fr");
    });
}

export function buildServiceThresholdAlerts(params: {
  currentGeneratedAt: string;
  currentServices: ServiceRiskSource[];
  snapshots: EnvironmentalImpactSnapshotRecord[];
}): ServiceThresholdAlert[] {
  const currentSnapshotDate = params.currentGeneratedAt.slice(0, 10);
  const currentSnapshotMonth = currentSnapshotDate.slice(0, 7);
  const historySnapshots = [
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

  const alerts: ServiceThresholdAlert[] = [];

  for (const service of params.currentServices) {
    const quotaSeries = historySnapshots
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
      .filter(
        (
          item,
        ): item is {
          snapshotDate: string;
          monthLabel: string;
          sharePercent: number;
          monthlyKgCo2eProxy: number;
        } => item !== null,
      );

    if (quotaSeries.length === 0) {
      continue;
    }

    const current = quotaSeries[0];
    const previous = quotaSeries[1] ?? null;

    const growthSeries = quotaSeries.slice(0, Math.max(0, quotaSeries.length - 1)).map((item, index) => {
      const previousItem = quotaSeries[index + 1] ?? null;
      return {
        monthLabel: item.monthLabel,
        growthPercent: getGrowthPercent(item.monthlyKgCo2eProxy, previousItem?.monthlyKgCo2eProxy ?? null),
      };
    });

    const quotaThreshold = 70;
    const growthThreshold = 15;
    const trendThreshold = 10;

    const quotaStreakEnd = getStreakEndLabel(quotaSeries, (item) => item.sharePercent >= quotaThreshold);
    if (quotaStreakEnd >= 0) {
      const sinceLabel = quotaSeries[quotaStreakEnd]?.monthLabel ?? current.monthLabel;
      const overage = current.sharePercent - quotaThreshold;
      alerts.push({
        id: `${service.key}:quotaShare:${current.snapshotDate}`,
        serviceKey: service.key,
        serviceLabel: service.label,
        severity: "critical",
        signal: "quotaShare",
        title: "Quota de catégorie dépassé",
        thresholdLabel: "usage > 70 % du quota alloué à la catégorie",
        details: `${formatPercentValue(current.sharePercent)} % consommés, soit +${formatPercentValue(overage)} points au-dessus du seuil.`,
        sinceLabel,
        recommendedAction: getRecommendedAction("quotaShare"),
      });
      continue;
    }

    const currentGrowth = growthSeries[0]?.growthPercent ?? 0;
    const previousGrowth = growthSeries[1]?.growthPercent ?? null;
    const growthStreakEnd = getStreakEndLabel(growthSeries, (item) => item.growthPercent >= growthThreshold);
    if (growthStreakEnd >= 0 && currentGrowth >= growthThreshold) {
      const sinceLabel = growthSeries[growthStreakEnd]?.monthLabel ?? current.monthLabel;
      const overage = currentGrowth - growthThreshold;
      alerts.push({
        id: `${service.key}:growth:${current.snapshotDate}`,
        serviceKey: service.key,
        serviceLabel: service.label,
        severity: "critical",
        signal: "growth",
        title: "Croissance mensuelle excessive",
        thresholdLabel: "croissance > +15 % sur un mois",
        details: `Croissance de +${formatPercentValue(currentGrowth)} % ce mois-ci, soit +${formatPercentValue(overage)} points au-dessus du seuil.`,
        sinceLabel,
        recommendedAction: getRecommendedAction("growth"),
      });
      continue;
    }

    if (currentGrowth >= trendThreshold && previousGrowth !== null && previousGrowth >= trendThreshold) {
      const trendStreakEnd = getStreakEndLabel(growthSeries, (item) => item.growthPercent >= trendThreshold);
      const sinceLabel =
        trendStreakEnd >= 0
          ? growthSeries[trendStreakEnd]?.monthLabel ?? previous?.monthLabel ?? current.monthLabel
          : previous?.monthLabel ?? current.monthLabel;
      alerts.push({
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
      });
    }
  }

  return alerts.sort((left, right) => {
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
  });
}

export function formatServiceRiskBandLabel(band: ServiceRiskBand): string {
  switch (band) {
    case "critique":
      return "critique";
    case "alerte":
      return "alerte";
    case "surveiller":
      return "surveiller";
    default:
      return "faible";
  }
}
