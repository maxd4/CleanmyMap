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
    equipmentProvided: [],
    equipmentNotProvided: ["Paires de gants : aucune unité fournie"],
    refreshmentsProvided: ["Eau fournie pendant l'action"],
    accessibility: null,
    route: { topology: "loop", departureLabel: "Place centrale", arrivalLabel: null, hasSelectedOperationalRoute: false, targetDistanceKm: null, networkDistanceKm: null },
    volunteerChecklist: {
      toBring: [],
      weatherRecommendations: [],
      provided: [],
      weatherStatus: "unavailable",
      weatherState: "idle",
      weatherMessage: "",
      staffing: { source: "unknown", count: null, label: "Effectif exploitable non renseigné" },
      insufficiencies: [],
    },
  },
} as unknown as ActionDayBriefing;

describe("action day briefing projection", () => {
  it("contains practical public data and no private preparation notes", () => {
    const text = buildActionDayBriefingText(briefing);
    expect(text).toContain("Place centrale");
    expect(text).toContain("Gants obligatoires");
    expect(text).not.toContain("Paires de gants : 0");
    expect(text).not.toContain("Équipements déclarés");
    expect(text).toContain("Équipements non fournis : Paires de gants : aucune unité fournie");
    expect(text).toContain("Eau fournie pendant l'action");
    expect(text).not.toContain("notes");
    expect(text).not.toContain("actionId");
    expect(text).not.toContain("météo");
  });

  it("includes weather only after a successful explicit forecast request", () => {
    const withWeather = {
      ...briefing,
      action: {
        ...briefing.action,
        volunteerChecklist: {
          ...briefing.action.volunteerChecklist,
          weatherState: "success",
          weatherRecommendations: [{ key: "rain", label: "Prévoir une veste imperméable", detail: null, provenance: ["weather_forecast"] }],
        },
      },
    } as ActionDayBriefing;

    expect(buildActionDayBriefingText(withWeather)).toContain("Checklist — météo : Prévoir une veste imperméable");
  });
});
