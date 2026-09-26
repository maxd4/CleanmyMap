import { describe, expect, it } from "vitest";
import {
  buildMohsThresholdAwards,
  getMohsGradeInfo,
  getMohsThresholds,
  MOHS_MAX_XP,
} from "./mohs-progression";
import { CURRENT_INFINITE_PROGRESSION_IDS } from "./progression-types";

describe("Mohs impact progression", () => {
  it("keeps Talc at zero XP", () => {
    expect(getMohsGradeInfo(0, "waste").current.name).toBe("Talc");
    expect(getMohsThresholds("waste", 0)).toEqual([]);
    expect(buildMohsThresholdAwards([{ occurredOn: "2026-09-26", wasteValue: 0, buttsValue: 0 }])).toEqual([]);
  });

  it("awards one quarter XP exactly once when a threshold is crossed", () => {
    const awards = buildMohsThresholdAwards([
      { occurredOn: "2026-09-26", wasteValue: 20, buttsValue: 0 },
      { occurredOn: "2026-09-27", wasteValue: 0, buttsValue: 0 },
    ]);

    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({
      family: "waste",
      grade: 2,
      threshold: 20,
      xp: 0.25,
      sourceId: "mohs:waste:grade:2",
      occurredOn: "2026-09-26",
    });
  });

  it("records every crossed grade once for a multi-threshold jump", () => {
    const awards = buildMohsThresholdAwards([
      { occurredOn: "2026-09-26", wasteValue: 180, buttsValue: 18_000 },
    ]);

    expect(awards).toHaveLength(18);
    expect(awards.filter((award) => award.family === "waste")).toHaveLength(9);
    expect(awards.filter((award) => award.family === "butts")).toHaveLength(9);
    expect(awards.reduce((total, award) => total + award.xp, 0)).toBe(MOHS_MAX_XP * 2);
  });

  it("does not add Mohs to the seven CURRENT behavioural progressions", () => {
    expect(CURRENT_INFINITE_PROGRESSION_IDS).toHaveLength(7);
    expect(CURRENT_INFINITE_PROGRESSION_IDS).not.toContain("mohs_waste" as never);
    expect(CURRENT_INFINITE_PROGRESSION_IDS).not.toContain("mohs_butts" as never);
  });
});
