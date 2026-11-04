import type {
  ParisPressureProvenance,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";
import {
  estimateParisPressureRisk,
} from "./paris-pressure-risk.ts";
import type {
  ParisPressureRiskConfidence,
  ParisPressureRiskScore,
} from "./paris-pressure-risk-contract";
import {
  MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION,
  MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION,
} from "./municipal-cleaning-serviceability-contract.ts";
import type {
  MunicipalCleaningServiceabilitySnapshot,
  MunicipalCleaningServiceabilityZone,
} from "./municipal-cleaning-serviceability-contract";
import {
  haversineMeters,
  PEDESTRIAN_NETWORK_IMPORTER_VERSION,
  PEDESTRIAN_NETWORK_KEY,
} from "../route/pedestrian-network.ts";
import type {
  Coordinate,
  PedestrianNetworkEdge,
  PedestrianNetworkImportResult,
} from "../route/pedestrian-network";

export const PEDESTRIAN_RISK_PROJECTION_SCHEMA_VERSION =
  "paris-pedestrian-risk-projection-v1" as const;
export const PEDESTRIAN_RISK_PROJECTION_POLICY_VERSION =
  "segment-zonal-neutral-v1" as const;
export const PEDESTRIAN_RISK_PROJECTION_KEY =
  "paris-pantheon-jardin-des-plantes" as const;
export const PEDESTRIAN_RISK_MODEL_VERSION =
  "paris-pressure-risk-v3-urban-morphology" as const;
const PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION = "paris-pressure-v1" as const;

export type PedestrianRiskProjectionResolution = "iris" | "unknown";
export type PedestrianRiskProjectionStatus = "predicted" | "unavailable";

export type PedestrianRiskProjectionSourceVersions = {
  networkKey: string;
  networkImporterVersion: string;
  networkSourceSha256: string;
  networkSourceRetrievedAt: string;
  pressureSnapshotId: string;
  pressureSchemaVersion: string;
  pressureGeneratedAt: string;
  pressureRefreshedAt: string;
  riskModelVersion: string;
  serviceabilitySnapshotId: string | null;
  serviceabilitySchemaVersion: string | null;
  serviceabilityModelVersion: string | null;
  serviceabilityGeneratedAt: string | null;
  serviceabilityRefreshedAt: string | null;
};

export type PedestrianRiskProjectionServiceability = {
  zoneId: string;
  municipalCleaningServiceLevel: MunicipalCleaningServiceabilityZone["municipalCleaningServiceLevel"];
  geometryServiceabilityProxy: MunicipalCleaningServiceabilityZone["geometryServiceabilityProxy"];
  mechanizedCleaningAccessibility: MunicipalCleaningServiceabilityZone["mechanizedCleaningAccessibility"];
  manualCleaningLikely: MunicipalCleaningServiceabilityZone["manualCleaningLikely"];
  documentedCleaningFrequency: MunicipalCleaningServiceabilityZone["documentedCleaningFrequency"];
  serviceabilityConfidence: MunicipalCleaningServiceabilityZone["serviceabilityConfidence"];
  sourceEvidence: MunicipalCleaningServiceabilityZone["sourceEvidence"];
  observedAt: string | null;
  refreshedAt: string;
};

export type PedestrianRiskProjectionSegment = {
  projectionSegmentId: string;
  edgeKey: string;
  osmWayId: string;
  segmentIndex: number;
  direction: "forward" | "reverse";
  fromNodeId: string;
  toNodeId: string;
  lengthM: number;
  intersectionLengthM: number;
  coordinates: Coordinate[];
  midpoint: Coordinate;
  zoneId: string | null;
  intersectedZoneIds: string[];
  effectiveResolution: PedestrianRiskProjectionResolution;
  riskStatus: PedestrianRiskProjectionStatus;
  wasteRisk: number | null;
  cigaretteButtRisk: number | null;
  mixedRisk: number | null;
  wasteConfidence: ParisPressureRiskConfidence | null;
  cigaretteButtConfidence: ParisPressureRiskConfidence | null;
  wasteFactors: ParisPressureRiskScore | null;
  cigaretteButtFactors: ParisPressureRiskScore | null;
  availableFactors: {
    waste: string[];
    cigaretteButts: string[];
  };
  missingFactors: {
    waste: string[];
    cigaretteButts: string[];
  };
  serviceability: PedestrianRiskProjectionServiceability | null;
  sourceVersions: PedestrianRiskProjectionSourceVersions;
  provenance: ParisPressureProvenance[];
  notes: string[];
};

export type PedestrianRiskProjectionSnapshot = {
  schemaVersion: typeof PEDESTRIAN_RISK_PROJECTION_SCHEMA_VERSION;
  projectionKey: typeof PEDESTRIAN_RISK_PROJECTION_KEY;
  policyVersion: typeof PEDESTRIAN_RISK_PROJECTION_POLICY_VERSION;
  projectionVersionId: string | null;
  networkVersionId: string | null;
  sourceVersions: PedestrianRiskProjectionSourceVersions;
  generatedAt: string;
  counts: {
    sourceEdges: number;
    projectedSegments: number;
    predictedSegments: number;
    unavailableSegments: number;
    zonesIntersected: number;
  };
  segments: PedestrianRiskProjectionSegment[];
};

type ProjectionPart = {
  coordinates: Coordinate[];
  zone: ParisPressureZone | null;
  intersectedZoneIds: string[];
  resolution: PedestrianRiskProjectionResolution;
};

const EPSILON = 1e-10;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function pointOnSegment(
  point: readonly [number, number],
  start: readonly [number, number],
  end: readonly [number, number],
): boolean {
  const cross = (point[0] - start[0]) * (end[1] - start[1]) -
    (point[1] - start[1]) * (end[0] - start[0]);
  if (Math.abs(cross) > EPSILON) return false;
  return point[0] >= Math.min(start[0], end[0]) - EPSILON &&
    point[0] <= Math.max(start[0], end[0]) + EPSILON &&
    point[1] >= Math.min(start[1], end[1]) - EPSILON &&
    point[1] <= Math.max(start[1], end[1]) + EPSILON;
}

function pointInRing(
  point: readonly [number, number],
  ring: readonly (readonly [number, number])[],
): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]!;
    const prior = ring[previous]!;
    if (pointOnSegment(point, prior, current)) return true;
    const intersects =
      current[1] > point[1] !== prior[1] > point[1] &&
      point[0] < ((prior[0] - current[0]) * (point[1] - current[1])) /
        (prior[1] - current[1] || EPSILON) + current[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInZone(
  point: readonly [number, number],
  zone: ParisPressureZone,
): boolean {
  if (!zone.geometry) return false;
  const polygons = zone.geometry.type === "Polygon"
    ? [zone.geometry.coordinates]
    : zone.geometry.coordinates;
  return polygons.some((polygon) =>
    pointInRing(point, polygon[0] ?? []) &&
    !polygon.slice(1).some((hole) => pointInRing(point, hole)),
  );
}

function lineIntersectionParameter(
  start: readonly [number, number],
  end: readonly [number, number],
  boundaryStart: readonly [number, number],
  boundaryEnd: readonly [number, number],
): number | null {
  const r = [end[0] - start[0], end[1] - start[1]];
  const s = [boundaryEnd[0] - boundaryStart[0], boundaryEnd[1] - boundaryStart[1]];
  const denominator = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denominator) <= EPSILON) return null;
  const delta = [boundaryStart[0] - start[0], boundaryStart[1] - start[1]];
  const t = (delta[0] * s[1] - delta[1] * s[0]) / denominator;
  const u = (delta[0] * r[1] - delta[1] * r[0]) / denominator;
  return t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON
    ? Math.min(1, Math.max(0, t))
    : null;
}

