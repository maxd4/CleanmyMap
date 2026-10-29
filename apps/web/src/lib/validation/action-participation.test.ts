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
  it("accepts an explicit zero participant total without turning it into one", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      volunteersCount: 0,
      volunteerParticipation: null,
    });

    expect(parsed.volunteersCount).toBe(0);
  });
});
