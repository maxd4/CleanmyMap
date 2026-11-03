import { describe, expect, it } from "vitest";
import { createActionSchema } from "./action";

const basePayload = {
  actorName: "Bénévole test",
  associationName: "Action spontanée",
  actionDate: "2026-04-22",
  locationLabel: "Canal Saint-Martin",
  wasteKg: 1.5,
  cigaretteButts: 0,
  volunteersCount: 2,
  durationMinutes: 45,
};

describe("createActionSchema characterization", () => {
  it("accepts a partial characterization without changing the collected total", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      wasteKg: 12,
      wasteBreakdown: { characterizationKg: { plastic: 2.5, glass: 0 } },
    });

    expect(parsed.wasteKg).toBe(12);
    expect(parsed.wasteBreakdown?.characterizationKg).toEqual({ plastic: 2.5, glass: 0 });
  });

  it("rejects unknown slugs and a characterized mass beyond the total", () => {
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        wasteBreakdown: { characterizationKg: { cigarette_butt: 1 } },
      }).success,
    ).toBe(false);

    const incoherent = createActionSchema.safeParse({
      ...basePayload,
      wasteKg: 10,
      wasteBreakdown: { characterizationKg: { plastic: 10.2 } },
    });
    expect(incoherent.success).toBe(false);
    if (!incoherent.success) {
      expect(incoherent.error.issues.some((issue) => issue.path.includes("characterizationKg"))).toBe(true);
    }
  });

  it("enforces non-negative bounds and the 0.1 kg resolution", () => {
    for (const value of [-0.1, 100000.1, 0.05]) {
      expect(
        createActionSchema.safeParse({
          ...basePayload,
          wasteBreakdown: { characterizationKg: { plastic: value } },
        }).success,
      ).toBe(false);
    }
  });
});