type LonLat = readonly [number, number];
type PolygonRings = readonly (readonly LonLat[])[];

function zoneBoundaryRings(zone: ParisPressureZone): readonly PolygonRings[] {
  if (!zone.geometry) return [];
  return zone.geometry.type === "Polygon"
    ? [zone.geometry.coordinates as PolygonRings]
    : zone.geometry.coordinates;
}

function lineParametersForZones(
  start: readonly [number, number],
  end: readonly [number, number],
  zones: readonly ParisPressureZone[],
): number[] {
  const parameters = [0, 1];
  for (const zone of zones) {
    for (const polygon of zoneBoundaryRings(zone)) {
      for (const ring of polygon) {
        for (let index = 1; index < ring.length; index += 1) {
          const parameter = lineIntersectionParameter(start, end, ring[index - 1]!, ring[index]!);
          if (parameter !== null) parameters.push(parameter);
        }
      }
    }
  }
  return [...new Set(parameters.map((value) => Number(value.toFixed(12))))].sort((a, b) => a - b);
}

function interpolate(
  start: readonly [number, number],
  end: readonly [number, number],
  parameter: number,
): [number, number] {
  return [
    start[0] + (end[0] - start[0]) * parameter,
    start[1] + (end[1] - start[1]) * parameter,
  ];
}

