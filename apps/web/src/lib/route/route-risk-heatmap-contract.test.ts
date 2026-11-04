import { describe, expect, it } from "vitest";
import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import {
  buildRouteRiskHeatmap,
  ROUTE_RISK_HEATMAP_SCHEMA_VERSION,
} from "./route-risk-heatmap-contract";

function projection(): PedestrianRiskProjectionSnapshot {
  return {
    schemaVersion: "paris-pedestrian-risk-projection-v1",
    projectionKey: "paris-pantheon-jardin-des-plantes",
    policyVersion: "segment-zonal-neutral-v1",
    projectionVersionId: "projection-2026-11-04",
    networkVersionId: "network-2026-11-04",
    generatedAt: "2026-11-04T10:00:00.000Z",
    sourceVersions: {
      networkKey: "pilot",
      networkImporterVersion: "importer-v1",
      networkSourceSha256: "sha",
      networkSourceRetrievedAt: "2026-11-04T09:00:00.000Z",
      pressureSnapshotId: "pressure-1",
      pressureSchemaVersion: "paris-pressure-v1",
      pressureGeneratedAt: "2026-11-04T08:00:00.000Z",
      pressureRefreshedAt: "2026-11-04T08:30:00.000Z",
      riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
      serviceabilitySnapshotId: null,
      serviceabilitySchemaVersion: null,
      serviceabilityModelVersion: null,
      serviceabilityGeneratedAt: null,
      serviceabilityRefreshedAt: null,
    },
    counts: { sourceEdges: 1, projectedSegments: 1, predictedSegments: 1, unavailableSegments: 0, zonesIntersected: 1 },
    segments: [{
      projectionSegmentId: "segment-1",
      edgeKey: "edge-1",
      osmWayId: "way-1",
      segmentIndex: 0,
      direction: "forward",
      fromNodeId: "a",
      toNodeId: "b",
      lengthM: 100,
      intersectionLengthM: 100,
      coordinates: [[48.85, 2.35], [48.851, 2.351]],
      midpoint: [48.8505, 2.3505],
      zoneId: "iris-1",
      intersectedZoneIds: ["iris-1"],
      effectiveResolution: "iris",
      riskStatus: "predicted",
      wasteRisk: 70,
      cigaretteButtRisk: 30,
      mixedRisk: 50,
      wasteConfidence: null,
      cigaretteButtConfidence: null,
      wasteFactors: null,
      cigaretteButtFactors: null,
      availableFactors: { waste: ["pressure"], cigaretteButts: ["pressure"] },
      missingFactors: { waste: [], cigaretteButts: [] },
      serviceability: null,
      sourceVersions: {} as PedestrianRiskProjectionSnapshot["sourceVersions"],
      provenance: [],
      notes: [],
    }],
  };
}

describe("route risk heatmap contract", () => {
  it("projects the canonical cache without changing values or versions", () => {
    const input = projection();
    const heatmap = buildRouteRiskHeatmap(input)!;

    expect(heatmap).toMatchObject({
      schemaVersion: ROUTE_RISK_HEATMAP_SCHEMA_VERSION,
      projectionVersionId: "projection-2026-11-04",
      sourceVersions: { riskModelVersion: "paris-pressure-risk-v3-urban-morphology" },
      counts: input.counts,
    });
    expect(heatmap.segments[0]).toMatchObject({
      projectionSegmentId: "segment-1",
      wasteRisk: 70,
      cigaretteButtRisk: 30,
      mixedRisk: 50,
      effectiveResolution: "iris",
    });
    expect(heatmap.segments).not.toBe(input.segments);
  });

  it("does not invent a layer when the canonical projection is absent", () => {
    expect(buildRouteRiskHeatmap(null)).toBeUndefined();
    expect(buildRouteRiskHeatmap({ ...projection(), segments: [] })).toBeUndefined();
  });
});
