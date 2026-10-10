import { describe, expect, it } from "vitest";
import {
  buildActionChangeEventKey,
  detectActionChangeKinds,
} from "./action-change-notifications";

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
      updateData: { preparation_data: { shortDescription: "Actualisée" } },
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
      updateData: { preparation_data: { pointDeRendezVous: "Parc B" } },
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
      current: current({ preparation_data: { safetyInstructions: "Rester en binôme." } }),
      updateData: { preparation_data: { safetyInstructions: "  RESTER EN BINÔME ! " } },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { safetyInstructions: "Rester en binôme." } }),
      updateData: { preparation_data: { safetyInstructions: "Rester en binôme et porter un gilet visible." } },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { recommendedMaterials: "Gants." } }),
      updateData: { preparation_data: { recommendedMaterials: "Gants et sacs renforcés." } },
    })).toEqual(["materials"]);
  });

  it("notifies for public accessibility changes and ignores private preparation data", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { accessibilityStatus: "not_evaluated" } }),
      updateData: { preparation_data: { accessibilityStatus: "conditions_reported" } },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { accessibility: "Accès par la rampe nord." } }),
      updateData: { preparation_data: { accessibility: "Accès par l'entrée nord." } },
    })).toEqual(["safety"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { logisticsNotes: "Note interne", preparationChecklist: [{ key: "briefing", label: "Briefing", checked: false }] } }),
      updateData: { preparation_data: { logisticsNotes: "Autre note", preparationChecklist: [{ key: "briefing", label: "Briefing", checked: true }] } },
    })).toEqual([]);
  });

  it("notifies for provided and suggested materials, not their ordering", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { materialsProvided: "Pinces disponibles." } }),
      updateData: { preparation_data: { materialsProvided: "Pinces et sacs disponibles." } },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { materialsProvided: "Pinces disponibles." } }),
      updateData: { preparation_data: { materialsProvided: "" } },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { suggestedMaterials: ["gloves", "grabbers"] } }),
      updateData: { preparation_data: { suggestedMaterials: ["grabbers", "gloves"] } },
    })).toEqual([]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { suggestedMaterials: ["gloves"] } }),
      updateData: { preparation_data: { suggestedMaterials: ["gloves", "bags"] } },
    })).toEqual(["materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { suggestedMaterials: ["gloves", "bags"] } }),
      updateData: { preparation_data: { suggestedMaterials: ["gloves"] } },
    })).toEqual(["materials"]);
  });

  it("uses derived public waste guidance instead of raw category changes", () => {
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { expectedWasteCategories: ["plastic"] } }),
      updateData: { preparation_data: { expectedWasteCategories: ["broken_glass"] } },
    })).toEqual(["safety", "materials"]);
    expect(detectActionChangeKinds({
      current: current({ preparation_data: { expectedWasteCategories: ["plastic"] } }),
      updateData: { preparation_data: { expectedWasteCategories: ["plastic", "not-a-category"] } },
    })).toEqual([]);
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
