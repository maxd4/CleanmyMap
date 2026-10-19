import { describe, expect, it } from "vitest";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import { buildPublicActionPracticalInformation } from "./group-participation-public-projection";

const persistedWeatherContext = {
  version: "planner-weather-snapshot-v1",
  provider: "open-meteo",
  source: "forecast",
  fetchedAt: "2026-10-19T08:00:00.000Z",
  coveredWindow: { startAt: "2026-10-20T09:00", endAt: "2026-10-20T11:00" },
  status: "available",
  weatherStatus: "available",
  location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
  hourly: [],
  summary: { temperatureC: 12, apparentTemperatureC: 11, precipitationMm: 0, precipitationProbabilityPct: 0, windKmh: 8, gustKmh: 12, weatherCode: 1 },
  operationalRisk: {
    status: "nominal",
    riskLevel: "low",
    reasons: ["planner-internal-reason"],
    ruleVersion: "weather-operational-v1",
    ruleSource: "CleanMyMap weather operations policy",
    operationalLimitMinutes: null,
  },
  } as unknown as PlannerWeatherContext;

const publicWeatherRequest = {
  latitude: 48.85,
  longitude: 2.35,
  scheduledStartAt: "2026-10-20T09:00",
  scheduledEndAt: "2026-10-20T11:00",
};

describe("public action practical information", () => {
  it("keeps organizer text separate from canonical waste recommendations", () => {
    const result = buildPublicActionPracticalInformation({
      accessibility: "Accès par la rampe nord.",
      accessibilityStatus: "conditions_reported",
      safetyInstructions: "Rester en binôme.",
      recommendedMaterials: "Gants et sacs.",
      materialsProvided: "Pinces disponibles.",
      suggestedMaterials: ["gloves", "grabbers"],
      participantMessage: "Rendez-vous devant la grille.",
      expectedWasteCategories: ["battery"],
      equipmentInventory: {
        glovesPairs: 0,
        garbageBags: 12,
        luggageScaleAvailable: true,
        firstAidKitAvailable: false,
      },
      refreshmentsProvided: {
        waterDuringAction: true,
        drinksAfterAction: false,
        snackAfterAction: true,
      },
      logisticsNotes: "Note privée de l’organisateur.",
      checklistBeforeDeparture: "Checklist interne.",
    });

    expect(result.accessibility).toBe("Accès par la rampe nord.");
    expect(result.safetyInstructions).toBe("Rester en binôme.");
    expect(result.materialsToBring).toBe("Gants et sacs.");
    expect(result.materialsProvided).toBe("Pinces disponibles.");
    expect(result.suggestedMaterials).toEqual(["Gants", "Pinces"]);
    expect(result.equipmentProvided).toEqual(["Sacs poubelles : 12", "Pèse-bagage"]);
    expect(result.equipmentNotProvided).toEqual(["Paires de gants : aucune unité fournie"]);
    expect(result.refreshmentsProvided).toEqual(["Eau fournie pendant l'action", "Collation prévue après l'action"]);
    expect(result.accessibilityStatus).toBe("conditions_reported");
    expect(result.participantMessage).toBe("Rendez-vous devant la grille.");
    expect(result.derivedSafetyRecommendations.length).toBeGreaterThan(0);
    expect(result.derivedMaterials.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("logisticsNotes");
    expect(result).not.toHaveProperty("equipmentInventory");
    expect(result).not.toHaveProperty("checklistBeforeDeparture");
  });

  it("returns explicit empty values for legacy actions without structured preparation", () => {
    expect(buildPublicActionPracticalInformation(undefined)).toEqual({
      accessibility: null,
      accessibilityStatus: null,
      safetyInstructions: null,
      derivedSafetyRecommendations: [],
      materialsToBring: null,
      derivedMaterials: [],
      materialsProvided: null,
      suggestedMaterials: [],
      equipmentProvided: [],
      equipmentNotProvided: [],
      refreshmentsProvided: [],
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
      participantMessage: null,
    });
  });

  it.each([
    {
      routeVersioning: { active: { calculation: { weatherContext: persistedWeatherContext } } },
    },
    {
      routeCalibrationContext: { plannerSnapshot: { weatherContext: persistedWeatherContext } },
    },
  ])("projects persisted planner weather without exposing internal context", (preparation) => {
    const result = buildPublicActionPracticalInformation(preparation as never, {
      weatherContext: persistedWeatherContext,
      weatherRequest: publicWeatherRequest,
      weatherState: "idle",
    });
    const serialized = JSON.stringify(result);

    expect(result.volunteerChecklist?.weatherState).toBe("idle");
    expect(result.volunteerChecklist?.weatherRequest).toEqual(publicWeatherRequest);
    expect(result.volunteerChecklist).not.toHaveProperty("weatherContext");
    expect(serialized).not.toContain("planner-internal-reason");
    expect(serialized).not.toContain("routeVersioning");
    expect(serialized).not.toContain("routeCalibrationContext");
    expect(serialized).not.toContain("plannerSnapshot");
    expect(serialized).not.toContain("weatherContext");
  });
});
