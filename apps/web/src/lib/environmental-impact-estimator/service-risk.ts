import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "./types";
import { SERVICE_RISK_POLICY } from "./service-risk-policy";
import { clamp, getGrowthPercent, round } from "./service-risk-metrics";
export { buildServiceThresholdAlerts } from "./service-risk-alerts";
export type { ServiceThresholdAlert } from "./service-risk-alerts";

export type ServiceRiskBand = "faible" | "surveiller" | "alerte" | "critique" | "NA";

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

type ServiceRiskDriverBreakdown = {
  quotaConsumedPercent: number | null;
  growthPercent: number | null;
  confidencePressurePercent: number | null;
  criticalityPercent: number | null;
  thresholdProximityPercent: number | null;
};

export type ServiceRiskRow = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  score: number | null;
  scoreCoverage: "complete" | "partial";
  band: ServiceRiskBand;
  currentKgCo2eProxy: number | null;
  previousKgCo2eProxy: number | null;
  deltaKgCo2eProxy: number | null;
  quotaConsumedPercent: number | null;
  growthPercent: number | null;
  confidencePressurePercent: number | null;
  criticalityPercent: number | null;
  thresholdProximityPercent: number | null;
  driverBreakdown: ServiceRiskDriverBreakdown;
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

function weightedScoreComponent(value: number | null, weight: number): number {
  // The score is a partial weighted sum when no prior snapshot exists. This
  // neutral contribution is distinct from a measured zero and is exposed by
  // scoreCoverage.
  return value === null ? 0 : value * weight;
}

function getRiskBand(score: number): ServiceRiskBand {
  if (score >= SERVICE_RISK_POLICY.scoreBands.critique) {
    return "critique";
  }

  if (score >= SERVICE_RISK_POLICY.scoreBands.alerte) {
    return "alerte";
  }

  if (score >= SERVICE_RISK_POLICY.scoreBands.surveiller) {
    return "surveiller";
  }

  return "faible";
}

function getServiceQuotaState(consumedPercent: number | null): ServiceQuotaState {
  if (consumedPercent === null || Number.isNaN(consumedPercent)) {
    return "NA";
  }

  if (consumedPercent >= SERVICE_RISK_POLICY.quotaStates.depasse) {
    return "dépassé";
  }

  if (consumedPercent >= SERVICE_RISK_POLICY.quotaStates.procheLimite) {
    return "proche limite";
  }

  if (consumedPercent >= SERVICE_RISK_POLICY.quotaStates.attention) {
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
  return SERVICE_RISK_POLICY.criticalityPercentByService[serviceKey];
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

function computeServiceRiskScore(params: {
  service: ServiceRiskSource;
  previousKgCo2eProxy?: number | null;
}): ServiceRiskRow {
  const currentKgCo2eProxy = params.service.monthlyKgCo2eProxy;
  const previousKgCo2eProxy = params.previousKgCo2eProxy ?? null;
  const quotaConsumedPercent = round(clamp(params.service.sharePercent, 0, 100));
  const growthPercent = getGrowthPercent(currentKgCo2eProxy, previousKgCo2eProxy);
  const confidencePressurePercent = round(clamp(100 - params.service.confidencePercent, 0, 100));
  const criticalityPercent = getServiceCriticalityPercent(params.service.key);
  const thresholdProximityPercent = getThresholdProximityPercent(
    params.service.sharePercent,
    params.service.metricEstimates,
  );

  const score = currentKgCo2eProxy === null
    ? null
    : clamp(
        weightedScoreComponent(quotaConsumedPercent, SERVICE_RISK_POLICY.scoreWeights.quotaConsumed) +
          weightedScoreComponent(growthPercent, SERVICE_RISK_POLICY.scoreWeights.growth) +
          weightedScoreComponent(confidencePressurePercent, SERVICE_RISK_POLICY.scoreWeights.confidencePressure) +
          weightedScoreComponent(criticalityPercent, SERVICE_RISK_POLICY.scoreWeights.criticality) +
          weightedScoreComponent(thresholdProximityPercent, SERVICE_RISK_POLICY.scoreWeights.thresholdProximity),
        0,
        100,
      );

  return {
    key: params.service.key,
    label: params.service.label,
    score: score === null ? null : round(score),
    scoreCoverage: score === null || growthPercent === null ? "partial" : "complete",
    band: score === null ? "NA" : getRiskBand(score),
    currentKgCo2eProxy,
    previousKgCo2eProxy,
    deltaKgCo2eProxy:
      currentKgCo2eProxy === null || previousKgCo2eProxy === null
        ? null
        : round(currentKgCo2eProxy - previousKgCo2eProxy),
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
    (previousServices ?? []).map((service) => [service.key, service.monthlyKgCo2eProxy] as const),
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
        return (right.score ?? -1) - (left.score ?? -1);
      }

      if (right.currentKgCo2eProxy !== left.currentKgCo2eProxy) {
        return (right.currentKgCo2eProxy ?? -1) - (left.currentKgCo2eProxy ?? -1);
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
    case "NA":
      return "NA";
    default:
      return "faible";
  }
}
