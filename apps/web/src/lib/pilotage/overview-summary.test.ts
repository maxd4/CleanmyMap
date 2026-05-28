import { describe, expect, it } from "vitest";
import type { PilotageComparisonResult } from "./metrics";
import type { OperationalPriority } from "./prioritization";
import { buildSummary, pickDecisionRecommendation } from "./overview-summary";
import { ADMIN_ROUTE, DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

function buildComparisonFixture(
  overrides?: Partial<PilotageComparisonResult["metrics"]>,
): PilotageComparisonResult {
  return {
    formulaVersion: "v1",
    periodDays: 30,
    generatedAt: "2026-04-10T00:00:00.000Z",
    current: {
      approvedActions: 20,
      impactVolumeKg: 120,
      mobilizationCount: 35,
      iurIndex: 2.4,
      qualityScore: 72,
      coverageRate: 68,
      moderationDelayDays: 5,
      pendingCount: 8,
      anomaliesCount: 1,
      reliability: {
        level: "moyenne",
        score: 70,
        completeness: 70,
        geoloc: 72,
        freshness: 68,
        sampleSize: 20,
        reason: "Lecture exploitable avec prudence",
      },
    },
    previous: {
      approvedActions: 16,
      impactVolumeKg: 100,
      mobilizationCount: 30,
      iurIndex: 2.1,
      qualityScore: 78,
      coverageRate: 76,
      moderationDelayDays: 3,
      pendingCount: 6,
      anomaliesCount: 2,
      reliability: {
        level: "moyenne",
        score: 70,
        completeness: 70,
        geoloc: 72,
        freshness: 68,
        sampleSize: 16,
        reason: "Lecture exploitable avec prudence",
      },
    },
    metrics: {
      approvedActions: {
        current: 20,
        previous: 16,
        deltaAbsolute: 4,
        deltaPercent: 25,
        trend: "up",
        interpretation: "positive",
        strength: "moderate",
      },
      impactVolumeKg: {
        current: 120,
        previous: 100,
        deltaAbsolute: 20,
        deltaPercent: 20,
        trend: "up",
        interpretation: "positive",
        strength: "moderate",
      },
      mobilizationCount: {
        current: 35,
        previous: 30,
        deltaAbsolute: 5,
        deltaPercent: 16.7,
        trend: "up",
        interpretation: "positive",
        strength: "moderate",
      },
      iurIndex: {
        current: 2.4,
        previous: 2.1,
        deltaAbsolute: 0.3,
        deltaPercent: 14.3,
        trend: "up",
        interpretation: "positive",
        strength: "moderate",
      },
      qualityScore: {
        current: 72,
        previous: 78,
        deltaAbsolute: -6,
        deltaPercent: -7.7,
        trend: "down",
        interpretation: "negative",
        strength: "moderate",
      },
      coverageRate: {
        current: 68,
        previous: 76,
        deltaAbsolute: -8,
        deltaPercent: -10.5,
        trend: "down",
        interpretation: "negative",
        strength: "moderate",
      },
      moderationDelayDays: {
        current: 5,
        previous: 3,
        deltaAbsolute: 2,
        deltaPercent: 66.7,
        trend: "up",
        interpretation: "negative",
        strength: "strong",
      },
      anomaliesCount: {
        current: 1,
        previous: 2,
        deltaAbsolute: -1,
        deltaPercent: -50,
        trend: "down",
        interpretation: "positive",
        strength: "strong",
      },
      ...overrides,
    },
  };
}

describe("overview summary", () => {
  it("prefers moderation recommendation when moderation risk is highest", () => {
    const recommendation = pickDecisionRecommendation(buildComparisonFixture());
    expect(recommendation.href).toBe(ADMIN_ROUTE);
    expect(recommendation.label).toContain("moderation");
  });

  it("falls back to maintain recommendation when no negative risk is detected", () => {
    const neutral = buildComparisonFixture({
      moderationDelayDays: {
        current: 2,
        previous: 2,
        deltaAbsolute: 0,
        deltaPercent: 0,
        trend: "flat",
        interpretation: "neutral",
        strength: "stable",
      },
      qualityScore: {
        current: 80,
        previous: 78,
        deltaAbsolute: 2,
        deltaPercent: 2.6,
        trend: "up",
        interpretation: "positive",
        strength: "stable",
      },
      coverageRate: {
        current: 78,
        previous: 76,
        deltaAbsolute: 2,
        deltaPercent: 2.6,
        trend: "up",
        interpretation: "positive",
        strength: "stable",
      },
    });
    const recommendation = pickDecisionRecommendation(neutral);
    expect(recommendation.href).toBe(DASHBOARD_ROUTE);
  });

  it("buildSummary maps KPI cards and default alert when priorities are absent", () => {
    const comparison = buildComparisonFixture();
    const summary = buildSummary(comparison, [] as OperationalPriority[]);

    expect(summary.kpis).toHaveLength(3);
    expect(summary.kpis[0].label).toBe("Impact terrain");
    expect(summary.kpis[0].deltaAbsolute).toContain("kg");
    expect(summary.alert.severity).toBe("low");
    expect(summary.recommendedAction.href).toBe(ADMIN_ROUTE);
  });
});
