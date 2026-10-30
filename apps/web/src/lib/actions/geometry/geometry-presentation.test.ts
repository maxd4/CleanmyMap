import { describe, expect, it } from "vitest";
import type { ActionMapItem, ActionPhase, ActionPreparationData } from "../types";
import { getGeometryPresentation } from "./geometry-presentation";

function buildItem(
  geometry_source: ActionMapItem["geometry_source"],
  kind: "polyline" | "polygon" = "polyline",
  preparationData: ActionPreparationData | null = null,
  actionPhase: ActionPhase | null = null,
): ActionMapItem {
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
    manual_drawing: {
      kind,
      coordinates:
        kind === "polygon"
          ? [[48.85, 2.35], [48.851, 2.351], [48.852, 2.35]]
          : [[48.85, 2.35], [48.851, 2.351]],
    },
    contract: preparationData
      ? ({
          metadata: { preparationData, actionPhase },
          geometry: { kind, geometrySource: geometry_source, origin: geometry_source },
        } as ActionMapItem["contract"])
      : undefined,
  };
}

describe("geometry presentation provenance", () => {
  it("presents routed geometry as planned and dashed", () => {
    expect(getGeometryPresentation(buildItem("routed"))).toMatchObject({
      reality: "planned",
      strokeStyle: "dashed",
      variant: "network",
    });
  });

  it("presents manual geometry as declared and solid", () => {
    expect(getGeometryPresentation(buildItem("manual"))).toMatchObject({
      reality: "declared",
      strokeStyle: "solid",
      variant: "declared",
    });
  });

  it("keeps observation, declaration and reference wording distinct", () => {
    expect(getGeometryPresentation(buildItem("gpx_import")).label).toBe("Trace GPX fournie");
    expect(getGeometryPresentation(buildItem("gps_tracking"))).toMatchObject({
      label: "Trace GPS enregistrée",
      reality: "observed",
      variant: "observed",
    });
    expect(getGeometryPresentation(buildItem("manual")).label).toBe(
      "Parcours déclaré",
    );
    expect(getGeometryPresentation(buildItem("reference", "polygon"))).toMatchObject({
      label: "Repère géographique indicatif",
      reality: "contextual",
      strokeStyle: "dashed",
    });
  });

  it("distinguishes a network estimate from its geographic fallback", () => {
    expect(
      getGeometryPresentation(
        buildItem("estimated_route", "polyline", {
          routeGeometryMode: "fallback",
          routeGeometryProvider: "none",
        }),
      ),
    ).toMatchObject({
      label: "Parcours non documenté",
      reality: "location_only",
      variant: "point",
      strokeStyle: "point",
    });
    expect(
      getGeometryPresentation(
        buildItem("estimated_route", "polyline", {
          routeGeometryMode: "fallback",
          routeGeometryProvider: "none",
        }, "pre_action"),
      ),
    ).toMatchObject({
      label: "Liaison indicative non routée",
      reality: "planned",
      variant: "indicative",
    });
    expect(
      getGeometryPresentation(
        buildItem("estimated_route", "polyline", {
          routeGeometryMode: "network",
          routeGeometryProvider: "osrm",
        }),
      ),
    ).toMatchObject({ label: "Itinéraire prévu estimé", reality: "planned", variant: "estimated" });
  });
});
