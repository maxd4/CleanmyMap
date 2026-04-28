import { describe, expect, it } from "vitest";
import { getActionsMapCenter, PARIS_CENTER } from "./actions-map-canvas.utils";
import type { ActionMapItem } from "@/lib/actions/types";

function buildItem(
  overrides: Partial<ActionMapItem>,
): ActionMapItem {
  return {
    id: "item-1",
    action_date: "2025-01-01",
    location_label: "Test",
    latitude: null,
    longitude: null,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    created_by_clerk_id: null,
    ...overrides,
  };
}

describe("getActionsMapCenter", () => {
  it("falls back to Paris when there is no geolocated item", () => {
    expect(getActionsMapCenter([buildItem({ latitude: null, longitude: null })])).toEqual(
      PARIS_CENTER,
    );
  });

  it("uses the first geolocated item as center", () => {
    expect(
      getActionsMapCenter([
        buildItem({ latitude: null, longitude: null }),
        buildItem({ id: "item-2", latitude: 48.85, longitude: 2.35 }),
      ]),
    ).toEqual([48.85, 2.35]);
  });
});
