import { describe, expect, it } from "vitest";
import { stripObservedGeometryProjectionFields } from "./action-geometry-contribution-workflow";

describe("observed geometry contribution workflow", () => {
  it("separates the contribution payload from scalar and legitimate preparation updates", () => {
    const updateData = {
      waste_kg: 4,
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: "{\"type\":\"LineString\"}",
      geometry_source: "gpx_import",
      geometry_confidence: 1,
      preparation_data: {
        actionTitle: "Conserver ce champ",
        routeObservedDistanceKm: 2.4,
        gpxImport: { source: "gpx_import" },
        observedCoverage: { type: "MultiLineString" },
      },
    };

    expect(stripObservedGeometryProjectionFields(updateData)).toEqual({
      waste_kg: 4,
      preparation_data: { actionTitle: "Conserver ce champ" },
    });
    expect(updateData.derived_geometry_geojson).toBe("{\"type\":\"LineString\"}");
  });
});
