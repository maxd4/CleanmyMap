import { describe, expect, it } from "vitest";
import { createActionSchema } from "./action";

const basePayload = {
  actorName: "Alice",
  associationName: "Action spontanée",
  organizerType: "spontaneous" as const,
  actionDate: "2026-10-09",
  locationLabel: "Quai nord",
  wasteKg: 0,
  cigaretteButts: 0,
  durationMinutes: 30,
};

describe("action participant total validation", () => {
  it("preserves the explicit participant total and complete composition", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      volunteersCount: 12,
      volunteerParticipation: {
        childrenCount: 1,
        adultCount: 11,
        retiredCount: 0,
      },
    });

    expect(parsed.volunteersCount).toBe(12);
    expect(parsed.volunteerParticipation).toMatchObject({
      childrenCount: 1,
      adultCount: 11,
      retiredCount: 0,
    });
  });
});
