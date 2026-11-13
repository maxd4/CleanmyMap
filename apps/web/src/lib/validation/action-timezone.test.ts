import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "./action";

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

describe("action timezone validation", () => {
  it("accepts an IANA timezone and rejects an unknown identifier", () => {
    expect(createActionSchema.safeParse({
      ...basePayload,
      actionTimezone: "America/Montreal",
      eventStartTime: "10:00",
      eventEndTime: "11:00",
    }).success).toBe(true);
    expect(createActionSchema.safeParse({ ...basePayload, actionTimezone: "not/a-timezone" }).success).toBe(false);
  });

  it.each([
    ["spring gap", "2026-03-08", "02:30"],
    ["fall fold", "2026-11-01", "01:30"],
  ])("rejects a %s in America/Montreal", (_label, actionDate, eventStartTime) => {
    expect(createActionSchema.safeParse({
      ...basePayload,
      actionDate,
      actionTimezone: "America/Montreal",
      eventStartTime,
    }).success).toBe(false);
  });

  it("keeps timezone optional for legacy clients and accepts it on updates", () => {
    expect(createActionSchema.parse({ ...basePayload }).actionTimezone).toBeUndefined();
    expect(updateActionSchema.safeParse({ actionTimezone: "Pacific/Tahiti" }).success).toBe(true);
  });
});
