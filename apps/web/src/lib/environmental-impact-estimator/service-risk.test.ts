import { describe, expect, it } from "vitest";
import { buildServiceQuotaSummary, buildServiceThresholdAlerts, formatServiceQuotaStateLabel } from "./service-risk";
import { thresholdAlertCurrentServices, thresholdAlertSnapshots, quotaSummaryMetricEstimates } from "./service-risk.fixtures";

describe("buildServiceThresholdAlerts", () => {
  it("detects quota, growth and trend threshold breaches with actionable metadata", () => {
    const generatedAt = "2026-05-20T12:00:00.000Z";
    const currentServices = thresholdAlertCurrentServices;

    const snapshots = thresholdAlertSnapshots;

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
      sinceLabel: "mai 2026",
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
      metricEstimates: quotaSummaryMetricEstimates,
    } as unknown as Parameters<typeof buildServiceQuotaSummary>[0]);

    expect(summary.state).toBe("proche limite");
    expect(formatServiceQuotaStateLabel(summary.state)).toBe("proche limite");
    expect(summary.primaryMetric?.label).toBe("Bande passante");
    expect(summary.primaryMetric?.consumedPercent).toBe(92);
    expect(summary.metrics[0]?.isPrimary).toBe(true);
    expect(summary.metrics[1]?.state).toBe("ok");
  });
});
