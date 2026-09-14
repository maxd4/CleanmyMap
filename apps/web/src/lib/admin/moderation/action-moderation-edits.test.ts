import { describe, expect, it } from "vitest";
import { actionEditsSchema } from "./action-moderation-edits";

describe("action moderation edit contract", () => {
  it("uses the canonical cigarette count bound", () => {
    expect(
      actionEditsSchema.safeParse({ cigaretteButts: 5_000_000 }).success,
    ).toBe(true);
    expect(
      actionEditsSchema.safeParse({ cigaretteButts: 5_000_001 }).success,
    ).toBe(false);
    expect(
      actionEditsSchema.safeParse({
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 5_000_000,
          cigaretteButtsMassKg: null,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: null,
          cigaretteButtsCountProvenance: "counted",
          cigaretteButtsMassProvenance: "unknown",
          cigaretteButtsVolumeProvenance: "unknown",
          cigaretteButtsConversionFormulaVersion: null,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects off-grid ordinary masses without rounding", () => {
    expect(actionEditsSchema.safeParse({ wasteKg: 10.1 }).success).toBe(true);
    expect(actionEditsSchema.safeParse({ wasteKg: 10.05 }).success).toBe(false);
    expect(
      actionEditsSchema.safeParse({
        wasteBreakdown: {
          recyclablesKg: 10.05,
          glassKg: 0,
          householdWasteKg: 0,
          otherWasteKg: 0,
        },
      }).success,
    ).toBe(false);
  });

  it("does not expose volunteer derived fields as moderation input", () => {
    const parsed = actionEditsSchema.parse({
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 2,
        retiredCount: 3,
        participantsCount: 6,
      },
    });

    expect(parsed).not.toHaveProperty("volunteerParticipation");
  });
});
