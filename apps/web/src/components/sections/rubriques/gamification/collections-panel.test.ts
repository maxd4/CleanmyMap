import { describe, expect, it } from "vitest";
import type { MeResponse } from "./gamification-types";
import { buildCollectionSummary } from "./collections-panel";

function makeProgression(): MeResponse["progression"] {
  return {
    userId: "user-1",
    xpTotal: 120,
    xpValidated: 100,
    xpPending: 20,
    currentLevel: 4,
    potentialLevel: 5,
    badges: ["Première trace utile", "Trace fondatrice", "Contributeur utile"],
    nextLevel: {
      level: 5,
      xpRequired: 40,
      xpRemaining: 18,
      frozen: false,
      requirements: { missing: [] },
    },
    impact: {
      waterSavedLiters: 12,
      co2AvoidedKg: 4.2,
      surfaceCleanedM2: 28.5,
    },
    impactMethodology: {
      proxyVersion: "proxy",
      qualityRulesVersion: "quality",
      scope: "scope",
      pollutionScoreAverage: 82,
      formulas: [],
      approximations: [],
      hypotheses: [],
      errorMargins: {
        waterSavedLitersPct: 35,
        co2AvoidedKgPct: 30,
        surfaceCleanedM2Pct: 40,
        pollutionScoreMeanPoints: 10,
      },
    },
    dynamicRanking: {
      rank: 3,
      total: 10,
      percentile: 30,
      score: 84,
    },
    history: {
      timeline: [
        {
          id: "a1",
          actionDate: "2026-05-12",
          locationLabel: "Paris 12e",
          status: "approved",
          wasteKg: 4,
          cigaretteButts: 300,
          volunteersCount: 5,
          durationMinutes: 60,
          qualityScore: 82,
          qualityGrade: "A",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
        {
          id: "a2",
          actionDate: "2026-05-01",
          locationLabel: "Paris 12e",
          status: "pending",
          wasteKg: 2,
          cigaretteButts: 100,
          volunteersCount: 3,
          durationMinutes: 40,
          qualityScore: 70,
          qualityGrade: "B",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
        {
          id: "a3",
          actionDate: "2026-04-18",
          locationLabel: "Lyon 7e",
          status: "approved",
          wasteKg: 3,
          cigaretteButts: 150,
          volunteersCount: 4,
          durationMinutes: 45,
          qualityScore: 76,
          qualityGrade: "A",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
      ],
      mapPoints: [
        {
          id: "p1",
          actionDate: "2026-05-12",
          locationLabel: "Paris 12e",
          status: "approved",
          wasteKg: 4,
          cigaretteButts: 300,
          volunteersCount: 5,
          durationMinutes: 60,
          qualityScore: 82,
          qualityGrade: "A",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
        {
          id: "p2",
          actionDate: "2026-04-18",
          locationLabel: "Lyon 7e",
          status: "approved",
          wasteKg: 3,
          cigaretteButts: 150,
          volunteersCount: 4,
          durationMinutes: 45,
          qualityScore: 76,
          qualityGrade: "A",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
        {
          id: "p3",
          actionDate: "2026-03-05",
          locationLabel: "Paris 12e",
          status: "approved",
          wasteKg: 2,
          cigaretteButts: 90,
          volunteersCount: 3,
          durationMinutes: 35,
          qualityScore: 74,
          qualityGrade: "B",
          latitude: null,
          longitude: null,
          manualDrawing: null,
        },
      ],
    },
    monthlyMilestone: null,
    recognition: {
      currentContributor: null,
    },
    annualRecognition: {
      currentContributor: null,
    },
    yearToDateImpact: {
      wasteKg: 0,
      validatedActions: 0,
    },
  };
}

describe("buildCollectionSummary", () => {
  it("counts badges, places and approved traces", () => {
    const summary = buildCollectionSummary(makeProgression());

    expect(summary.badgeCount).toBe(3);
    expect(summary.zoneCount).toBe(2);
    expect(summary.approvedActionCount).toBe(2);
    expect(summary.latestActionDate).toBe("2026-05-12");
    expect(summary.sampleBadges).toEqual([
      "Première trace utile",
      "Trace fondatrice",
      "Contributeur utile",
    ]);
    expect(summary.sampleZones).toEqual(["Paris 12e", "Lyon 7e"]);
  });

  it("returns zero values when progression is missing", () => {
    const summary = buildCollectionSummary(undefined);

    expect(summary.badgeCount).toBe(0);
    expect(summary.zoneCount).toBe(0);
    expect(summary.approvedActionCount).toBe(0);
    expect(summary.latestActionDate).toBeNull();
  });
});
