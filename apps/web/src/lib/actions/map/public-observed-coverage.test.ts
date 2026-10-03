import { describe, expect, it } from "vitest";
import { parsePublicObservedPreparationData } from "./public-observed-coverage";

describe("public map preparation projection", () => {
  it("reads the feed allowlist and drops private preparation data", () => {
    const preparation = parsePublicObservedPreparationData({
      public_preparation_data: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [[[2.35, 48.85], [2.36, 48.86]]],
          traceCount: 1,
          individualDistancesKm: [1.2],
          sources: ["gps_tracking"],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
        routeTargetDistanceKm: 3,
        routeNetworkDistanceKm: 2.4,
        routeObservedDistanceKm: 2.1,
        routeGeometryMode: "network",
        routeGeometryProvider: "osrm",
        operationalRoute: {
          routes: [{
            routeId: "route-1",
            groupIndex: 1,
            coordinates: [[48.85, 2.35], [48.86, 2.36]],
          }],
        },
        mission_id: "private-mission",
        contributor_clerk_id: "private-contributor",
        technical_provenance: "private",
        plannerTechnicalStops: [{ id: "private-stop" }],
        gpxImport: { fileName: "private.gpx" },
      },
    });

    expect(preparation).toEqual(expect.objectContaining({
      routeTargetDistanceKm: 3,
      routeNetworkDistanceKm: 2.4,
      routeObservedDistanceKm: 2.1,
      routeGeometryMode: "network",
      routeGeometryProvider: "osrm",
      operationalRoute: {
        routes: [{ routeId: "route-1", groupIndex: 1, coordinates: [[48.85, 2.35], [48.86, 2.36]] }],
      },
    }));
    expect(JSON.stringify(preparation)).not.toContain("private-mission");
    expect(JSON.stringify(preparation)).not.toContain("private-contributor");
    expect(JSON.stringify(preparation)).not.toContain("technical_provenance");
    expect(JSON.stringify(preparation)).not.toContain("plannerTechnicalStops");
    expect(JSON.stringify(preparation)).not.toContain("private.gpx");
  });

  it("merges the sanitized feed coverage column with public route preparation", () => {
    const preparation = parsePublicObservedPreparationData({
      observed_coverage: {
        type: "MultiLineString",
        coordinates: [
          [[2.35, 48.85], [2.36, 48.86]],
          [[2.37, 48.87], [2.38, 48.88]],
        ],
        traceCount: 2,
        individualDistancesKm: [1, 2],
        sources: ["gpx_import", "gps_tracking"],
        coverageDistanceKm: null,
        coverageVersion: "observed-traces-v1",
      },
      public_preparation_data: {
        routeTargetDistanceKm: 4,
        routeGeometryMode: "fallback",
        routeGeometryProvider: "none",
      },
    });

    expect(preparation?.observedCoverage?.traceCount).toBe(2);
    expect(preparation).toMatchObject({
      routeTargetDistanceKm: 4,
      routeGeometryMode: "fallback",
      routeGeometryProvider: "none",
    });
  });
});