function splitLinePart(
  start: Coordinate,
  end: Coordinate,
  zones: readonly ParisPressureZone[],
): ProjectionPart[] {
  const startLonLat: [number, number] = [start[1], start[0]];
  const endLonLat: [number, number] = [end[1], end[0]];
  const parameters = lineParametersForZones(startLonLat, endLonLat, zones);
  const parts: ProjectionPart[] = [];
  for (let index = 0; index < parameters.length - 1; index += 1) {
    const from = parameters[index]!;
    const to = parameters[index + 1]!;
    if (to - from <= EPSILON) continue;
    const midpoint = interpolate(startLonLat, endLonLat, (from + to) / 2);
    const matchingZones = zones.filter((zone) => pointInZone(midpoint, zone));
    const coordinates = [
      interpolate(startLonLat, endLonLat, from),
      interpolate(startLonLat, endLonLat, to),
    ].map(([longitude, latitude]) => [latitude, longitude] as Coordinate);
    parts.push({
      coordinates,
      zone: matchingZones.length === 1 ? matchingZones[0]! : null,
      intersectedZoneIds: matchingZones.map((zone) => zone.id).sort(),
      resolution: matchingZones.length === 1 ? "iris" : "unknown",
    });
  }
  return parts;
}

export function splitPedestrianEdgeByPressureZones(
  edge: PedestrianNetworkEdge,
  zones: readonly ParisPressureZone[],
): ProjectionPart[] {
  const parts: ProjectionPart[] = [];
  for (let index = 1; index < edge.coordinates.length; index += 1) {
    parts.push(...splitLinePart(edge.coordinates[index - 1]!, edge.coordinates[index]!, zones));
  }
  return parts;
}

function midpoint(coordinates: Coordinate[]): Coordinate {
  const first = coordinates[0]!;
  const last = coordinates[coordinates.length - 1]!;
  return [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2];
}

function stableSegmentId(edgeKey: string, index: number): string {
  return `${edgeKey}:risk:${String(index).padStart(3, "0")}`;
}

