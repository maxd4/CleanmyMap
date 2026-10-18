import { describe, expect, it } from "vitest";
import {
  buildActionChangeEventKey,
  detectActionChangeKinds,
} from "./action-change-notifications";

function preparationData(overrides: Record<string, unknown> = {}) {
  return {
    pointDeRendezVous: "Parc A",
    meetingTime: "08:45",
    departureTime: "09:00",
    ...overrides,
  };
}

function current(overrides: Record<string, unknown> = {}) {
  return {
    published_at: "2026-10-01T10:00:00.000Z",
    action_phase: "pre_action" as const,
    status: "approved" as const,
    action_date: "2026-10-20",
    location_label: "Parc A",
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: "polyline" as const,
    derived_geometry_geojson: "{\"type\":\"LineString\"}",
    geometry_source: "routed" as const,
    event_start_time: "09:00",
    event_end_time: "11:00",
    preparation_data: {
      pointDeRendezVous: "Parc A",
      meetingTime: "08:45",
      departureTime: "09:00",
    },
    ...overrides,
  };
}

describe("action change notification classification", () => {
  it("ignores drafts and non-operational preparation edits", () => {
    expect(detectActionChangeKinds({
      current: current({ published_at: null }),
      updateData: { action_date: "2026-10-21" },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { preparation_data: preparationData({ shortDescription: "Actualisée" }) },
    })).toEqual([]);
  });

  it("classifies effective date, time and meeting point changes", () => {
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { action_date: "2026-10-21" },
    })).toEqual(["schedule"]);
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { event_start_time: "10:00" },
    })).toEqual(["schedule"]);
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { preparation_data: preparationData({ pointDeRendezVous: "Parc B" }) },
    })).toEqual(["meeting_point"]);
  });

  it("does not report equivalent clock values and detects route changes", () => {
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { event_start_time: "09:00:00" },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current(),
      updateData: { derived_geometry_geojson: "{\"type\":\"LineString\",\"coordinates\":[]}" },
    })).toEqual(["route"]);
  });

  it("emits meaningful safety and equipment events but ignores formatting-only edits", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ safetyInstructions: "Rester en binôme." }) }),
      updateData: { preparation_data: preparationData({ safetyInstructions: "  RESTER EN BINÔME ! " }) },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ safetyInstructions: "Rester en binôme." }) }),
      updateData: { preparation_data: preparationData({ safetyInstructions: "Rester en binôme et porter un gilet visible." }) },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ recommendedMaterials: "Gants." }) }),
      updateData: { preparation_data: preparationData({ recommendedMaterials: "Gants et sacs renforcés." }) },
    })).toEqual(["materials"]);
  });

  it("notifies for public accessibility changes and ignores private preparation data", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ accessibilityStatus: "not_evaluated" }) }),
      updateData: { preparation_data: preparationData({ accessibilityStatus: "conditions_reported" }) },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ accessibility: "Accès par la rampe nord." }) }),
      updateData: { preparation_data: preparationData({ accessibility: "Accès par l'entrée nord." }) },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ logisticsNotes: "Note interne", preparationChecklist: [{ key: "briefing", label: "Briefing", checked: false }] }) }),
      updateData: { preparation_data: preparationData({ logisticsNotes: "Autre note", preparationChecklist: [{ key: "briefing", label: "Briefing", checked: true }] }) },
    })).toEqual([]);
  });

  it("notifies for provided and suggested materials, not their ordering", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ materialsProvided: "Pinces disponibles." }) }),
      updateData: { preparation_data: preparationData({ materialsProvided: "Pinces et sacs disponibles." }) },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ materialsProvided: "Pinces disponibles." }) }),
      updateData: { preparation_data: preparationData({ materialsProvided: "" }) },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ suggestedMaterials: ["gloves", "grabbers"] }) }),
      updateData: { preparation_data: preparationData({ suggestedMaterials: ["grabbers", "gloves"] }) },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ suggestedMaterials: ["gloves"] }) }),
      updateData: { preparation_data: preparationData({ suggestedMaterials: ["gloves", "bags"] }) },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ suggestedMaterials: ["gloves", "bags"] }) }),
      updateData: { preparation_data: preparationData({ suggestedMaterials: ["gloves"] }) },
    })).toEqual(["materials"]);
  });

  it("notifies once for changes to announced equipment or refreshments", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ equipmentInventory: { glovesPairs: 2 } }) }),
      updateData: { preparation_data: preparationData({ equipmentInventory: { glovesPairs: 3 } }) },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ refreshmentsProvided: { waterDuringAction: true } }) }),
      updateData: { preparation_data: preparationData({ refreshmentsProvided: { waterDuringAction: true, snackAfterAction: true } }) },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ equipmentInventory: { glovesPairs: 2 }, logisticsNotes: "interne" }) }),
      updateData: { preparation_data: preparationData({ equipmentInventory: { glovesPairs: 2 }, logisticsNotes: "interne modifiée" }) },
    })).toEqual([]);
  });

  it("does not notify for a weather-refresh-only change", () => {
    const currentWeather = {
      available: true,
      coveredWindow: true,
      hourly: [{ time: "2026-10-20T09:00:00+02:00", temperatureC: 12, precipitationMm: 0, windKmh: 8, gustKmh: null }],
      source: "open-meteo" as const,
    };
    const refreshedWeather = {
      ...currentWeather,
      hourly: [{ ...currentWeather.hourly[0], temperatureC: 14, windKmh: 10 }],
    };

    expect(detectActionChangeKinds({
      current: current({
        preparation_data: preparationData({
          routeVersioning: { active: { calculation: { weatherContext: currentWeather } } },
        }),
      }),
      updateData: {
        preparation_data: preparationData({
          routeVersioning: { active: { calculation: { weatherContext: refreshedWeather } } },
        }),
      },
    })).toEqual([]);
  });

  it("uses derived public waste guidance instead of raw category changes", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ expectedWasteCategories: ["plastic"] }) }),
      updateData: { preparation_data: preparationData({ expectedWasteCategories: ["broken_glass"] }) },
    })).toEqual(["safety", "materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ expectedWasteCategories: ["plastic"] }) }),
      updateData: { preparation_data: preparationData({ expectedWasteCategories: ["plastic", "not-a-category"] }) },
    })).toEqual([]);
  });

  it.each([
    ["2 to 0", { glovesPairs: 2 }, { glovesPairs: 0 }],
    ["2 to absent", { glovesPairs: 2 }, {}],
    ["0 to 2", { glovesPairs: 0 }, { glovesPairs: 2 }],
    ["absent to 0", {}, { glovesPairs: 0 }],
  ])("detects equipment availability transition %s", (_label, before, after) => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ equipmentInventory: before }) }),
      updateData: { preparation_data: preparationData({ equipmentInventory: after }) },
    })).toEqual(["materials"]);
  });

  it("detects removal of the last equipment and the last announced refreshment", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ equipmentInventory: { glovesPairs: 2 } }) }),
      updateData: { preparation_data: preparationData() },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparationData({ refreshmentsProvided: { snackAfterAction: true } }) }),
      updateData: { preparation_data: preparationData() },
    })).toEqual(["materials"]);
  });

  it("does not duplicate an unchanged materials notification", () => {
    const preparation = preparationData({
      equipmentInventory: { glovesPairs: 2 },
      refreshmentsProvided: { waterDuringAction: true },
    });
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparation }),
      updateData: { preparation_data: preparation },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: preparation }),
      updateData: { preparation_data: preparationData({ equipmentInventory: { glovesPairs: 3 }, refreshmentsProvided: { snackAfterAction: true } }) },
    })).toEqual(["materials"]);
  });

  it("uses a stable key for retries and separates revisions", () => {
    const first = buildActionChangeEventKey({
      actionId: "action-1",
      revision: "revision-1",
      changeKinds: ["schedule", "route"],
    });
    expect(first).toBe(buildActionChangeEventKey({
      actionId: "action-1",
      revision: "revision-1",
      changeKinds: ["route", "schedule"],
    }));
    expect(first).not.toBe(buildActionChangeEventKey({
      actionId: "action-1",
      revision: "revision-2",
      changeKinds: ["schedule", "route"],
    }));
  });
});
