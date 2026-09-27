import { describe, expect, it } from "vitest";
import {
  assessLevelRequirements,
  computeCurrentLevel,
  computePotentialLevel,
  minCollectiveEvents,
  minDiversityTypes,
  minValidatedActions,
  PROGRESSION_RULES_V1,
  xpRequired,
  xpStep,
  syncUserActionProgression,
} from "@/lib/gamification/progression";
import { deriveBadges } from "./progression-formulas";
import type { UserProgressionStats } from "./progression-types";

function makeStats(overrides: Partial<UserProgressionStats> = {}): UserProgressionStats {
  return {
    totalActions: 7,
    approvedActions: 7,
    validatedActions: 7,
    qualityAverage: 80,
    validationRatio: 1,
    diversityTypes: 2,
    collectiveEvents: 1,
    totalKg: 0,
    wasteKnownActions: 0,
    wasteCoverageRate: 0,
    totalButts: 0,
    ...overrides,
  };
}

describe("gamification progression formulas", () => {
  it("computes a linear xp step", () => {
    expect(xpStep(1)).toBe(1);
    expect(xpStep(2)).toBe(2);
    expect(xpStep(3)).toBe(3);
    expect(xpStep(10)).toBe(10);
  });

  it("computes triangular required xp", () => {
    expect(xpRequired(1)).toBe(0);
    expect(xpRequired(2)).toBe(1);
    expect(xpRequired(3)).toBe(3);
    expect(xpRequired(4)).toBe(6);
    expect(xpRequired(5)).toBe(10);
  });

  it("keeps requirements increasing with level", () => {
    expect(minValidatedActions(1)).toBe(1);
    expect(minValidatedActions(6)).toBeGreaterThan(minValidatedActions(3));

    expect(minDiversityTypes(1)).toBe(1);
    expect(minDiversityTypes(4)).toBe(2);
    expect(minDiversityTypes(30)).toBe(5);

    expect(minCollectiveEvents(1)).toBe(0);
    expect(minCollectiveEvents(4)).toBe(1);
    expect(minCollectiveEvents(8)).toBe(2);
  });

  it.each([
    [1, 1, 1, 0, null, null],
    [4, 6, 2, 1, null, null],
    [5, 7, 2, 1, 70, 0.6],
    [8, 12, 3, 2, 70, 0.6],
    [30, 45, 5, 7, 70, 0.6],
  ])(
    "uses the v1 contribution rules for level %i",
    (level, validatedActions, diversityTypes, collectiveEvents, qualityAverage, validationRatio) => {
      const assessment = assessLevelRequirements(level, makeStats(), xpRequired(level));

      expect(PROGRESSION_RULES_V1.version).toBe("progression-rules-v1");
      expect(assessment.rulesVersion).toBe(PROGRESSION_RULES_V1.version);
      expect(assessment.thresholds).toEqual({
        minValidatedActions: validatedActions,
        minDiversityTypes: diversityTypes,
        minCollectiveEvents: collectiveEvents,
        minQualityAverage: qualityAverage,
        minValidationRatio: validationRatio,
      });
    },
  );

  it.each([
    [0, 1],
    [1, 2],
    [2, 2],
    [3, 3],
    [5, 3],
    [6, 4],
    [10, 5],
    [11, 5],
  ])("keeps triangular XP boundaries stable at %i XP", (xp, expectedLevel) => {
    expect(computePotentialLevel(xp)).toBe(expectedLevel);
  });

  it.each([
    ["minValidatedActions", { validatedActions: 6 }],
    ["minDiversityTypes", { diversityTypes: 1 }],
    ["minCollectiveEvents", { collectiveEvents: 0 }],
    ["minQualityAverage", { qualityAverage: 69 }],
    ["minValidationRatio", { validationRatio: 0.59 }],
  ])("reports each missing level-5 guardrail: %s", (id, override) => {
    const assessment = assessLevelRequirements(5, makeStats(override), xpRequired(5));

    expect(assessment.missing).toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
    expect(assessment.satisfied).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
  });

  it("explains when XP is sufficient but contribution guards keep the user below the level", () => {
    const stats = makeStats({ validatedActions: 6 });
    const assessment = assessLevelRequirements(5, stats, xpRequired(5));

    expect(assessment.xp).toEqual({ current: 10, required: 10, met: true });
    expect(assessment.potentialLevel).toBe(5);
    expect(assessment.currentLevel).toBe(4);
    expect(computeCurrentLevel(10, stats)).toBe(4);
    expect(assessment.eligible).toBe(false);
    expect(assessment.missing).toEqual([
      expect.objectContaining({
        id: "minValidatedActions",
        current: 6,
        required: 7,
      }),
    ]);
  });

  it("exports syncUserActionProgression from the public barrel", () => {
    expect(typeof syncUserActionProgression).toBe("function");
  });

  it("keeps impact quantities out of the XP badge families", () => {
    const badges = deriveBadges({
      currentLevel: 1,
      qualityAverage: 90,
      validationRatio: 1,
      collectiveEvents: 0,
      totalKg: 500,
      totalButts: 10_000,
      wasteCoverageRate: 100,
    });

    expect(badges).not.toEqual(
      expect.arrayContaining([
        "Force de la Nature (Argent)",
        "Héros du Nettoyage (Or)",
        "Expert Mégots (Or)",
      ]),
    );
    expect(badges).toContain("Sentinelle Exemplaire");
  });
});
