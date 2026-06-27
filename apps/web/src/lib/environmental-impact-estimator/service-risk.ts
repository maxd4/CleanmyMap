import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "./types";
export { buildServiceThresholdAlerts } from "./service-risk-alerts";

export type ServiceRiskBand = "faible" | "surveiller" | "alerte" | "critique";

export type ServiceQuotaState = "ok" | "attention" | "proche limite" | "dépassé" | "NA";

export type ServiceQuotaMetricSummary = {
  key: string;
  label: string;
  unitLabel: string;
  quantityPerMonth: number | null;
  referenceMonthlyQuantity: number;
  consumedPercent: number | null;
  estimatedKgCo2eProxy: number | null;
  source: EnvironmentalImpactInfrastructureMetricEstimate["source"];
  state: ServiceQuotaState;
  isPrimary: boolean;
};

export type ServiceQuotaSummary = {
  state: ServiceQuotaState;
  primaryMetric: ServiceQuotaMetricSummary | null;
  metrics: ServiceQuotaMetricSummary[];
};

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

const DEVELOPMENT_AI_SERVICE_KEYS = new Set<EnvironmentalImpactInfrastructureServiceKey>([
  "chatgpt",
  "codex",
]);

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

export function isDevelopmentAiServiceKey(
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): boolean {
  return DEVELOPMENT_AI_SERVICE_KEYS.has(serviceKey);
}

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

function getServiceQuotaState(consumedPercent: number | null): ServiceQuotaState {
  if (consumedPercent === null || Number.isNaN(consumedPercent)) {
    return "NA";
  }

  if (consumedPercent >= 100) {
    return "dépassé";
  }

  if (consumedPercent >= 90) {
    return "proche limite";
  }

  if (consumedPercent >= 70) {
    return "attention";
  }

  return "ok";
}

export function formatServiceQuotaStateLabel(state: ServiceQuotaState): string {
  switch (state) {
    case "dépassé":
      return "dépassé";
    case "proche limite":
      return "proche limite";
    case "attention":
      return "attention";
    case "ok":
      return "OK";
    default:
      return "NA";
  }
}

function getMetricConsumedPercent(
  metric: EnvironmentalImpactInfrastructureMetricEstimate,
): number | null {
  if (metric.quantityPerMonth === null || metric.referenceMonthlyQuantity <= 0) {
    return null;
  }

  return round((metric.quantityPerMonth / metric.referenceMonthlyQuantity) * 100);
}

function compareQuotaMetrics(
  left: ServiceQuotaMetricSummary,
  right: ServiceQuotaMetricSummary,
): number {
  const leftPercent = left.consumedPercent ?? -1;
  const rightPercent = right.consumedPercent ?? -1;

  if (rightPercent !== leftPercent) {
    return rightPercent - leftPercent;
  }

  const leftImpact = left.estimatedKgCo2eProxy ?? -1;
  const rightImpact = right.estimatedKgCo2eProxy ?? -1;
  if (rightImpact !== leftImpact) {
    return rightImpact - leftImpact;
  }

  return left.label.localeCompare(right.label, "fr");
}

export function buildServiceQuotaSummary(
  service: EnvironmentalImpactInfrastructureServiceEstimate,
): ServiceQuotaSummary {
  const metrics = service.metricEstimates
    .map<ServiceQuotaMetricSummary>((metric) => {
      const consumedPercent = getMetricConsumedPercent(metric);
      return {
        key: metric.key,
        label: metric.label,
        unitLabel: metric.unitLabel,
        quantityPerMonth: metric.quantityPerMonth,
        referenceMonthlyQuantity: metric.referenceMonthlyQuantity,
        consumedPercent,
        estimatedKgCo2eProxy: metric.estimatedKgCo2eProxy,
        source: metric.source,
        state: getServiceQuotaState(consumedPercent),
        isPrimary: false,
      };
    })
    .sort(compareQuotaMetrics);

  const primaryMetric = metrics[0] ?? null;

  return {
    state: primaryMetric?.state ?? "NA",
    primaryMetric:
      primaryMetric === null
        ? null
        : {
            ...primaryMetric,
            isPrimary: true,
          },
    metrics: metrics.map((metric, index) => ({
      ...metric,
      isPrimary: index === 0,
    })),
  };
}

export function buildPortfolioQuotaSummary(
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): ServiceQuotaSummary {
  const webQuotaServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));

  const metrics = webQuotaServices
    .flatMap((service) =>
      service.metricEstimates.map<ServiceQuotaMetricSummary>((metric) => {
        const consumedPercent = getMetricConsumedPercent(metric);
        return {
          key: `${service.key}:${metric.key}`,
          label: metric.label,
          unitLabel: metric.unitLabel,
          quantityPerMonth: metric.quantityPerMonth,
          referenceMonthlyQuantity: metric.referenceMonthlyQuantity,
          consumedPercent,
          estimatedKgCo2eProxy: metric.estimatedKgCo2eProxy,
          source: metric.source,
          state: getServiceQuotaState(consumedPercent),
          isPrimary: false,
        };
      }),
    )
    .sort(compareQuotaMetrics);

  const primaryMetric = metrics[0] ?? null;

  return {
    state: primaryMetric?.state ?? "NA",
    primaryMetric:
      primaryMetric === null
        ? null
        : {
            ...primaryMetric,
            isPrimary: true,
          },
    metrics: metrics.map((metric, index) => ({
      ...metric,
      isPrimary: index === 0,
    })),
  };
}

function getServiceCriticalityPercent(
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): number {
  return SERVICE_CRITICALITY_BY_KEY[serviceKey] ?? 50;
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
