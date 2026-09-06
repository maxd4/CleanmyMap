import { describe, expect, it } from "vitest";
import { createActionSchema } from "./action";

describe("createActionSchema", () => {
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

  it("accepts each canonical organizer type and rejects an unknown value", () => {
    for (const organizerType of [
      "spontaneous",
      "company",
      "association",
      "student_association",
      "collective",
      "other",
    ]) {
      expect(
        createActionSchema.safeParse({ ...basePayload, organizerType }).success,
      ).toBe(true);
    }

    expect(
      createActionSchema.safeParse({ ...basePayload, organizerType: "association_name" }).success,
    ).toBe(false);
  });

  it("keeps the cigarette butt condition sent by the volunteer form", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      organizerType: "spontaneous",
      wasteBreakdown: {
        megotsKg: 0.4,
        megotsCondition: "humide",
      },
    });

    expect(parsed.wasteBreakdown?.megotsCondition).toBe("humide");
  });

  it("accepts manual participant accounts on the action payload", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      organizerType: "spontaneous",
      participantAccounts: ["user-1", "user-2", "user-1"],
    });

    expect(parsed.participantAccounts).toEqual(["user-1", "user-2", "user-1"]);
  });
});
