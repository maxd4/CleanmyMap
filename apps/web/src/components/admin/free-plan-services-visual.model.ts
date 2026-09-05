import type { ServiceStatusInfo } from "@/lib/dashboard/status";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "@/lib/environmental-impact-estimator/types";
import {
  buildPortfolioQuotaSummary,
  buildServiceQuotaSummary,
  buildServiceRiskRows,
  formatServiceQuotaStateLabel,
  formatServiceRiskBandLabel,
  isDevelopmentAiServiceKey,
} from "@/lib/environmental-impact-estimator/service-risk";

import { CHART_COLORS, SERVICE_VISUALS, TOTAL_VISUAL } from "./free-plan-services-visual.meta";

export type FreePlanSelectionKey = "total" | EnvironmentalImpactInfrastructureServiceKey;

export type FreePlanMetricCard = {
  label: string;
  value: number | null;
  unit: "percent" | "kg";
  hint: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "slate";
};

export type FreePlanChartEntry = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  value: number;
  monthlyKgCo2eProxy: number;
  color: string;
  selected: boolean;
};

export type FreePlanDashboardState = {
  selectionKey: FreePlanSelectionKey;
  selectedLabel: string;
  selectedDescription: string;
  selectedBadge: string;
  selectedBand: string;
  selectedHealthState: ServiceStatusInfo["state"] | "total";
  selectedColor: string;
  selectedPrimaryQuotaLabel: string;
  selectedPrimaryQuotaState: string;
  selectedMonthlyKgCo2eProxy: number;
  selectedAnnualKgCo2eProxy: number | null;
  selectedDeltaKgCo2eProxy: number | null;
  totalMonthlyKgCo2eProxy: number;
  totalAnnualKgCo2eProxy: number | null;
  totalDeltaKgCo2eProxy: number | null;
  serviceCount: number;
  quotaCards: FreePlanMetricCard[];
  impactCards: FreePlanMetricCard[];
};

function getPreviousServiceCharge(
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[],
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): number | null {
  return previousServices.find((service) => service.key === serviceKey)?.monthlyKgCo2eProxy ?? null;
}

function getGrowthPercent(
  currentKgCo2eProxy: number,
  previousKgCo2eProxy: number,
): number {
  if (currentKgCo2eProxy <= 0) {
    return 0;
  }

  if (previousKgCo2eProxy <= 0) {
    return 100;
  }

  return Math.max(
    0,
    Math.min(100, ((currentKgCo2eProxy - previousKgCo2eProxy) / previousKgCo2eProxy) * 100),
  );
}

function getWeightAverage(values: Array<{ value: number; weight: number }>): number | null {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  const weightedSum = values.reduce((sum, item) => sum + item.value * item.weight, 0);
  return weightedSum / totalWeight;
}

function getServiceVisualMeta(key: FreePlanSelectionKey) {
  if (key === "total") {
    return TOTAL_VISUAL;
  }

  return SERVICE_VISUALS[key];
}

