import { describe, expect, it } from "vitest";
import type { PilotageComparisonResult } from "./metrics";
import { buildOperationalPriorities } from "./prioritization";

function buildComparisonFixture(): PilotageComparisonResult {
  return {
    formulaVersion: "test",
    periodDays: 30,
    generatedAt: "2026-04-10T00:00:00.000Z",
    current: {
      approvedActions: 42,
      impactVolumeKg: 180,
      mobilizationCount: 120,
      qualityScore: 61,
      coverageRate: 58,
      moderationDelayDays: 9,
      pendingCount: 76,
      reliability: {
        level: "moyenne",
        score: 63,
        completeness: 72,
        geoloc: 59,
        freshness: 61,
        sampleSize: 42,
        reason: "fixture",
      },
    },
    previous: {
      approvedActions: 36,
      impactVolumeKg: 140,
      mobilizationCount: 96,
      qualityScore: 69,
      coverageRate: 70,
      moderationDelayDays: 5,
      pendingCount: 40,
      reliability: {
        level: "elevee",
        score: 81,
        completeness: 82,
        geoloc: 80,
        freshness: 79,
        sampleSize: 36,
        reason: "fixture",
      },
    },
    metrics: {
      approvedActions: {
        current: 42,
        previous: 36,
        deltaAbsolute: 6,
        deltaPercent: 16.7,
        trend: "up",
        interpretation: "positive",
        strength: "strong",
      },
      impactVolumeKg: {
        current: 180,
        previous: 140,
        deltaAbsolute: 40,
        deltaPercent: 28.6,
        trend: "up",
        interpretation: "positive",
        strength: "strong",
      },
      mobilizationCount: {
        current: 120,
        previous: 96,
        deltaAbsolute: 24,
        deltaPercent: 25,
        trend: "up",
        interpretation: "positive",
        strength: "strong",
      },
      qualityScore: {
        current: 61,
        previous: 69,
        deltaAbsolute: -8,
        deltaPercent: -11.6,
        trend: "down",
        interpretation: "negative",
        strength: "moderate",
      },
      coverageRate: {
        current: 58,
        previous: 70,
        deltaAbsolute: -12,
        deltaPercent: -17.1,
        trend: "down",
        interpretation: "negative",
        strength: "strong",
      },
      moderationDelayDays: {
        current: 9,
        previous: 5,
        deltaAbsolute: 4,
        deltaPercent: 80,
        trend: "up",
        interpretation: "negative",
        strength: "strong",
      },
    },
  };
}

describe("buildOperationalPriorities", () => {
  it("returns ordered priorities with engine version", () => {
    const result = buildOperationalPriorities({
      comparison: buildComparisonFixture(),
      zones: [
        {
          area: "10e",
          currentActions: 12,
          previousActions: 8,
          deltaActionsAbsolute: 4,
          currentKg: 60,
          previousKg: 30,
          deltaKgAbsolute: 30,
          deltaActionsPercent: 50,
          deltaKgPercent: 100,
          currentCoverageRate: 72,
          previousCoverageRate: 65,
          deltaCoverageRateAbsolute: 7,
          deltaCoverageRatePercent: 10.8,
          currentModerationDelayDays: 6,
          previousModerationDelayDays: 4,
          deltaModerationDelayDaysAbsolute: 2,
          deltaModerationDelayDaysPercent: 50,
          normalizedScore: 82,
          urgency: "critique",
          justification: "test",
          recommendedAction: "test action",
        },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
    expect(result[0].engineVersion).toBeTruthy();
    expect(result[0].impactEstimate.length).toBeGreaterThan(0);
    expect(result[0].suggestedOwner.length).toBeGreaterThan(0);
  });
});
