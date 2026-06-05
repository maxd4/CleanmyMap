import { describe, expect, it } from "vitest";
import {
  buildServiceQuotaSummary,
  buildServiceThresholdAlerts,
  formatServiceQuotaStateLabel,
} from "./service-risk";
import type { EnvironmentalImpactSnapshotRecord } from "./types";

describe("buildServiceThresholdAlerts", () => {
  it("detects quota, growth and trend threshold breaches with actionable metadata", () => {
    const generatedAt = "2026-05-20T12:00:00.000Z";
    const currentServices = [
      {
        key: "supabase",
        label: "Supabase",
        monthlyKgCo2eProxy: 2.8,
        sharePercent: 78,
        confidencePercent: 90,
        metricEstimates: [],
      },
      {
        key: "vercel",
        label: "Vercel",
        monthlyKgCo2eProxy: 1.6,
        sharePercent: 35,
        confidencePercent: 88,
        metricEstimates: [],
      },
      {
        key: "resend",
        label: "Resend",
        monthlyKgCo2eProxy: 1.0,
        sharePercent: 20,
        confidencePercent: 92,
        metricEstimates: [],
      },
    ] as unknown as Parameters<typeof buildServiceThresholdAlerts>[0]["currentServices"];

    const snapshots = [
      {
        snapshotDate: "2026-04-20",
        generatedAt: "2026-04-20T12:00:00.000Z",
        model: {
          infrastructure: {
            services: [
              {
                key: "supabase",
                label: "Supabase",
                monthlyKgCo2eProxy: 2.4,
                sharePercent: 74,
                confidencePercent: 88,
                uncertaintyPercent: 12,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
              {
                key: "vercel",
                label: "Vercel",
                monthlyKgCo2eProxy: 1.1,
                sharePercent: 33,
                confidencePercent: 87,
                uncertaintyPercent: 13,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
              {
                key: "resend",
                label: "Resend",
                monthlyKgCo2eProxy: 0.9,
                sharePercent: 18,
                confidencePercent: 91,
                uncertaintyPercent: 9,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
            ],
          },
        },
      },
      {
        snapshotDate: "2026-03-20",
        generatedAt: "2026-03-20T12:00:00.000Z",
        model: {
          infrastructure: {
            services: [
              {
                key: "supabase",
                label: "Supabase",
                monthlyKgCo2eProxy: 2.0,
                sharePercent: 66,
                confidencePercent: 86,
                uncertaintyPercent: 14,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
              {
                key: "vercel",
                label: "Vercel",
                monthlyKgCo2eProxy: 1.1,
                sharePercent: 24,
                confidencePercent: 84,
                uncertaintyPercent: 16,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
              {
                key: "resend",
                label: "Resend",
                monthlyKgCo2eProxy: 0.8,
                sharePercent: 18,
                confidencePercent: 90,
                uncertaintyPercent: 10,
                status: "ready",
                annualKgCo2eProxy: 0,
                sourceNote: "",
                basis: "monthly",
                metricCount: 0,
                referenceMetricCount: 0,
                metricEstimates: [],
              },
            ],
          },
        },
      },
    ] as unknown as EnvironmentalImpactSnapshotRecord[];

    const alerts = buildServiceThresholdAlerts({
      currentGeneratedAt: generatedAt,
      currentServices,
      snapshots,
    });

    expect(alerts.map((alert) => alert.signal)).toEqual(["quotaShare", "growth", "trend"]);

    expect(alerts[0]).toMatchObject({
      serviceLabel: "Supabase",
      severity: "critical",
      signal: "quotaShare",
      thresholdLabel: "usage > 70 % du quota alloué à la catégorie",
      sinceLabel: "avril 2026",
    });

    expect(alerts[1]).toMatchObject({
      serviceLabel: "Vercel",
      severity: "critical",
      signal: "growth",
      thresholdLabel: "croissance > +15 % sur un mois",
      sinceLabel: "mai 2026",
    });

    expect(alerts[2]).toMatchObject({
      serviceLabel: "Resend",
      severity: "warning",
      signal: "trend",
      thresholdLabel: "croissance > +10 % sur deux mois d'affilée",
      sinceLabel: "avril 2026",
    });

    expect(alerts[0].details).toContain("78");
    expect(alerts[1].recommendedAction).toContain("croissance");
    expect(alerts[2].recommendedAction).toContain("deux mois");
  });
});

describe("buildServiceQuotaSummary", () => {
  it("selects the most constrained metric as the primary quota", () => {
    const summary = buildServiceQuotaSummary({
      key: "supabase",
      label: "Supabase",
      description: "",
      sourceNote: "",
      basis: "monthly",
      status: "ready",
      monthlyKgCo2eProxy: 2.8,
      annualKgCo2eProxy: 33.6,
      sharePercent: 78,
      confidencePercent: 90,
      uncertaintyPercent: 10,
      metricCount: 2,
      referenceMetricCount: 0,
      metricEstimates: [
        {
          key: "supabaseStorageGbMonths",
          label: "Stockage",
          unitLabel: "GB-mois",
          proxyKgCo2ePerUnit: 0.015,
          referenceMonthlyQuantity: 100,
          quantityPerMonth: 5,
          estimatedKgCo2eProxy: 0.08,
          source: "derived",
        },
        {
          key: "supabaseEgressGb",
          label: "Bande passante",
          unitLabel: "GB",
          proxyKgCo2ePerUnit: 0.02,
          referenceMonthlyQuantity: 100,
          quantityPerMonth: 92,
          estimatedKgCo2eProxy: 1.84,
          source: "input",
        },
      ],
    } as unknown as Parameters<typeof buildServiceQuotaSummary>[0]);

    expect(summary.state).toBe("proche limite");
    expect(formatServiceQuotaStateLabel(summary.state)).toBe("proche limite");
    expect(summary.primaryMetric?.label).toBe("Bande passante");
    expect(summary.primaryMetric?.consumedPercent).toBe(92);
    expect(summary.metrics[0]?.isPrimary).toBe(true);
    expect(summary.metrics[1]?.state).toBe("ok");
  });
});
