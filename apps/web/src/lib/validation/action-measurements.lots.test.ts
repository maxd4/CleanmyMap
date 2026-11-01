import { describe, expect, it } from "vitest";
import { createActionSchema } from "./action";

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
          { id: "volume", source: "volume_l", value: 8_000, condition: "propre" },
        ],
      },
    });

    expect(result.success).toBe(false);
  });
});
