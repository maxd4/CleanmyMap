import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionsMapGeoQuality } from "./actions-map-quality";

function buildItem(partial: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-03",
    location_label: "Lieu test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    created_by_clerk_id: null,
    ...partial,
  };
}

describe("buildActionsMapGeoQuality", () => {
  it("counts missing coordinates and geometry realities", () => {
    const stats = buildActionsMapGeoQuality([
      buildItem({ geometry_source: "manual" }),
      buildItem({ id: "action-2", geometry_source: "routed" }),
      buildItem({
        id: "action-3",
        latitude: null,
        longitude: null,
        geometry_source: "fallback_point",
      }),
    ]);

    expect(stats).toEqual({
      total: 3,
      missingCoordinates: 1,
      realGeometry: 1,
      estimatedGeometry: 1,
      fallbackPoint: 1,
    });
  });
});
