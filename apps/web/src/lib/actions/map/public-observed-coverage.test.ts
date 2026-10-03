import { describe, expect, it } from "vitest";
import { parsePublicObservedPreparationData } from "./public-observed-coverage";

function buildCoverage(
  coordinates: number[][][],
  traceCount: number,
  individualDistancesKm: number[],
  sources: string[],
) {
  return {
    type: "MultiLineString",
    coordinates,
    traceCount,
    individualDistancesKm,
    sources,
    coverageDistanceKm: null,
    coverageVersion: "observed-traces-v1",
  };
}

function buildRoutePreparationData({
  routeTargetDistanceKm,
  routeNetworkDistanceKm,
  routeObservedDistanceKm,
  routeGeometryMode,
  routeGeometryProvider,
  operationalRoute,
}: {
  routeTargetDistanceKm: number;
  routeNetworkDistanceKm?: number;
  routeObservedDistanceKm?: number;
  routeGeometryMode: string;
  routeGeometryProvider: string;
  operationalRoute?: Record<string, unknown>;
}) {
  return {
    routeTargetDistanceKm,
    ...(routeNetworkDistanceKm === undefined ? {} : { routeNetworkDistanceKm }),
    ...(routeObservedDistanceKm === undefined ? {} : { routeObservedDistanceKm }),
    routeGeometryMode,
    routeGeometryProvider,
    ...(operationalRoute === undefined ? {} : { operationalRoute }),
  };
}

describe("public map preparation projection", () => {
  it("reads the feed allowlist and drops private preparation data", () => {
    const expectedRoutePreparation = buildRoutePreparationData({
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
    });
    const preparation = parsePublicObservedPreparationData({
      public_preparation_data: {
        observedCoverage: buildCoverage(
          [[[2.35, 48.85], [2.36, 48.86]]],
          1,
          [1.2],
          ["gps_tracking"],
        ),
        ...expectedRoutePreparation,
        mission_id: "private-mission",
        contributor_clerk_id: "private-contributor",
        technical_provenance: "private",
        plannerTechnicalStops: [{ id: "private-stop" }],
        gpxImport: { fileName: "private.gpx" },
      },
    });

    expect(preparation).toEqual(expect.objectContaining({
      ...expectedRoutePreparation,
    }));
    expect(JSON.stringify(preparation)).not.toContain("private-mission");
    expect(JSON.stringify(preparation)).not.toContain("private-contributor");
    expect(JSON.stringify(preparation)).not.toContain("technical_provenance");
    expect(JSON.stringify(preparation)).not.toContain("plannerTechnicalStops");
    expect(JSON.stringify(preparation)).not.toContain("private.gpx");
  });

  it("merges the sanitized feed coverage column with public route preparation", () => {
    const preparation = parsePublicObservedPreparationData({
      observed_coverage: buildCoverage(
        [
          [[2.35, 48.85], [2.36, 48.86]],
          [[2.37, 48.87], [2.38, 48.88]],
        ],
        2,
        [1, 2],
        ["gpx_import", "gps_tracking"],
      ),
      public_preparation_data: buildRoutePreparationData({
        routeTargetDistanceKm: 4,
        routeGeometryMode: "fallback",
        routeGeometryProvider: "none",
      }),
    });

    expect(preparation?.observedCoverage?.traceCount).toBe(2);
    expect(preparation).toMatchObject({
      routeTargetDistanceKm: 4,
      routeGeometryMode: "fallback",
      routeGeometryProvider: "none",
    });
  });
});
