import { describe, expect, it } from "vitest";
import { buildActionDayBriefingText } from "./action-day-briefing";
import type { ActionDayBriefing } from "@/lib/actions/day-briefing-http";

const briefing = {
  actionId: "action-1",
  access: "confirmed_volunteer",
  action: {
    title: "Cleanwalk",
    actionDate: "2026-10-18",
    meetingTime: "10:00",
    eventStartTime: "10:00",
    eventEndTime: null,
    meetingPoint: "Place centrale",
    locationLabel: "Berges",
    organizerLabel: "Collectif local",
    participantMessage: "Prendre de l'eau",
    safetyInstructions: "Gants obligatoires",
    recommendedMaterials: "Gants",
    materialsProvided: null,
    accessibility: null,
    route: { topology: "loop", departureLabel: "Place centrale", arrivalLabel: null, hasSelectedOperationalRoute: false, targetDistanceKm: null, networkDistanceKm: null },
  },
} as unknown as ActionDayBriefing;

describe("action day briefing projection", () => {
  it("contains practical public data and no private preparation notes", () => {
    const text = buildActionDayBriefingText(briefing);
    expect(text).toContain("Place centrale");
    expect(text).toContain("Gants obligatoires");
    expect(text).not.toContain("notes");
    expect(text).not.toContain("actionId");
  });
});
