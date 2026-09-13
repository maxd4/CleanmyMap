import { describe, expect, it } from "vitest";
import {
  minCollectiveEvents,
  minDiversityTypes,
  minValidatedActions,
  xpRequired,
  xpStep,
  syncUserActionProgression,
} from "@/lib/gamification/progression";
import { deriveBadges } from "./progression-formulas";

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

  it("exports syncUserActionProgression from the public barrel", () => {
    expect(typeof syncUserActionProgression).toBe("function");
  });

  it("does not award a mass badge from a partially measured population", () => {
    expect(
      deriveBadges({
        currentLevel: 1,
        qualityAverage: 90,
        validationRatio: 1,
        collectiveEvents: 0,
        totalKg: 100,
        totalButts: 0,
        wasteCoverageRate: 50,
      }),
    ).not.toContain("Force de la Nature (Argent)");
  });
});
