import { describe, expect, it } from "vitest";
import {
  hasGpxGeometryContribution,
  stripObservedGeometryProjectionFields,
} from "./action-geometry-contribution-workflow";

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

  it.each([
    ["gpx geometry", { geometry_source: "gpx_import", derived_geometry_geojson: "{}", preparation_data: {} }, true],
    ["manual geometry", { geometry_source: "manual", derived_geometry_geojson: "{}" }, false],
    ["missing geometry", { geometry_source: "gpx_import" }, false],
    ["non-string geometry", { geometry_source: "gpx_import", derived_geometry_geojson: null }, false],
    ["empty source", { geometry_source: "", derived_geometry_geojson: "{}" }, false],
  ] as const)("detects %s as a contribution only when the server projection is complete", (_label, value, expected) => {
    expect(hasGpxGeometryContribution(value)).toBe(expected);
  });

  it("is idempotent and keeps unrelated nested data when stripping projections", () => {
    const original = {
      notes: "keep",
      preparation_data: { actionTitle: "keep", observedCoverage: {}, routeObservedDistanceKm: 1.2 },
      geometry_source: "gpx_import",
    };
    const stripped = stripObservedGeometryProjectionFields(original);

    expect(stripObservedGeometryProjectionFields(stripped)).toEqual(stripped);
    expect(stripped).toEqual({ notes: "keep", preparation_data: { actionTitle: "keep" } });
    expect(original.preparation_data).toEqual({ actionTitle: "keep", observedCoverage: {}, routeObservedDistanceKm: 1.2 });
  });

  it("does not treat arrays or null preparation data as writable projection objects", () => {
    expect(stripObservedGeometryProjectionFields({ preparation_data: ["raw"] })).toEqual({ preparation_data: ["raw"] });
    expect(stripObservedGeometryProjectionFields({ preparation_data: null })).toEqual({ preparation_data: null });
  });
});
