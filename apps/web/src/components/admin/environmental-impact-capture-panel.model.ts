import {
  buildServiceQuotaSummary,
  buildServiceRiskRows,
} from "@/lib/environmental-impact-estimator/service-risk";
import { getServicePlanInfo } from "@/lib/environmental-impact-estimator/service-plan";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator";
import type {
  ServiceQuotaSummary,
  ServiceRiskRow,
} from "@/lib/environmental-impact-estimator/service-risk";

export type EnvironmentalImpactCaptureSnapshot = {
  snapshotDate: string;
  generatedAt: string;
  totalKgCo2eProxy: number | null;
  confidencePercent: number;
};

export type EnvironmentalImpactCaptureResponse = {
  status: "ok" | "error";
  triggeredBy?: string;
  version?: string;
  error?: string;
  details?: string;
  model?: {
    generatedAt: string;
    infrastructure: {
      totalKgCo2eProxy: number | null;
      monthlyKgCo2eProxy: number | null;
      annualKgCo2eProxy: number | null;
      confidencePercent: number;
      uncertaintyPercent: number;
      services: EnvironmentalImpactInfrastructureServiceEstimate[];
    };
  };
  signals?: EnvironmentalImpactProjectSignals;
  snapshots?: EnvironmentalImpactCaptureSnapshot[];
};

export type EnvironmentalImpactCaptureServiceRiskProjection = {
  service: EnvironmentalImpactInfrastructureServiceEstimate;
  serviceRisk: ServiceRiskRow;
  planInfo: ReturnType<typeof getServicePlanInfo>;
  quotaSummary: ServiceQuotaSummary;
  primaryQuota: ServiceQuotaSummary["primaryMetric"];
  primaryQuotaConsumedPercent: number | null;
  extraQuotaMetrics: ServiceQuotaSummary["metrics"];
};

export function projectEnvironmentalImpactCapture(
  result: EnvironmentalImpactCaptureResponse | null,
) {
  const latestSnapshot = result?.snapshots?.[0] ?? null;
  const services = result?.model?.infrastructure.services ?? [];
  const serviceByKey = new Map(services.map((service) => [service.key, service] as const));
  const serviceRiskRows = services.length ? buildServiceRiskRows(services) : [];
  const serviceRiskProjections: EnvironmentalImpactCaptureServiceRiskProjection[] = [];

  for (const serviceRisk of serviceRiskRows) {
    const service = serviceByKey.get(serviceRisk.key);
    if (!service) {
      continue;
    }

    const planInfo = getServicePlanInfo(service.key);
    const quotaSummary = buildServiceQuotaSummary(service);
    const primaryQuota = quotaSummary.primaryMetric;

    serviceRiskProjections.push({
      service,
      serviceRisk,
      planInfo,
      quotaSummary,
      primaryQuota,
      primaryQuotaConsumedPercent: primaryQuota?.consumedPercent ?? null,
      extraQuotaMetrics: quotaSummary.metrics.slice(1),
    });
  }

  return {
    latestSnapshot,
    serviceRiskProjections,
  };
}
