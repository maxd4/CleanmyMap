import { describe, expect, it } from "vitest";
import {
  minCollectiveEvents,
  minDiversityTypes,
  minValidatedActions,
  xpRequired,
  xpStep,
} from "@/lib/gamification/progression";

describe("gamification progression formulas", () => {
  it("computes a soft exponential xp step", () => {
    expect(xpStep(1)).toBe(40);
    expect(xpStep(2)).toBe(47);
    expect(xpStep(3)).toBe(56);
    expect(xpStep(10)).toBeGreaterThan(xpStep(9));
  });

  it("computes cumulative required xp", () => {
    expect(xpRequired(1)).toBe(0);
    expect(xpRequired(2)).toBe(40);
    expect(xpRequired(3)).toBe(87);
    expect(xpRequired(4)).toBe(143);
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
});