function serviceabilityForZone(
  zone: ParisPressureZone,
  snapshot: MunicipalCleaningServiceabilitySnapshot | null,
): PedestrianRiskProjectionServiceability | null {
  const source = snapshot?.zones.find((candidate) => candidate.id === zone.id);
  if (!source) return null;
  return {
    zoneId: source.id,
    municipalCleaningServiceLevel: source.municipalCleaningServiceLevel,
    geometryServiceabilityProxy: source.geometryServiceabilityProxy,
    mechanizedCleaningAccessibility: source.mechanizedCleaningAccessibility,
    manualCleaningLikely: source.manualCleaningLikely,
    documentedCleaningFrequency: source.documentedCleaningFrequency,
    serviceabilityConfidence: source.serviceabilityConfidence,
    sourceEvidence: source.sourceEvidence,
    observedAt: source.observedAt,
    refreshedAt: source.refreshedAt,
  };
}
function sourceVersions(
  graph: PedestrianNetworkImportResult,
  pressure: ParisPressureSnapshot,
  serviceability: MunicipalCleaningServiceabilitySnapshot | null,
): PedestrianRiskProjectionSourceVersions {
  return {
    networkKey: graph.networkKey,
    networkImporterVersion: graph.importerVersion,
    networkSourceSha256: graph.sourceSha256,
    networkSourceRetrievedAt: graph.sourceRetrievedAt,
    pressureSnapshotId: pressure.snapshotId,
    pressureSchemaVersion: pressure.schemaVersion,
    pressureGeneratedAt: pressure.generatedAt,
    pressureRefreshedAt: pressure.refreshedAt,
    riskModelVersion: PEDESTRIAN_RISK_MODEL_VERSION,
    serviceabilitySnapshotId: serviceability?.snapshotId ?? null,
    serviceabilitySchemaVersion: serviceability?.schemaVersion ?? null,
    serviceabilityModelVersion: serviceability?.predictionModelVersion ?? null,
    serviceabilityGeneratedAt: serviceability?.generatedAt ?? null,
    serviceabilityRefreshedAt: serviceability?.refreshedAt ?? null,
  };
}

function validateVersions(
  graph: PedestrianNetworkImportResult,
  pressure: ParisPressureSnapshot,
  serviceability: MunicipalCleaningServiceabilitySnapshot | null,
): void {
  if (graph.networkKey !== PEDESTRIAN_NETWORK_KEY || graph.importerVersion !== PEDESTRIAN_NETWORK_IMPORTER_VERSION) {
    throw new Error("Projection de risque: version du graphe piéton incompatible.");
  }
  if (pressure.schemaVersion !== PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION || pressure.geographicLevel !== "iris") {
    throw new Error("Projection de risque: snapshot de pression IRIS incompatible.");
  }
  if (serviceability && (
    serviceability.schemaVersion !== MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION ||
    serviceability.predictionModelVersion !== MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION ||
    serviceability.geographicLevel !== "iris"
  )) {
    throw new Error("Projection de risque: snapshot de serviceabilité incompatible.");
  }
}

function buildSegmentRisk(
  zone: ParisPressureZone | null,
  pressure: ParisPressureSnapshot,
  serviceability: MunicipalCleaningServiceabilitySnapshot | null,
  part: ProjectionPart,
  source: PedestrianRiskProjectionSourceVersions,
): Omit<PedestrianRiskProjectionSegment, "projectionSegmentId" | "edgeKey" | "osmWayId" | "segmentIndex" | "direction" | "fromNodeId" | "toNodeId"> {
  const lengthM = haversineMeters(part.coordinates[0]!, part.coordinates[1]!);
  if (!zone) {
    return {
      lengthM,
      intersectionLengthM: lengthM,
      coordinates: part.coordinates,
      midpoint: midpoint(part.coordinates),
      zoneId: null,
      intersectedZoneIds: part.intersectedZoneIds,
      effectiveResolution: "unknown",
      riskStatus: "unavailable",
      wasteRisk: null,
      cigaretteButtRisk: null,
      mixedRisk: null,
      wasteConfidence: null,
      cigaretteButtConfidence: null,
      wasteFactors: null,
      cigaretteButtFactors: null,
      availableFactors: { waste: [], cigaretteButts: [] },
      missingFactors: { waste: [], cigaretteButts: [] },
      serviceability: null,
      sourceVersions: source,
      provenance: pressure.sources,
      notes: part.intersectedZoneIds.length > 1
        ? ["Intersection de frontière IRIS ambiguë : aucun score n'est propagé."]
        : ["Aucune zone IRIS couvrante : le score reste indisponible."],
    };
  }

  const estimate = estimateParisPressureRisk(zone, pressure);
  const mixedRisk = Number(((estimate.wasteRisk + estimate.cigaretteButtRisk) / 2).toFixed(3));
  const serviceabilityProjection = serviceabilityForZone(zone, serviceability);
  const provenance = [
    ...estimate.provenance,
    ...(serviceabilityProjection?.sourceEvidence ?? []).map((evidence) => ({
      family: "cleanliness" as const,
      publisher: evidence.publisher,
      dataset: evidence.dataset,
      url: evidence.url,
      license: evidence.license,
      datasetVersion: evidence.datasetVersion,
      observedAt: evidence.observedAt,
      refreshedAt: evidence.refreshedAt,
      geographicLevel: "iris" as const,
      status: evidence.status,
      notes: evidence.notes,
    })),
  ];
  return {
    lengthM,
    intersectionLengthM: lengthM,
    coordinates: part.coordinates,
    midpoint: midpoint(part.coordinates),
    zoneId: zone.id,
    intersectedZoneIds: [zone.id],
    effectiveResolution: "iris",
    riskStatus: "predicted",
    wasteRisk: clamp(estimate.wasteRisk),
    cigaretteButtRisk: clamp(estimate.cigaretteButtRisk),
    mixedRisk,
    wasteConfidence: estimate.confidence.waste,
    cigaretteButtConfidence: estimate.confidence.cigaretteButts,
    wasteFactors: estimate.waste,
    cigaretteButtFactors: estimate.cigaretteButts,
    availableFactors: {
      waste: estimate.waste.contributions.filter((item) => item.available).map((item) => item.key),
      cigaretteButts: estimate.cigaretteButts.contributions.filter((item) => item.available).map((item) => item.key),
    },
    missingFactors: {
      waste: estimate.confidence.waste.missingFactors,
      cigaretteButts: estimate.confidence.cigaretteButts.missingFactors,
    },
    serviceability: serviceabilityProjection,
    sourceVersions: source,
    provenance,
    notes: [
      "Score théorique zonal ; aucune probabilité calibrée ni différenciation de rue non sourcée.",
      "Le mode mixte est la moyenne arithmétique exacte des deux familles disponibles.",
    ],
  };
}

