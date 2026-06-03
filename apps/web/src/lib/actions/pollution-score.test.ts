import { describe, expect, it } from "vitest";
import {
  BUTTS_POLLUTION_REFERENCE_COUNT,
  WASTE_POLLUTION_REFERENCE_KG,
  computeButtsPollutionScore,
  computePollutionScore,
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
  computeWastePollutionScore,
} from "./pollution-score";

describe("pollution score", () => {
  it("normalizes waste and butts independently", () => {
    expect(computeWastePollutionScore(WASTE_POLLUTION_REFERENCE_KG)).toBe(100);
    expect(computeButtsPollutionScore(BUTTS_POLLUTION_REFERENCE_COUNT)).toBe(
      100,
    );
  });

  it("keeps the highest axis as the global score", () => {
    const scores = computePollutionScores({ wasteKg: 20, cigaretteButts: 0 });

    expect(scores.wasteScore).toBe(100);
    expect(scores.buttsScore).toBe(0);
    expect(scores.severityScore).toBe(100);
    expect(computePollutionScore({ wasteKg: 20, cigaretteButts: 0 })).toBe(100);
  });

  it("clamps negative and missing values to zero", () => {
    expect(computePollutionScores({ wasteKg: -5, cigaretteButts: null })).toEqual(
      {
        wasteScore: 0,
        buttsScore: 0,
        severityScore: 0,
      },
    );
  });

  it("normalizes relative to the per-volunteer max action", () => {
    const scores = computePollutionScoresRelativeToReferences(
      {
        wasteKg: 100,
        cigaretteButts: 100,
        volunteersCount: 10,
      },
      {
        wastePerVolunteer: 1000,
        buttsPerVolunteer: 100,
      },
    );

    expect(scores.wasteScore).toBe(1);
    expect(scores.buttsScore).toBe(10);
    expect(scores.severityScore).toBe(10);
  });
});
