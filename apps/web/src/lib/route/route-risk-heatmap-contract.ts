import type {
  PedestrianRiskProjectionSegment,
  PedestrianRiskProjectionSnapshot,
} from "@/lib/geo/pedestrian-risk-projection";
import type { RouteRiskFocus } from "./route-target-contract";

export const ROUTE_RISK_HEATMAP_SCHEMA_VERSION =
  "route-risk-heatmap-v1" as const;

export type RouteRiskHeatmapCategory = "waste" | "cigaretteButts" | "mixed";

export type RouteRiskHeatmapSegment = Pick<
  PedestrianRiskProjectionSegment,
  | "projectionSegmentId"
  | "coordinates"
  | "lengthM"
  | "zoneId"
  | "intersectedZoneIds"
  | "effectiveResolution"
  | "riskStatus"
  | "wasteRisk"
  | "cigaretteButtRisk"
  | "mixedRisk"
  | "wasteConfidence"
  | "cigaretteButtConfidence"
  | "sourceVersions"
  | "provenance"
  | "notes"
>;

export type RouteRiskHeatmap = {
  schemaVersion: typeof ROUTE_RISK_HEATMAP_SCHEMA_VERSION;
  projectionKey: PedestrianRiskProjectionSnapshot["projectionKey"];
  projectionVersionId: string | null;
  networkVersionId: string | null;
  generatedAt: string;
  sourceVersions: PedestrianRiskProjectionSnapshot["sourceVersions"];
  counts: PedestrianRiskProjectionSnapshot["counts"];
  segments: RouteRiskHeatmapSegment[];
};

export type RoutePlannerRiskContext = {
  schemaVersion: "route-planner-risk-context-v1";
  riskFocus: RouteRiskFocus;
  source: "materialized_pedestrian_risk_projection";
  modelVersion: string | null;
  projectionKey: string | null;
  projectionVersionId: string | null;
  networkVersionId: string | null;
  predictionStatus: "available" | "partial" | "unavailable";
  consideredSegments: number;
  selectedSegments: number;
  generatedAt: string | null;
};

export function buildRouteRiskHeatmap(
  projection: PedestrianRiskProjectionSnapshot | null | undefined,
): RouteRiskHeatmap | undefined {
  if (!projection || projection.segments.length === 0) return undefined;
  return {
    schemaVersion: ROUTE_RISK_HEATMAP_SCHEMA_VERSION,
    projectionKey: projection.projectionKey,
    projectionVersionId: projection.projectionVersionId,
    networkVersionId: projection.networkVersionId,
    generatedAt: projection.generatedAt,
    sourceVersions: structuredClone(projection.sourceVersions),
    counts: { ...projection.counts },
    segments: projection.segments.map((segment) => ({
      projectionSegmentId: segment.projectionSegmentId,
      coordinates: segment.coordinates.map((coordinate) => [...coordinate] as [number, number]),
      lengthM: segment.lengthM,
      zoneId: segment.zoneId,
      intersectedZoneIds: [...segment.intersectedZoneIds],
      effectiveResolution: segment.effectiveResolution,
      riskStatus: segment.riskStatus,
      wasteRisk: segment.wasteRisk,
      cigaretteButtRisk: segment.cigaretteButtRisk,
      mixedRisk: segment.mixedRisk,
      wasteConfidence: segment.wasteConfidence,
      cigaretteButtConfidence: segment.cigaretteButtConfidence,
      sourceVersions: structuredClone(segment.sourceVersions),
      provenance: structuredClone(segment.provenance),
      notes: [...segment.notes],
    })),
  };
}