export function buildPedestrianRiskProjection(input: {
  graph: PedestrianNetworkImportResult;
  pressureSnapshot: ParisPressureSnapshot;
  serviceabilitySnapshot?: MunicipalCleaningServiceabilitySnapshot | null;
  generatedAt?: string;
}): PedestrianRiskProjectionSnapshot {
  const serviceability = input.serviceabilitySnapshot ?? null;
  validateVersions(input.graph, input.pressureSnapshot, serviceability);
  const source = sourceVersions(input.graph, input.pressureSnapshot, serviceability);
  const segments: PedestrianRiskProjectionSegment[] = [];
  const zoneIds = new Set<string>();
  for (const edge of [...input.graph.edges].sort((left, right) => left.edgeKey.localeCompare(right.edgeKey))) {
    const parts = splitPedestrianEdgeByPressureZones(edge, input.pressureSnapshot.zones);
    for (const part of parts) {
      const risk = buildSegmentRisk(
        part.zone,
        input.pressureSnapshot,
        serviceability,
        part,
        source,
      );
      if (part.zone) zoneIds.add(part.zone.id);
      segments.push({
        ...risk,
        projectionSegmentId: stableSegmentId(edge.edgeKey, segments.length),
        edgeKey: edge.edgeKey,
        osmWayId: edge.osmWayId,
        segmentIndex: edge.segmentIndex,
        direction: edge.direction,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
      });
    }
  }
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: PEDESTRIAN_RISK_PROJECTION_SCHEMA_VERSION,
    projectionKey: PEDESTRIAN_RISK_PROJECTION_KEY,
    policyVersion: PEDESTRIAN_RISK_PROJECTION_POLICY_VERSION,
    projectionVersionId: null,
    networkVersionId: null,
    sourceVersions: source,
    generatedAt,
    counts: {
      sourceEdges: input.graph.edges.length,
      projectedSegments: segments.length,
      predictedSegments: segments.filter((segment) => segment.riskStatus === "predicted").length,
      unavailableSegments: segments.filter((segment) => segment.riskStatus === "unavailable").length,
      zonesIntersected: zoneIds.size,
    },
    segments,
  };
}
