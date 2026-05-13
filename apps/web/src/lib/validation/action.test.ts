import { describe, expect, it } from "vitest";
import { createActionSchema } from "./action";

describe("createActionSchema", () => {
  it("keeps the cigarette butt condition sent by the volunteer form", () => {
    const parsed = createActionSchema.parse({
      actorName: "Bénévole test",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Canal Saint-Martin",
      wasteKg: 1.5,
      cigaretteButts: 0,
      volunteersCount: 2,
      durationMinutes: 45,
      wasteBreakdown: {
        megotsKg: 0.4,
        megotsCondition: "humide",
      },
    });

    expect(parsed.wasteBreakdown?.megotsCondition).toBe("humide");
  });
});
