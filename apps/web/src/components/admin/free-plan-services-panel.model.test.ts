import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator";
import {
  buildFreePlanServicesPanelModel,
  countMetricsBySource,
} from "./free-plan-services-panel.model";

function makeMetric(
  source: EnvironmentalImpactInfrastructureMetricEstimate["source"],
  key = `${source}-metric` as EnvironmentalImpactInfrastructureMetricEstimate["key"],
): EnvironmentalImpactInfrastructureMetricEstimate {
  return {
    key,
    label: key,
    unitLabel: "unités / mois",
    proxyKgCo2ePerUnit: 1,
    referenceMonthlyQuantity: 100,
    quantityPerMonth: source === "reference" ? null : 50,
    estimatedKgCo2eProxy: source === "reference" ? null : 0.5,
    source,
  };
}

function makeService(
  overrides: Partial<EnvironmentalImpactInfrastructureServiceEstimate> = {},
): EnvironmentalImpactInfrastructureServiceEstimate {
  const metricEstimates = overrides.metricEstimates ?? [];
  return {
    key: "vercel",
    label: "Vercel",
    description: "Hébergement",
    sourceNote: "Source de test",
    basis: "monthly",
    status: "derived",
    monthlyKgCo2eProxy: 1,
    annualKgCo2eProxy: 12,
    sharePercent: 50,
    confidencePercent: 80,
    uncertaintyPercent: 20,
    metricCount: metricEstimates.length,
    referenceMetricCount: metricEstimates.filter((metric) => metric.source === "reference").length,
    metricEstimates,
    ...overrides,
  };
}

function makeSnapshot(
  snapshotDate: string,
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): EnvironmentalImpactSnapshotRecord {
  return {
    snapshotDate,
    model: { infrastructure: { services } },
  } as unknown as EnvironmentalImpactSnapshotRecord;
}

describe("buildFreePlanServicesPanelModel", () => {
  it("exclut les services IA de développement et compte les métriques par source", () => {
    const services = [
      makeService({
        key: "vercel",
        metricEstimates: [makeMetric("input"), makeMetric("derived", "vercelPageViews")],
        metricCount: 2,
      }),
      makeService({
        key: "codex",
        label: "Codex",
        metricEstimates: [makeMetric("reference", "codexSessions")],
        metricCount: 1,
      }),
    ];

    const model = buildFreePlanServicesPanelModel({
      services,
      snapshots: [],
      generatedAt: "2026-05-20T12:00:00.000Z",
      serviceHealth: {},
    });

    expect(model.quotaServices.map((service) => service.key)).toEqual(["vercel"]);
    expect(model.inputMetrics).toBe(1);
    expect(model.derivedMetrics).toBe(1);
    expect(model.referenceMetrics).toBe(0);
    expect(countMetricsBySource(services, "reference")).toBe(1);
  });

  it("trie la pression et identifie le leader avec comparaison au snapshot précédent", () => {
    const currentServices = [
      makeService({ key: "vercel", label: "Vercel", monthlyKgCo2eProxy: 2 }),
      makeService({ key: "supabase", label: "Supabase", monthlyKgCo2eProxy: 5 }),
      makeService({ key: "codex", label: "Codex", monthlyKgCo2eProxy: 99 }),
    ];
    const previousServices = [
      makeService({ key: "vercel", monthlyKgCo2eProxy: 1 }),
      makeService({ key: "supabase", monthlyKgCo2eProxy: 5 }),
    ];

    const model = buildFreePlanServicesPanelModel({
      services: currentServices,
      snapshots: [
        makeSnapshot("2026-06-01", currentServices),
        makeSnapshot("2026-05-01", previousServices),
      ],
      generatedAt: "2026-06-20T12:00:00.000Z",
      serviceHealth: {},
    });

    expect(model.sortedServices.map((service) => service.key)).toEqual(["supabase", "vercel"]);
    expect(model.servicePressureLeader?.key).toBe("supabase");
    expect(model.servicePressureRows.find((row) => row.key === "vercel")).toMatchObject({
      previousKgCo2eProxy: 1,
      currentKgCo2eProxy: 2,
      deltaKgCo2eProxy: 1,
    });
    expect(model.servicePressureGrowth[0]).toMatchObject({ key: "vercel", deltaKgCo2eProxy: 1 });
  });

  it("agrège les bandes de risque produites par le helper métier", () => {
    const services = [
      makeService({
        key: "vercel",
        sharePercent: 0,
        confidencePercent: 100,
        monthlyKgCo2eProxy: 0,
      }),
      makeService({
        key: "supabase",
        sharePercent: 100,
        confidencePercent: 90,
        monthlyKgCo2eProxy: 4,
        metricEstimates: [
          {
            ...makeMetric("input", "supabaseDbRequests"),
            quantityPerMonth: 100,
            referenceMonthlyQuantity: 100,
          },
        ],
      }),
    ];

    const model = buildFreePlanServicesPanelModel({
      services,
      snapshots: [],
      generatedAt: "2026-06-20T12:00:00.000Z",
      serviceHealth: {},
    });

    expect(model.serviceRiskCounts).toEqual({
      faible: 1,
      surveiller: 0,
      alerte: 1,
      critique: 0,
    });
    expect(Object.values(model.serviceRiskCounts).reduce((sum, count) => sum + count, 0)).toBe(
      model.serviceRiskRows.length,
    );
  });
});
