import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "../types";
import { getGeometryPresentation } from "./geometry-presentation";

function buildItem(geometry_source: ActionMapItem["geometry_source"]): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-22",
    location_label: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 2,
    cigarette_butts: 10,
    waste_pollution_score: null,
    cigarette_butts_pollution_score: null,
    post_action_pollution_score: null,
    status: "approved",
    geometry_source,
  };
}

describe("geometry presentation provenance", () => {
  it("presents routed geometry as estimated and dashed", () => {
    expect(getGeometryPresentation(buildItem("routed"))).toMatchObject({
      reality: "estimated",
      strokeStyle: "dashed",
    });
  });

  it("presents manual geometry as real and solid", () => {
    expect(getGeometryPresentation(buildItem("manual"))).toMatchObject({
      reality: "real",
      strokeStyle: "solid",
    });
  });
});
