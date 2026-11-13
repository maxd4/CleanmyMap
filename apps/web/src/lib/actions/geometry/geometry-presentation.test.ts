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
    expect(getGeometryPresentation(buildItem("routed", "polyline", {
      routeGeometryMode: "network",
      routeGeometryProvider: "fossgis-osrm",
      routeVersioning: {
        schemaVersion: "action-route-versioning-v1",
        active: {
          calculation: { snapshotHash: "a".repeat(64) },
          provenance: "server_verified",
          operationalRoute: {
            version: "operational-route-v1",
            initializedAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            source: "planner",
            state: "planner_copy",
            plannerGroupCount: 1,
            routes: [{
              routeId: "route-1",
              groupIndex: 1,
              geometry: {
                mode: "network",
                provider: "fossgis-osrm",
                estimated: false,
                distanceKm: 1,
                coordinates: [[48.85, 2.35], [48.851, 2.351]],
              },
              plannerTechnicalStops: [],
            }],
            zones: {
              departure: { label: null, coordinate: null },
              midpoint: { label: null, coordinate: null },
              arrival: { label: null, coordinate: null },
            },
          },
        },
        history: [],
      } as never,
      routeGeometryProvenance: "server_verified",
    }, "post_action_complete"))).toMatchObject({
      reality: "planned",
      strokeStyle: "dashed",
      variant: "network",
    });
  });

  it("does not present an unproven completed route as a line", () => {
    expect(getGeometryPresentation(buildItem("routed", "polyline", null, "post_action_complete"))).toMatchObject({
      label: "Localisation seule · itinéraire non démontré",
      reality: "location_only",
      strokeStyle: "point",
      variant: "point",
    });
  });

  it("does not treat client-declarative network metadata as proof", () => {
    expect(getGeometryPresentation(buildItem("routed", "polyline", {
      routeGeometryMode: "network",
      routeGeometryProvider: "osrm",
      routeNetworkDistanceKm: 1.4,
      routeVersioning: {
        schemaVersion: "action-route-versioning-v1",
        active: {
          calculation: { snapshotHash: "a".repeat(64) },
          operationalRoute: {},
        },
        history: [],
      } as never,
    }, "post_action_complete"))).toMatchObject({
      label: "Localisation seule · itinéraire non démontré",
      reality: "location_only",
      strokeStyle: "point",
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

  it("does not present planned or unqualified GPX as observed", () => {
    expect(getGeometryPresentation(buildItem("gpx_import", "polyline", {
      geometryMethod: "gpx_import",
      gpxImportProvenance: "planned",
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 0,
        pointCount: 2,
        inferredTopology: "point_to_point",
        intent: "planned",
        provenance: "planned",
      },
    }))).toMatchObject({
      label: "Parcours GPX prévu",
      reality: "planned",
      strokeStyle: "dashed",
      variant: "planned_gpx",
    });
    expect(getGeometryPresentation(buildItem("gpx_import", "polyline", {
      geometryMethod: "gpx_import",
      gpxImportProvenance: "unknown",
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 0,
        pointCount: 2,
        inferredTopology: "point_to_point",
        intent: "observed",
        provenance: "unknown",
      },
    }))).toMatchObject({
      label: "Trace GPX à qualifier",
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
