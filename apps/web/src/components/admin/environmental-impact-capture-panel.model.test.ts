import { describe, expect, it } from "vitest";
import { createEnvironmentalImpactServices } from "@/lib/environmental-impact-estimator/environmental-impact-test-fixtures";
import { quotaSummaryMetricEstimates } from "@/lib/environmental-impact-estimator/service-risk.fixtures";
import type { EnvironmentalImpactInfrastructureMetricEstimate } from "@/lib/environmental-impact-estimator/types";
import {
  projectEnvironmentalImpactCapture,
  type EnvironmentalImpactCaptureResponse,
} from "./environmental-impact-capture-panel.model";

describe("projectEnvironmentalImpactCapture", () => {
  it("keeps the latest snapshot and the canonical risk/quota projection together", () => {
    const services = createEnvironmentalImpactServices("infrastructure");
    const supabase = services.find((service) => service.key === "supabase");

    expect(supabase).toBeDefined();

    const result: EnvironmentalImpactCaptureResponse = {
      status: "ok",
      version: "environmental-impact-estimator-test",
      snapshots: [
        {
          snapshotDate: "2026-05-20",
          generatedAt: "2026-05-20T12:00:00.000Z",
          totalKgCo2eProxy: 12.34,
          confidencePercent: 82,
        },
      ],
      model: {
        generatedAt: "2026-05-20T12:00:00.000Z",
        infrastructure: {
          totalKgCo2eProxy: 12.34,
          monthlyKgCo2eProxy: 1.23,
          annualKgCo2eProxy: 14.76,
          confidencePercent: 82,
          uncertaintyPercent: 18,
          services: [
            {
              ...supabase!,
              metricEstimates: quotaSummaryMetricEstimates as unknown as EnvironmentalImpactInfrastructureMetricEstimate[],
            },
          ],
        },
      },
    };

    const projection = projectEnvironmentalImpactCapture(result);
    const [supabaseProjection] = projection.serviceRiskProjections;

    expect(projection.latestSnapshot?.totalKgCo2eProxy).toBe(12.34);
    expect(supabaseProjection.serviceRisk.key).toBe("supabase");
    expect(supabaseProjection.quotaSummary.primaryMetric?.label).toBe("Bande passante");
    expect(supabaseProjection.primaryQuotaConsumedPercent).toBe(92);
    expect(supabaseProjection.extraQuotaMetrics).toHaveLength(1);
  });

  it("does not turn an unavailable service measure into a risk score", () => {
    const services = createEnvironmentalImpactServices("infrastructure");
    const result: EnvironmentalImpactCaptureResponse = {
      status: "ok",
      model: {
        generatedAt: "2026-05-20T12:00:00.000Z",
        infrastructure: {
          totalKgCo2eProxy: null,
          monthlyKgCo2eProxy: null,
          annualKgCo2eProxy: null,
          confidencePercent: 0,
          uncertaintyPercent: 100,
          services: [
            {
              ...services.find((service) => service.key === "vercel")!,
              monthlyKgCo2eProxy: null,
            },
          ],
        },
      },
    };

    const [projection] = projectEnvironmentalImpactCapture(result).serviceRiskProjections;

    expect(projection.serviceRisk.score).toBeNull();
    expect(projection.serviceRisk.band).toBe("NA");
    expect(projection.primaryQuotaConsumedPercent).toBeNull();
  });
});
