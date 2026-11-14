import { describe, expect, it } from "vitest";
import {
  parsePublicObservedPreparationData,
  sanitizePublicObservedPreparationData,
} from "./public-observed-coverage";

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
  it("projects hypothetical multiline routes without treating them as observed", () => {
    const preparation = parsePublicObservedPreparationData({
      public_preparation_data: {
        simulatedRouteCoverage: {
          type: "MultiLineString",
          coordinates: [
            [[2.35, 48.85], [2.351, 48.851]],
            [[2.35, 48.85], [2.349, 48.849]],
          ],
          groupCount: 2,
          groupSizePolicy: "preferred_5_to_8",
          groupParticipantCounts: [5, 5],
          durationMinutes: 60,
          targetDistanceKm: 3,
          individualSimulatedDistancesKm: [3, 3],
          totalSimulatedDistanceKm: 6,
          uniqueNetworkDistanceKm: null,
          speedKmPerHour: 3,
          geometrySource: "estimated_route",
          provenance: "estimated",
          status: "hypothetical",
          coverageVersion: "simulated-routes-v2",
          observedDistanceKm: 99,
        },
      },
    });
    expect(preparation?.simulatedRouteCoverage).toMatchObject({
      groupCount: 2,
      groupSizePolicy: "preferred_5_to_8",
      targetDistanceKm: 3,
      individualSimulatedDistancesKm: [3, 3],
      totalSimulatedDistanceKm: 6,
      uniqueNetworkDistanceKm: null,
      observedDistanceKm: null,
      speedKmPerHour: 3,
      provenance: "estimated",
    });
    expect(preparation?.observedCoverage).toBeUndefined();
    expect(preparation?.simulatedRouteCoverage?.observedDistanceKm).toBeNull();
    expect(preparation?.simulatedRouteCoverage?.coordinates).toEqual([
      [[48.85, 2.35], [48.851, 2.351]],
      [[48.85, 2.35], [48.849, 2.349]],
    ]);
  });

  it("keeps server and direct-RPC projections equivalent for asymmetric simulated coordinates", () => {
    const publicPreparation = {
      simulatedRouteCoverage: {
        type: "MultiLineString",
        coordinates: [
          [[2.3501, 48.8567], [2.3519, 48.8578]],
          [[2.3602, 48.8461], [2.3618, 48.8473]],
        ],
        groupCount: 2,
        groupSizePolicy: "preferred_5_to_8",
        groupParticipantCounts: [5, 5],
        durationMinutes: 90,
        targetDistanceKm: 4.5,
        individualSimulatedDistancesKm: [4.4, 4.6],
        totalSimulatedDistanceKm: 9,
        uniqueNetworkDistanceKm: null,
        observedDistanceKm: null,
        speedKmPerHour: 3,
        geometrySource: "estimated_route",
        provenance: "estimated",
        status: "hypothetical",
        coverageVersion: "simulated-routes-v2",
      },
      referenceAreaProvenance: {
        kind: "official_park",
        source: "ville_de_paris",
        attribution: "Ville de Paris",
        license: "ODbL",
        sourceUrl: "https://example.test/belleville",
      },
    };

    const serverProjection = sanitizePublicObservedPreparationData({
      simulatedRouteCoverage: {
        ...publicPreparation.simulatedRouteCoverage,
        coordinates: [
          [[48.8567, 2.3501], [48.8578, 2.3519]],
          [[48.8461, 2.3602], [48.8473, 2.3618]],
        ],
      },
      referenceAreaProvenance: publicPreparation.referenceAreaProvenance,
    });
    const fallbackProjection = parsePublicObservedPreparationData({
      public_preparation_data: publicPreparation,
    });

    expect(fallbackProjection).toEqual(serverProjection);
    expect(fallbackProjection?.simulatedRouteCoverage?.coordinates).toEqual([
      [[48.8567, 2.3501], [48.8578, 2.3519]],
      [[48.8461, 2.3602], [48.8473, 2.3618]],
    ]);
  });

  it("projects the explicit nine-person grouping exception without making it observed", () => {
    const preparation = parsePublicObservedPreparationData({
      public_preparation_data: {
        simulatedRouteCoverage: {
          type: "MultiLineString",
          coordinates: [
            [[48.85, 2.35], [48.851, 2.351]],
            [[48.85, 2.35], [48.849, 2.349]],
          ],
          groupCount: 2,
          groupSizePolicy: "explicit_exception",
          groupParticipantCounts: [5, 4],
          durationMinutes: 90,
          targetDistanceKm: 4.5,
          individualSimulatedDistancesKm: [4.4, 4.6],
          totalSimulatedDistanceKm: 9,
          uniqueNetworkDistanceKm: null,
          observedDistanceKm: null,
          speedKmPerHour: 3,
          geometrySource: "estimated_route",
          provenance: "estimated",
          status: "hypothetical",
          coverageVersion: "simulated-routes-v2",
        },
      },
    });

    expect(preparation?.simulatedRouteCoverage).toMatchObject({
      groupSizePolicy: "explicit_exception",
      groupParticipantCounts: [5, 4],
      targetDistanceKm: 4.5,
      observedDistanceKm: null,
    });
  });

  it("keeps official park attribution in the bounded public allowlist", () => {
    expect(parsePublicObservedPreparationData({
      public_preparation_data: {
        referenceAreaProvenance: {
          kind: "official_park",
          source: "ville_de_paris",
          attribution: "Ville de Paris",
          license: "ODbL",
          sourceUrl: "https://example.test/park",
        },
      },
    })).toEqual({
      referenceAreaProvenance: {
        kind: "official_park",
        source: "ville_de_paris",
        attribution: "Ville de Paris",
        license: "ODbL",
        sourceUrl: "https://example.test/park",
      },
    });
  });

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

  it("keeps only the bounded GPX provenance markers in the public preparation", () => {
    expect(parsePublicObservedPreparationData({
      public_preparation_data: {
        geometryMethod: "gpx_import",
        gpxImportProvenance: "planned",
        gpxImport: { fileName: "private.gpx" },
      },
    })).toEqual({
      geometryMethod: "gpx_import",
      gpxImportProvenance: "planned",
    });
  });

  it("does not project a client-declared server route provenance marker", () => {
    expect(parsePublicObservedPreparationData({
      public_preparation_data: {
        routeGeometryProvenance: "server_verified",
        routeGeometryMode: "network",
        routeGeometryProvider: "osrm",
      },
    })).toEqual({
      routeGeometryMode: "network",
      routeGeometryProvider: "osrm",
    });
  });
});
