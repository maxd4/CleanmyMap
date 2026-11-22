import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "./action";
import { individualCigaretteButtsLotsSchema } from "./action-measurements";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";

const basePayload = {
  actorName: "Bénévole test",
  associationName: "Action spontanée",
  actionDate: "2026-04-22",
  locationLabel: "Canal Saint-Martin",
  wasteKg: 1.5,
  cigaretteButts: null,
  volunteersCount: 2,
  durationMinutes: 45,
};

describe("createActionSchema cigarette-butt lots", () => {
  it.each([
    { cigaretteButtsCount: 12, cigaretteButtsInputSource: "count" },
    { cigaretteButtsMassKg: 0.2, cigaretteButtsInputSource: "mass_kg" },
    { cigaretteButtsVolumeLiters: 1, cigaretteButtsInputSource: "volume_l" },
  ])("requires an explicit condition for a new scalar conversion (%o)", (source) => {
    const withoutCondition = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: source,
    });
    const withCondition = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: {
        ...source,
        cigaretteButtsCondition: "humide",
      },
    });

    expect(withoutCondition.success).toBe(false);
    expect(withCondition.success).toBe(true);
  });

  it("keeps an incomplete historical scalar pair readable without inferring a source", () => {
    const result = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 12,
        cigaretteButtsMassKg: 0.2,
        cigaretteButtsInputSource: "unknown",
      },
    });

    expect(result.success).toBe(true);
  });

  it("requires state when a PATCH declares a single convertible source", () => {
    expect(updateActionSchema.safeParse({ cigaretteButts: 12 }).success).toBe(false);
    expect(updateActionSchema.safeParse({
      cigaretteButts: 12,
      cigaretteButtsCondition: "mouille",
    }).success).toBe(true);
  });

  it("accepts distinct count, mass and volume lots", () => {
    const result = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: {
        cigaretteButtsLots: [
          { id: "counted", source: "count", value: 120, condition: "propre" },
          { id: "weighed", source: "mass_kg", value: 0.8, condition: "humide" },
          { id: "volume", source: "volume_l", value: 1.5, condition: "mouille" },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate ids, negative values and fractional count sources", () => {
    const validLot = { id: "lot", source: "count", value: 120, condition: "propre" } as const;
    expect(createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: { cigaretteButtsLots: [validLot, { ...validLot, source: "mass_kg", value: 1 }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: { cigaretteButtsLots: [{ ...validLot, value: -1 }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: { cigaretteButtsLots: [{ ...validLot, value: 1.5 }] },
    }).success).toBe(false);
  });

  it("rejects individually valid lots whose rounded total exceeds the canonical limit", () => {
    const result = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: {
        cigaretteButtsLots: [
          { id: "first", source: "count", value: 5_000_000, condition: "propre" },
          { id: "second", source: "count", value: 5_000_000, condition: "propre" },
        ],
      },
    });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toContain(
      "Le total calculé des mégots doit rester inférieur ou égal à 5 000 000.",
    );
  });

  it("rejects a volume lot whose derived count exceeds the canonical limit", () => {
    const result = createActionSchema.safeParse({
      ...basePayload,
      cigaretteButtsMeasurements: {
        cigaretteButtsLots: [
          { id: "volume", source: "volume_l", value: 8_500, condition: "propre" },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it("uses the canonical public bound for individual attributions", () => {
    const exact = individualCigaretteButtsLotsSchema.safeParse([
      { id: "count-a", source: "count", value: MAX_CIGARETTE_BUTTS_COUNT, condition: "propre" },
    ]);
    const above = individualCigaretteButtsLotsSchema.safeParse([
      { id: "count-a", source: "count", value: MAX_CIGARETTE_BUTTS_COUNT + 1, condition: "propre" },
    ]);

    expect(exact.success).toBe(true);
    expect(above.success).toBe(false);
  });
});
