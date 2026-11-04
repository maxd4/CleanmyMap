import { describe, expect, it } from "vitest";
import type { ParisPressureSnapshot } from "./paris-pressure-contract";
import {
  buildPedestrianRiskProjection,
  splitPedestrianEdgeByPressureZones,
} from "./pedestrian-risk-projection";
import type { PedestrianNetworkImportResult } from "../route/pedestrian-network";

const baseZone = {
  id: "751010101",
  label: "Zone A",
  geographicLevel: "iris" as const,
  arrondissementCode: "75101",
  centroid: { latitude: 48.855, longitude: 2.345 },
  areaKm2: 0.1,
  signals: {
    residentPopulation: { population: 1000, densityPerKm2: 10000, normalized: 0.8 },
    transport: { stationCount: 1, annualEntrants: 100, normalized: 0.5 },
    tourism: { visitorAttendance: null, tourismPresenceProxy: 0.4, normalized: 0.4 },
    publicActivity: { authorisedTerraces: 3, openAirMarkets: 1, otherPlaces: 0, normalized: 0.2 },
    cleanlinessPrior: { normalized: 0.2, rawObservations: 10, resolution: "iris" as const, measuredAt: null },
  },
  humanPressure: 0.6,
};

function rectangle(west: number, east: number) {
  return {
    type: "Polygon" as const,
    coordinates: [[
      [west, 48.85] as [number, number], [east, 48.85] as [number, number],
      [east, 48.86] as [number, number], [west, 48.86] as [number, number],
      [west, 48.85] as [number, number],
    ]],
  };
}

function sources(): ParisPressureSnapshot["sources"] {
  return [
    {
      family: "resident_population",
      publisher: "test",
      dataset: "population",
      url: "https://example.test/population",
      license: "test",
      datasetVersion: "1",
      observedAt: null,
      refreshedAt: "2026-11-04T00:00:00.000Z",
      geographicLevel: "iris",
      status: "available",
      notes: [],
    },
  ];
}

function makeInputs() {
  const zones = [
    { ...baseZone, id: "751010101", centroid: { latitude: 48.855, longitude: 2.345 }, geometry: rectangle(2.34, 2.35) },
    { ...baseZone, id: "751010102", label: "Zone B", centroid: { latitude: 48.855, longitude: 2.355 }, geometry: rectangle(2.35, 2.36) },
  ];
  const pressureSnapshot = {
    schemaVersion: "paris-pressure-v1" as const,
    snapshotId: "pressure-test-v1",
    generatedAt: "2026-11-04T00:00:00.000Z",
    refreshedAt: "2026-11-04T00:00:00.000Z",
    geographicLevel: "iris" as const,
    coverage: { country: "FR" as const, department: "75" as const, commune: "75056" as const, zoneCount: 2, complete: true, notes: [] },
    sources: sources(),
    zones,
  } satisfies ParisPressureSnapshot;
  const graph = {
    networkKey: "paris-pantheon-jardin-des-plantes" as const,
    importerVersion: "pedestrian-network-v2" as const,
    bounds: { south: 48.85, west: 2.34, north: 48.86, east: 2.36 },
    sourceSha256: "a".repeat(64),
    sourceRetrievedAt: "2026-11-04T00:00:00.000Z",
    nodes: [],
    connections: [],
    diagnostics: [],
    counts: { sourceWays: 1, acceptedWays: 1, sourceNodes: 2, nodes: 2, edges: 1, connections: 1, rejectedWays: 0, rejectedSegments: 0, components: 1, disconnectedComponents: 0, intersectionNodes: 0 },
    edges: [{
      edgeKey: "way-1:segment-0:forward",
      osmWayId: "1",
      segmentIndex: 0,
      direction: "forward" as const,
      fromNodeId: "1",
      toNodeId: "2",
      highway: "footway",
      name: "Rue test",
      accessStatus: "allowed" as const,
      lengthM: 740,
      coordinates: [[48.855, 2.345] as [number, number], [48.855, 2.355] as [number, number]],
      tags: { highway: "footway" },
    }],
  } satisfies PedestrianNetworkImportResult;
  return { graph, pressureSnapshot };
}

describe("pedestrian risk projection", () => {
  it("splits an edge at real IRIS boundaries and keeps both intersections", () => {
    const { graph, pressureSnapshot } = makeInputs();
    const parts = splitPedestrianEdgeByPressureZones(graph.edges[0]!, pressureSnapshot.zones);
    expect(parts).toHaveLength(2);
    expect(parts.map((part) => part.zone?.id)).toEqual(["751010101", "751010102"]);
    expect(parts.reduce((sum, part) => sum + part.coordinates.length, 0)).toBe(4);
  });

  it("materializes separate risks and computes mixed as their arithmetic mean", () => {
    const { graph, pressureSnapshot } = makeInputs();
    const projection = buildPedestrianRiskProjection({ graph, pressureSnapshot, generatedAt: "2026-11-04T12:00:00.000Z" });
    expect(projection.counts.predictedSegments).toBe(2);
    for (const segment of projection.segments) {
      expect(segment.wasteRisk).not.toBeNull();
      expect(segment.cigaretteButtRisk).not.toBeNull();
      expect(segment.mixedRisk).toBe(Number(((segment.wasteRisk! + segment.cigaretteButtRisk!) / 2).toFixed(3)));
      expect(segment.notes.join(" ")).toContain("probabilité calibrée");
      expect(segment.sourceVersions.pressureSnapshotId).toBe("pressure-test-v1");
    }
  });

  it("does not turn a segment outside the IRIS coverage into a zero score", () => {
    const { graph, pressureSnapshot } = makeInputs();
    const outsideGraph = { ...graph, edges: [{ ...graph.edges[0]!, coordinates: [[48.855, 2.37] as [number, number], [48.855, 2.371] as [number, number]] }] };
    const projection = buildPedestrianRiskProjection({ graph: outsideGraph, pressureSnapshot, generatedAt: "2026-11-04T12:00:00.000Z" });
    expect(projection.segments).toHaveLength(1);
    expect(projection.segments[0]).toMatchObject({ riskStatus: "unavailable", effectiveResolution: "unknown", wasteRisk: null, cigaretteButtRisk: null, mixedRisk: null });
  });

  it("rejects a non-IRIS or incompatible source contract", () => {
    const { graph, pressureSnapshot } = makeInputs();
    expect(() => buildPedestrianRiskProjection({ graph, pressureSnapshot: { ...pressureSnapshot, schemaVersion: "wrong" as never } })).toThrow(/snapshot de pression IRIS incompatible/);
  });
});
