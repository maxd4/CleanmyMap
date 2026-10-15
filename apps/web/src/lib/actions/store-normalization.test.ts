import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import { normalizeStoredAction } from "./store-normalization";

function storedAction(
  volunteers_count: number | null,
  overrides: Partial<ActionRow> = {},
): ActionRow {
  return {
    id: "action-1",
    created_at: "2026-07-01T08:00:00.000Z",
    created_by_clerk_id: "owner-1",
    type: "action",
    actor_name: "Collectif",
    organizer_type: "collective",
    organizer_id: null,
    organizer_name: null,
    action_date: "2026-07-01",
    location_label: "Paris 10e",
    latitude: 48.87,
    longitude: 2.36,
    waste_kg: 2,
    waste_breakdown: null,
    cigarette_butts: 4,
    volunteers_count,
    duration_minutes: 60,
    status: "approved",
    notes: null,
    action_phase: "post_action_complete",
    preparation_data: {} as ActionRow["preparation_data"],
    published_at: null,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    geometry_source: null,
    ...overrides,
  };
}

describe("stored action normalization", () => {
  it("preserves an invalidated participant measure as null", () => {
    expect(normalizeStoredAction(storedAction(null)).volunteers_count).toBeNull();
  });

  it("preserves observed zero and positive participant measures", () => {
    expect(normalizeStoredAction(storedAction(0)).volunteers_count).toBe(0);
    expect(normalizeStoredAction(storedAction(7)).volunteers_count).toBe(7);
  });

  it("does not alter an independent action with an observed zero", () => {
    const independent = normalizeStoredAction(
      storedAction(0, { type: "clean_place", source: "actions" }),
    );

    expect(independent.type).toBe("clean_place");
    expect(independent.source).toBe("actions");
    expect(independent.volunteers_count).toBe(0);
    expect(independent.waste_kg).toBe(2);
  });
});
