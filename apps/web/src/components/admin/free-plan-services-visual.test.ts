import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
} from "@/lib/environmental-impact-estimator";
import type { ServiceStatusInfo } from "@/lib/dashboard/status";
import {
  FreePlanServicesVisual,
  buildFreePlanChartEntries,
  buildFreePlanDashboardState,
} from "./free-plan-services-visual";

function buildMetric(
  key: string,
  label: string,
  quantityPerMonth: number,
  referenceMonthlyQuantity: number,
): EnvironmentalImpactInfrastructureMetricEstimate {
  return {
    key,
    label,
    unitLabel: "unités / mois",
    proxyKgCo2ePerUnit: 0.01,
    referenceMonthlyQuantity,
    quantityPerMonth,
    estimatedKgCo2eProxy: quantityPerMonth * 0.01,
    source: "derived",
  };
}

function buildService(
  overrides: Partial<EnvironmentalImpactInfrastructureServiceEstimate> & {
    key: EnvironmentalImpactInfrastructureServiceEstimate["key"];
    label: string;
  },
): EnvironmentalImpactInfrastructureServiceEstimate {
  return {
    key: overrides.key,
    label: overrides.label,
    description: overrides.description ?? `${overrides.label} description`,
    sourceNote: overrides.sourceNote ?? `${overrides.label} source note`,
    basis: overrides.basis ?? "monthly",
    status: overrides.status ?? "ready",
    monthlyKgCo2eProxy: overrides.monthlyKgCo2eProxy ?? 0,
    annualKgCo2eProxy: overrides.annualKgCo2eProxy ?? 0,
    sharePercent: overrides.sharePercent ?? 0,
    confidencePercent: overrides.confidencePercent ?? 0,
    uncertaintyPercent: overrides.uncertaintyPercent ?? 0,
    metricCount: overrides.metricCount ?? 1,
    referenceMetricCount: overrides.referenceMetricCount ?? 0,
    metricEstimates: overrides.metricEstimates ?? [
      buildMetric(`${overrides.key}-metric`, `${overrides.label} metric`, 50, 100),
    ],
  };
}

const services = [
  buildService({
    key: "vercel",
    label: "Vercel",
    description: "Hébergement front",
    monthlyKgCo2eProxy: 1.2,
    annualKgCo2eProxy: 14.4,
    sharePercent: 30,
    confidencePercent: 82,
    metricEstimates: [buildMetric("vercelDeployments", "Vercel - déploiements", 50, 100)],
  }),
  buildService({
    key: "supabase",
    label: "Supabase",
    description: "Base de données",
    monthlyKgCo2eProxy: 2.8,
    annualKgCo2eProxy: 33.6,
    sharePercent: 70,
    confidencePercent: 90,
    metricEstimates: [buildMetric("supabaseStorage", "Supabase - stockage", 50, 100)],
  }),
] as EnvironmentalImpactInfrastructureServiceEstimate[];

const previousServices = [
  buildService({
    key: "vercel",
    label: "Vercel",
    monthlyKgCo2eProxy: 0.8,
    annualKgCo2eProxy: 9.6,
    sharePercent: 20,
    confidencePercent: 80,
    metricEstimates: [buildMetric("vercelDeployments", "Vercel - déploiements", 40, 100)],
  }),
  buildService({
    key: "supabase",
    label: "Supabase",
    monthlyKgCo2eProxy: 2,
    annualKgCo2eProxy: 24,
    sharePercent: 80,
    confidencePercent: 88,
    metricEstimates: [buildMetric("supabaseStorage", "Supabase - stockage", 40, 100)],
  }),
] as EnvironmentalImpactInfrastructureServiceEstimate[];

const serviceHealth: Record<string, ServiceStatusInfo> = {
  vercel: {
    state: "external",
    label: "Vercel",
    description: "Hébergement front",
    category: "external",
    severity: "warning",
    statusMessage: "",
  },
  supabase: {
    state: "ready",
    label: "Supabase",
    description: "Base de données",
    category: "critical",
    severity: "ok",
    statusMessage: "",
  },
};

describe("free-plan-services visual", () => {
  it("builds the total dashboard state by default", () => {
    const state = buildFreePlanDashboardState({
      services,
      previousServices,
      serviceHealth,
      selectedKey: "total",
    });

    expect(state.selectionKey).toBe("total");
    expect(state.selectedLabel).toBe("Total");
    expect(state.selectedMonthlyKgCo2eProxy).toBe(4);
    expect(state.selectedAnnualKgCo2eProxy).toBe(48);
    expect(state.selectedDeltaKgCo2eProxy).toBeCloseTo(1.2, 6);
    expect(state.quotaCards[0]?.value).toBe(100);
    expect(state.impactCards[0]?.value).toBe(4);
    expect(state.impactCards[3]?.value).toBe(4);
  });

  it("fills the cards when a service is selected", () => {
    const state = buildFreePlanDashboardState({
      services,
      previousServices,
      serviceHealth,
      selectedKey: "supabase",
    });

    expect(state.selectionKey).toBe("supabase");
    expect(state.selectedLabel).toBe("Supabase");
    expect(state.selectedMonthlyKgCo2eProxy).toBe(2.8);
    expect(state.selectedAnnualKgCo2eProxy).toBe(33.6);
    expect(state.selectedDeltaKgCo2eProxy).toBeCloseTo(0.8, 6);
    expect(state.quotaCards[0]?.value).toBe(70);
    expect(state.quotaCards[1]?.value).toBe(50);
    expect(state.impactCards[0]?.value).toBe(2.8);
    expect(state.impactCards[3]?.value).toBe(4);
  });

  it("falls back to Total when the selected service is missing", () => {
    const state = buildFreePlanDashboardState({
      services,
      previousServices,
      serviceHealth,
      selectedKey: "sentry",
    });

    expect(state.selectionKey).toBe("total");
    expect(state.selectedLabel).toBe("Total");
  });

  it("builds the donut data with the selected slice highlighted", () => {
    const chartEntries = buildFreePlanChartEntries({
      services,
      selectedKey: "supabase",
    });

    expect(chartEntries).toHaveLength(2);
    expect(chartEntries[0]?.key).toBe("supabase");
    expect(chartEntries[0]?.selected).toBe(true);
    expect(chartEntries[1]?.key).toBe("vercel");
    expect(chartEntries[1]?.selected).toBe(false);
    expect(chartEntries[0]?.value).toBe(70);
    expect(chartEntries[1]?.value).toBe(30);
  });

  it("renders the interactive dashboard labels", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FreePlanServicesVisual, {
        services,
        previousServices,
        serviceHealth,
      }),
    );

    expect(markup).toContain("Sélecteur des plans gratuits");
    expect(markup).toContain("Total");
    expect(markup).toContain("Vercel");
    expect(markup).toContain("Supabase");
    expect(markup).toContain("Part du plan utilisée");
    expect(markup).toContain("Proximité du seuil");
    expect(markup).toContain("Croissance mensuelle");
    expect(markup).toContain("Confiance");
    expect(markup).toContain("Pollution mensuelle");
    expect(markup).toContain("Pollution annuelle");
    expect(markup).toContain("Delta vs N-1");
  });

  it("renders NA when no previous snapshot exists", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FreePlanServicesVisual, {
        services,
        previousServices: [],
        serviceHealth,
      }),
    );

    expect(markup).toContain("NA");
    expect(markup).toContain("Delta vs N-1");
    expect(markup).toContain("Croissance mensuelle");
  });
});
