import { describe, expect, it } from "vitest";
import { hasActionImpactUpdate } from "./action-update-impact";

describe("hasActionImpactUpdate", () => {
  it("recognizes every persisted impact input", () => {
    for (const field of [
      "wasteKg",
      "cigaretteButtsMeasurements",
      "cigaretteButtsMassKg",
      "cigaretteButtsVolumeLiters",
      "cigaretteButtsCondition",
      "cigaretteButtsKg",
      "cigaretteButts",
      "cigaretteButtsCount",
      "wasteBreakdown",
      "wasteMeasurementMethod",
      "volunteerParticipation",
      "volunteersCount",
      "durationMinutes",
    ] as const) {
      expect(hasActionImpactUpdate({ [field]: null } as never)).toBe(true);
    }
  });

  it("does not classify unrelated action fields as impact updates", () => {
    expect(hasActionImpactUpdate({ locationLabel: "Nouveau lieu" } as never)).toBe(false);
    expect(hasActionImpactUpdate({ reason: "Motif" } as never)).toBe(false);
  });
});
