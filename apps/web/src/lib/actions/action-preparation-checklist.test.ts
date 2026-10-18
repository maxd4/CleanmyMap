import { describe, expect, it } from "vitest";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import { deriveActionVolunteerChecklist } from "./action-preparation-checklist";

function weather(points: Array<{ temperatureC: number; precipitationMm: number; windKmh: number }>): PlannerWeatherContext {
  return {
    version: "planner-weather-snapshot-v1",
    provider: "open-meteo",
    source: "forecast",
    fetchedAt: "2026-10-18T08:00:00.000Z",
    coveredWindow: { startAt: "2026-10-20T09:00", endAt: "2026-10-20T11:00" },
    status: "available",
    weatherStatus: "available",
    location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
    hourly: points.map((point, index) => ({
      time: `2026-10-20T${String(9 + index).padStart(2, "0")}:00`,
      apparentTemperatureC: point.temperatureC,
      precipitationProbabilityPct: null,
      gustKmh: null,
      weatherCode: null,
      ...point,
    })),
    summary: null,
  };
}

describe("action volunteer preparation checklist", () => {
  it("crosses Waste recommendations with a complete declared inventory without inventing stock ratios", () => {
    const result = deriveActionVolunteerChecklist({
      preparation: {
        suggestedMaterials: ["gloves", "bags", "grabbers", "visibility_vest"],
        expectedWasteCategories: ["plastic", "cigarette_butt"],
        equipmentInventory: {
          glovesPairs: 4,
          garbageBags: 20,
          grabbers: 4,
          highVisibilityVests: 2,
          luggageScaleAvailable: true,
        },
        refreshmentsProvided: { waterDuringAction: true },
      },
      confirmedParticipants: 4,
    });

    expect(result.toBring).toEqual([]);
    expect(result.provided.some((entry) => entry.label.includes(": 0"))).toBe(false);
    expect(result.provided.map((entry) => entry.label)).toEqual(expect.arrayContaining([
      "Paires de gants : 4",
      "Sacs poubelles : 20",
      "Pinces de ramassage : 4",
      "Gilets haute visibilité : 2",
      "Pèse-bagage",
      "Eau fournie pendant l'action",
    ]));
    expect(result.staffing).toMatchObject({ source: "confirmed", count: 4 });
  });

  it.each([
    ["partiel", 1, 3, true],
    ["zéro", 0, 3, true],
    ["excessif", 8, 3, false],
  ])("marks %s gloves only when a usable staffing count proves a gap", (_label, stock, count, insufficient) => {
    const result = deriveActionVolunteerChecklist({
      preparation: { equipmentInventory: { glovesPairs: stock } },
      confirmedParticipants: count,
    });
    expect(result.insufficiencies.length > 0).toBe(insufficient);
    expect(result.toBring.some((entry) => entry.key === "shortage-gloves")).toBe(insufficient);
  });

  it("keeps an unknown stock and unknown headcount distinct from a shortage", () => {
    const unknownStock = deriveActionVolunteerChecklist({
      preparation: { expectedWasteCategories: ["glass"] },
    });
    const unknownHeadcount = deriveActionVolunteerChecklist({
      preparation: { equipmentInventory: { glovesPairs: 0 } },
    });

    expect(unknownStock.insufficiencies).toEqual([]);
    expect(unknownStock.staffing.source).toBe("unknown");
    expect(unknownHeadcount.insufficiencies).toEqual([]);
    expect(unknownHeadcount.staffing.source).toBe("unknown");
  });

  it("deduplicates preparation and Waste recommendations while retaining provenance", () => {
    const result = deriveActionVolunteerChecklist({
      preparation: {
        recommendedMaterials: "Gants de collecte",
        expectedWasteCategories: ["plastic"],
      },
    });
    const gloves = result.toBring.find((entry) => entry.label === "Gants de collecte");
    expect(result.toBring.filter((entry) => entry.label === "Gants de collecte")).toHaveLength(1);
    expect(gloves?.provenance).toEqual(expect.arrayContaining(["preparation", "waste_catalog"]));
  });

  it("derives independent rain, cold, heat and wind advice from the selected forecast window", () => {
    const result = deriveActionVolunteerChecklist({
      preparation: { expectedWasteCategories: ["plastic"] },
      weatherContext: weather([
        { temperatureC: 4, precipitationMm: 0.1, windKmh: 30 },
        { temperatureC: 28, precipitationMm: 0, windKmh: 10 },
      ]),
    });
    expect(result.weatherStatus).toBe("available");
    expect(result.weatherRecommendations.map((entry) => entry.key)).toEqual(expect.arrayContaining([
      "weather-rain",
      "weather-cold",
      "weather-heat",
      "weather-wind",
    ]));
  });

  it("does not substitute current weather when the selected forecast is unavailable", () => {
    const result = deriveActionVolunteerChecklist({
      preparation: { expectedWasteCategories: ["plastic"] },
      weatherContext: {
        ...weather([{ temperatureC: 2, precipitationMm: 4, windKmh: 40 }]),
        status: "unavailable",
        weatherStatus: "unavailable",
        hourly: [],
        coveredWindow: null,
      },
    });
    expect(result.weatherRecommendations).toEqual([]);
    expect(result.weatherMessage).toBe("Prévisions météo indisponibles pour cette action");
  });

  it("does not mutate preparation data while recalculating", () => {
    const preparation = {
      suggestedMaterials: ["gloves" as const],
      equipmentInventory: { glovesPairs: 0 },
      expectedWasteCategories: ["plastic" as const],
    };
    const before = JSON.stringify(preparation);
    deriveActionVolunteerChecklist({ preparation, confirmedParticipants: 2 });
    expect(JSON.stringify(preparation)).toBe(before);
  });
});
