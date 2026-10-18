import { describe, expect, it } from "vitest";
import {
  buildPlannerWeatherRequest,
  type PlannerWeatherContext,
} from "@/lib/weather/planner-weather";
import type { ActionPreparationData } from "./types";
import { deriveActionVolunteerChecklist } from "./action-preparation-checklist";

function weather(points: Array<{ temperatureC: number; precipitationMm: number; windKmh: number }>): PlannerWeatherContext {
  const completePoints = points.length === 1 ? [...points, points[0]!] : points;
  return {
    version: "planner-weather-snapshot-v1",
    provider: "open-meteo",
    source: "forecast",
    fetchedAt: "2026-10-19T08:00:00.000Z",
    coveredWindow: { startAt: "2026-10-20T09:00", endAt: "2026-10-20T11:00" },
    status: "available",
    weatherStatus: "available",
    location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
    hourly: completePoints.map((point, index) => ({
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

function weatherRequest() {
  return buildPlannerWeatherRequest({
    latitude: 48.85,
    longitude: 2.35,
    actionDate: "2026-10-20",
    scheduledStartTime: "09:00",
    scheduledEndTime: "11:00",
    now: new Date("2026-10-19T09:00:00.000Z"),
  });
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

    expect(result.toBring.map((entry) => entry.label)).toEqual(expect.arrayContaining([
      "Sacs",
      "Pinces",
      "Gilet visible",
    ]));
    expect(result.insufficiencies).toEqual([]);
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

  it("uses an explicitly entered expected headcount until confirmed participation is known", () => {
    const expected = deriveActionVolunteerChecklist({
      preparation: { volunteersExpected: 6 },
    });
    const confirmed = deriveActionVolunteerChecklist({
      preparation: { volunteersExpected: 6 },
      confirmedParticipants: 3,
    });

    expect(expected.staffing).toMatchObject({ source: "expected", count: 6 });
    expect(confirmed.staffing).toMatchObject({ source: "confirmed", count: 3 });
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
      weatherRequest: weatherRequest(),
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
      weatherRequest: weatherRequest(),
    });
    expect(result.weatherRecommendations).toEqual([]);
    expect(result.weatherMessage).toBe("Prévisions météo indisponibles pour cette action");
  });

  it("rejects an otherwise valid forecast when its date, location or freshness no longer matches", () => {
    const request = weatherRequest()!;
    const preparation: ActionPreparationData = { expectedWasteCategories: ["plastic"] };
    const current = weather([
      { temperatureC: 18, precipitationMm: 0, windKmh: 8 },
      { temperatureC: 18, precipitationMm: 0, windKmh: 8 },
    ]);

    expect(deriveActionVolunteerChecklist({ preparation, weatherContext: current, weatherRequest: request }).weatherStatus).toBe("available");
    expect(deriveActionVolunteerChecklist({
      preparation,
      weatherContext: current,
      weatherRequest: { ...request, scheduledStartAt: "2026-10-21T09:00", scheduledEndAt: "2026-10-21T11:00" },
    }).weatherStatus).toBe("unavailable");
    expect(deriveActionVolunteerChecklist({
      preparation,
      weatherContext: current,
      weatherRequest: { ...request, latitude: 48.86 },
    }).weatherStatus).toBe("unavailable");
    expect(deriveActionVolunteerChecklist({
      preparation,
      weatherContext: { ...current, fetchedAt: "2026-10-18T08:00:00.000Z" },
      weatherRequest: request,
    }).weatherStatus).toBe("unavailable");
  });

  it("keeps free-text needs intact and does not treat partial individual stock as sufficient", () => {
    const result = deriveActionVolunteerChecklist({
      preparation: {
        recommendedMaterials: "Gants et sacs renforcés",
        suggestedMaterials: ["gloves"],
        equipmentInventory: { glovesPairs: 2, garbageBags: 12 },
      },
      confirmedParticipants: 4,
    });

    expect(result.toBring.map((entry) => entry.label)).toEqual(expect.arrayContaining([
      "Gants et sacs renforcés",
      "Gants",
      "Gants : quantité limitée (2 paire(s) fournie(s) pour 4)",
    ]));
    expect(result.insufficiencies).toHaveLength(1);
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