export function buildFreePlanChartEntries(params: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  selectedKey: FreePlanSelectionKey;
}): FreePlanChartEntry[] {
  const sortedServices = params.services
    .filter((service) => !isDevelopmentAiServiceKey(service.key))
    .slice()
    .sort((left, right) => {
      const byCharge = (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
      if (byCharge !== 0) {
        return byCharge;
      }

      return left.label.localeCompare(right.label, "fr");
    });

  return sortedServices.map((service, index) => {
    const meta = SERVICE_VISUALS[service.key];
    return {
      key: service.key,
      label: service.label,
      value: Math.max(0, service.sharePercent ?? 0),
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
      color: meta.color ?? CHART_COLORS[index % CHART_COLORS.length],
      selected:
        params.selectedKey === "total" ? true : params.selectedKey === service.key,
    };
  });
}

export function buildFreePlanDashboardState(params: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  serviceHealth: Record<string, ServiceStatusInfo>;
  selectedKey: FreePlanSelectionKey;
}): FreePlanDashboardState {
  const quotaServices = params.services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const previousQuotaServices = params.previousServices.filter(
    (service) => !isDevelopmentAiServiceKey(service.key),
  );
  const serviceByKey = new Map(quotaServices.map((service) => [service.key, service] as const));
  const riskRows = buildServiceRiskRows(quotaServices, previousQuotaServices);
  const riskByKey = new Map(riskRows.map((row) => [row.key, row] as const));

  const totalMonthlyKgCo2eProxy = quotaServices.reduce(
    (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const hasAllAnnualValues = quotaServices.every(
    (service) => service.annualKgCo2eProxy !== null && service.annualKgCo2eProxy !== undefined,
  );
  const totalAnnualKgCo2eProxy = hasAllAnnualValues
    ? quotaServices.reduce((sum, service) => sum + (service.annualKgCo2eProxy ?? 0), 0)
    : null;
  const hasPreviousBaseline = previousQuotaServices.length > 0;
  const totalPreviousKgCo2eProxy = hasPreviousBaseline
    ? previousQuotaServices.reduce(
        (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
        0,
      )
    : null;
  const totalDeltaKgCo2eProxy =
    totalPreviousKgCo2eProxy === null
      ? null
      : totalMonthlyKgCo2eProxy - totalPreviousKgCo2eProxy;

  const totalGrowthPercent =
    totalPreviousKgCo2eProxy === null
      ? null
      : getGrowthPercent(totalMonthlyKgCo2eProxy, totalPreviousKgCo2eProxy);
  const totalConfidencePercent = getWeightAverage(
    params.services.map((service) => ({
      value: service.confidencePercent,
      weight: service.monthlyKgCo2eProxy ?? 0,
    })),
  );
  const totalThresholdProximityPercent = getWeightAverage(
    params.services.map((service) => ({
      value: riskByKey.get(service.key)?.thresholdProximityPercent ?? 0,
      weight: service.monthlyKgCo2eProxy ?? 0,
    })),
  );
  const resolvedSelectedKey =
    params.selectedKey === "total" || serviceByKey.has(params.selectedKey)
      ? params.selectedKey
      : "total";
  const selectedService = resolvedSelectedKey === "total" ? null : serviceByKey.get(resolvedSelectedKey) ?? null;
  const selectedRisk = selectedService ? riskByKey.get(selectedService.key) ?? null : null;
  const selectedHealthState = selectedService
    ? params.serviceHealth[selectedService.key]?.state ?? "missing"
    : "total";
  const selectedBadge =
    resolvedSelectedKey === "total"
      ? "Vue globale"
      : params.serviceHealth[selectedService?.key ?? ""]?.state === "ready"
        ? "Configuré"
        : params.serviceHealth[selectedService?.key ?? ""]?.state === "external"
          ? "Externe"
          : params.serviceHealth[selectedService?.key ?? ""]?.state === "defer"
            ? "Différé"
            : params.serviceHealth[selectedService?.key ?? ""]?.state === "missing"
              ? "Manquant"
              : "Suivi";

  const selectedLabel = resolvedSelectedKey === "total" ? "Total" : selectedService?.label ?? "Total";
  const selectedDescription =
    resolvedSelectedKey === "total"
      ? "Vue globale de tous les services web suivis."
      : selectedService?.description ?? "Service sélectionné.";
  const selectedBand =
    resolvedSelectedKey === "total"
      ? "Agrégé"
      : formatServiceRiskBandLabel(selectedRisk?.band ?? "faible");
  const selectedColor = getServiceVisualMeta(resolvedSelectedKey).color;

  const selectedMonthlyKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalMonthlyKgCo2eProxy
      : selectedService?.monthlyKgCo2eProxy ?? 0;
  const selectedAnnualKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalAnnualKgCo2eProxy
      : selectedService?.annualKgCo2eProxy ?? null;
  const selectedDeltaKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalDeltaKgCo2eProxy
      : selectedService
        ? (() => {
            const previousMonthlyKgCo2eProxy = getPreviousServiceCharge(
              params.previousServices,
              selectedService.key,
            );
            if (previousMonthlyKgCo2eProxy === null) {
              return null;
            }

            return selectedMonthlyKgCo2eProxy - previousMonthlyKgCo2eProxy;
          })()
        : null;
  const selectedThresholdProximityPercent =
    resolvedSelectedKey === "total"
      ? totalThresholdProximityPercent
      : selectedRisk?.thresholdProximityPercent ?? null;
  const selectedGrowthPercent =
    resolvedSelectedKey === "total"
      ? totalGrowthPercent
      : selectedRisk?.growthPercent ?? null;
  const selectedConfidencePercent =
    resolvedSelectedKey === "total"
      ? totalConfidencePercent
      : selectedService?.confidencePercent ?? null;
  const selectedQuotaSummary =
    resolvedSelectedKey === "total"
      ? buildPortfolioQuotaSummary(quotaServices)
      : selectedService
        ? buildServiceQuotaSummary(selectedService)
        : null;
  const selectedPrimaryQuota = selectedQuotaSummary?.primaryMetric ?? null;
  const selectedPrimaryQuotaLabel = selectedPrimaryQuota?.label ?? "NA";
  const selectedPrimaryQuotaState = selectedQuotaSummary?.state ?? "NA";
  const selectedPrimaryQuotaPercent = selectedPrimaryQuota?.consumedPercent ?? null;

  const quotaCards: FreePlanMetricCard[] = [
    {
      label: "Quota principal",
      value: selectedPrimaryQuotaPercent,
      unit: "percent",
      hint:
        selectedPrimaryQuota === null
          ? "NA"
          : `${selectedPrimaryQuotaLabel} · ${formatServiceQuotaStateLabel(selectedPrimaryQuotaState)}`,
      tone: "sky",
    },
    {
      label: "Proximité du seuil",
      value: selectedThresholdProximityPercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Moyenne pondérée des proxys de seuil."
          : "Lecture de la tension sur le quota alloué.",
      tone: "amber",
    },
    {
      label: "Croissance mensuelle",
      value: selectedGrowthPercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Variation du portefeuille total vs mois précédent."
          : "Signal de dérive du service sélectionné.",
      tone: "rose",
    },
    {
      label: "Confiance",
      value: selectedConfidencePercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Moyenne pondérée par la charge mensuelle."
          : "Fiabilité de la lecture du service.",
      tone: "emerald",
    },
  ];

  const impactCards: FreePlanMetricCard[] = [
    {
      label: "Pollution mensuelle",
      value: selectedMonthlyKgCo2eProxy,
      unit: "kg",
      hint:
        resolvedSelectedKey === "total"
          ? "Somme de tous les services suivis."
          : "Charge proxy du service sélectionné.",
      tone: "sky",
    },
    {
      label: "Pollution annuelle",
      value: selectedAnnualKgCo2eProxy,
      unit: "kg",
      hint: "Projection sur douze mois.",
      tone: "emerald",
    },
    {
      label: "Delta vs N-1",
      value: selectedDeltaKgCo2eProxy,
      unit: "kg",
      hint:
        resolvedSelectedKey === "total"
          ? "Écart du portefeuille total par rapport au snapshot précédent."
          : "Écart du service sélectionné par rapport au mois précédent.",
      tone: (selectedDeltaKgCo2eProxy ?? 0) >= 0 ? "rose" : "emerald",
    },
    {
      label: "Total portefeuille",
      value: totalMonthlyKgCo2eProxy,
      unit: "kg",
      hint: `${quotaServices.length} service${quotaServices.length > 1 ? "s" : ""} web suivis.`,
      tone: "amber",
    },
  ];

  return {
    selectionKey: resolvedSelectedKey,
    selectedLabel,
    selectedDescription,
    selectedBadge,
    selectedBand,
    selectedHealthState,
    selectedColor,
    selectedPrimaryQuotaLabel,
    selectedPrimaryQuotaState,
    selectedMonthlyKgCo2eProxy,
    selectedAnnualKgCo2eProxy,
    selectedDeltaKgCo2eProxy,
    totalMonthlyKgCo2eProxy,
    totalAnnualKgCo2eProxy,
    totalDeltaKgCo2eProxy,
    serviceCount: quotaServices.length,
    quotaCards,
    impactCards,
  };
}
