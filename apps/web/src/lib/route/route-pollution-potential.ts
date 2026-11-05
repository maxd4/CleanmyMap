import type {
  PedestrianRiskProjectionSegment,
  PedestrianRiskProjectionSnapshot,
} from "@/lib/geo/pedestrian-risk-projection";
import type { Coordinate } from "./pedestrian-network";
import type { RoutePlannerCandidate } from "./route-planner";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { RouteTopology } from "./route-contract";

export const ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION =
  "route-pollution-potential-v1" as const;
export const ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION =
  "route-pollution-reference-catalog-v1" as const;
export const ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION =
  "route-pollution-potential-comparison-v1" as const;

export type RoutePollutionPotentialCategory = "waste" | "cigaretteButts" | "mixed";
export type RoutePollutionPotentialStatus = "available" | "partial" | "unavailable";
export type RoutePollutionReferenceKind =
  | "historical_action_score_100"
  | "theoretical_network";

export type RoutePollutionPotentialConfidence = {
  level: "high" | "medium" | "low" | "unknown";
  score: number | null;
  source: "segment_projection" | "unavailable";
};

export type RoutePollutionPotentialCategoryResult = {
  value: number | null;
  /** Weighted segment projection before relative reference normalization. */
  rawProjectionIndex: number | null;
  status: RoutePollutionPotentialStatus;
  uniqueSegmentCount: number;
  availableSegmentCount: number;
  collectionLengthM: number;
  coveredLengthM: number;
  coverageRatio: number | null;
  confidence: RoutePollutionPotentialConfidence;
  missingReasons: string[];
};

export type RoutePollutionPotentialIndex = {
  value: number | null;
  status: RoutePollutionPotentialStatus;
  categories: {
    waste: RoutePollutionPotentialCategoryResult;
    cigaretteButts: RoutePollutionPotentialCategoryResult;
    mixed: RoutePollutionPotentialCategoryResult;
  };
  uniqueSegmentCount: number;
  collectionLengthM: number;
  coveredLengthM: number;
  coverageRatio: number | null;
  confidence: RoutePollutionPotentialConfidence;
  missingCategories: RoutePollutionPotentialCategory[];
  limitations: string[];
};

export type RoutePollutionReferenceComparison = {
  pickupPreference: RoutePickupPreference;
  routeTopology: RouteTopology;
  travelBudgetMinutes: number;
  usefulCollectionLengthM: number;
};

export type RoutePollutionReference = {
  id: string;
  label: string;
  kind: RoutePollutionReferenceKind;
  comparison: RoutePollutionReferenceComparison;
  segmentIds: string[];
  rawProjectionIndex: {
    waste: number | null;
    cigaretteButts: number | null;
    mixed: number | null;
  };
  strength: number | null;
  realizable: true;
  historicalScore: 100 | null;
  measurementMethods: string[];
  provenance: string[];
  limitations: string[];
};

export type RoutePollutionReferenceCatalog = {
  schemaVersion: typeof ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION;
  generatedAt: string;
  projection: {
    schemaVersion: PedestrianRiskProjectionSnapshot["schemaVersion"];
    projectionKey: PedestrianRiskProjectionSnapshot["projectionKey"];
    projectionVersionId: string | null;
    networkVersionId: string | null;
    riskModelVersion: string;
  };
  references: RoutePollutionReference[];
  diagnostics: {
    historicalConsidered: number;
    historicalAdmitted: number;
    historicalExcluded: Array<{ id: string; reason: string }>;
    theoreticalConsidered: number;
    theoreticalAdmitted: number;
  };
  provenance: string[];
};

type ReferenceGeometryInput = {
  coordinates: readonly Coordinate[];
  /** Canonical directed network edge sequence attesting the traversed path. */
  edgeKeys: readonly string[];
  source: "planner_snapshot" | "operational_route";
  mode: "network";
};

type HistoricalMeasurement = {
  value: number | null;
  methodVersion: string | null;
  provenance: string;
};

export type RouteHistoricalPollutionReferenceInput = {
  id: string;
  label: string;
  historicalScore: number | null;
  comparison: RoutePollutionReferenceComparison;
  geometry: ReferenceGeometryInput;
  collectionSegmentIds: readonly string[];
  measurements: {
    waste: HistoricalMeasurement;
    cigaretteButts: HistoricalMeasurement;
  };
  provenance: string[];
};

export type RouteTheoreticalPollutionReferenceInput = {
  id: string;
  label: string;
  comparison: RoutePollutionReferenceComparison;
  geometry: ReferenceGeometryInput;
  collectionSegmentIds: readonly string[];
  provenance: string[];
};

export type RoutePollutionPotentialGroupInput = {
  groupIndex: number;
  candidateIds: readonly string[];
  volunteerCount: number;
  travelBudgetMinutes: number;
};

export type RoutePollutionPotentialRouteInput = {
  projection: PedestrianRiskProjectionSnapshot | null | undefined;
  candidates: readonly RoutePlannerCandidate[];
  groups: readonly RoutePollutionPotentialGroupInput[];
  pickupPreference: RoutePickupPreference;
  routeTopology: RouteTopology;
  travelBudgetMinutes: number;
  usefulCollectionLengthM?: number | null;
  referenceCatalog?: RoutePollutionReferenceCatalog | null;
};

export type RoutePollutionPotentialGroup = {
  groupIndex: number;
  volunteerCount: number;
  index: RoutePollutionPotentialIndex;
};

export type RoutePollutionPotential = {
  schemaVersion: typeof ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION;
  status: RoutePollutionPotentialStatus;
  value: number | null;
  selectedCategory: RoutePollutionPotentialCategory;
  global: RoutePollutionPotentialIndex;
  groups: RoutePollutionPotentialGroup[];
  reference: {
    id: string;
    label: string;
    kind: RoutePollutionReferenceKind;
    historicalScore: 100 | null;
    comparison: RoutePollutionReferenceComparison;
    provenance: string[];
  } | null;
  coverage: {
    uniqueSegmentCount: number;
    collectionLengthM: number;
    coveredLengthM: number;
    coverageRatio: number | null;
    groupCount: number;
  };
  confidence: RoutePollutionPotentialConfidence;
  version: {
    potentialSchemaVersion: typeof ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION;
    referenceCatalogSchemaVersion: typeof ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION | null;
    projectionSchemaVersion: string | null;
    projectionVersionId: string | null;
    networkVersionId: string | null;
    riskModelVersion: string | null;
  };
  provenance: string[];
  limitations: string[];
};

type Category = "waste" | "cigaretteButts";
type CategoryValues = Record<Category, number | null>;
type SegmentStats = {
  uniqueSegmentCount: number;
  collectionLengthM: number;
  values: CategoryValues;
  coveredLengthM: Record<Category, number>;
  availableSegmentCount: Record<Category, number>;
  confidenceScore: Record<Category, number | null>;
};

const ROUTE_REFERENCE_LENGTH_TOLERANCE = 0.25;
const ROUTE_REFERENCE_BUDGET_TOLERANCE_MINUTES = 5;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}
function finitePositive(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value! : null;
}
function validCoordinate(coordinate: readonly number[]): coordinate is Coordinate {
  return coordinate.length === 2 && coordinate.every((value) => Number.isFinite(value));
}
function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => id.trim().length > 0))].sort();
}
function projectionSegmentMap(
  projection: PedestrianRiskProjectionSnapshot,
): Map<string, PedestrianRiskProjectionSegment> {
  return new Map(projection.segments.map((segment) => [segment.projectionSegmentId, segment]));
}
function weightedSegmentStats(
  segmentIds: readonly string[],
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): SegmentStats {
  const ids = uniqueIds(segmentIds);
  const values: CategoryValues = { waste: null, cigaretteButts: null };
  const weightedTotals: Record<Category, number> = { waste: 0, cigaretteButts: 0 };
  const coveredLengthM: Record<Category, number> = { waste: 0, cigaretteButts: 0 };
  const availableSegmentCount: Record<Category, number> = { waste: 0, cigaretteButts: 0 };
  const confidenceTotals: Record<Category, number> = { waste: 0, cigaretteButts: 0 };
  const confidenceLengths: Record<Category, number> = { waste: 0, cigaretteButts: 0 };
  let collectionLengthM = 0;
  let validSegmentCount = 0;

  for (const id of ids) {
    const segment = segments.get(id);
    const lengthM = finitePositive(segment?.lengthM);
    if (!segment || lengthM === null) continue;
    validSegmentCount += 1;
    collectionLengthM += lengthM;
    for (const category of ["waste", "cigaretteButts"] as const) {
      const risk = category === "waste" ? segment.wasteRisk : segment.cigaretteButtRisk;
      const confidence = category === "waste" ? segment.wasteConfidence : segment.cigaretteButtConfidence;
      if (segment.riskStatus !== "predicted" || risk === null || !Number.isFinite(risk)) continue;
      weightedTotals[category] += risk * lengthM;
      coveredLengthM[category] += lengthM;
      availableSegmentCount[category] += 1;
      if (confidence && Number.isFinite(confidence.score)) {
        confidenceTotals[category] += confidence.score * lengthM;
        confidenceLengths[category] += lengthM;
      }
    }
  }

  for (const category of ["waste", "cigaretteButts"] as const) {
    if (coveredLengthM[category] > 0) values[category] = weightedTotals[category] / coveredLengthM[category];
  }
  return {
    uniqueSegmentCount: validSegmentCount,
    collectionLengthM,
    values,
    coveredLengthM,
    availableSegmentCount,
    confidenceScore: {
      waste: confidenceLengths.waste > 0 ? confidenceTotals.waste / confidenceLengths.waste : null,
      cigaretteButts: confidenceLengths.cigaretteButts > 0 ? confidenceTotals.cigaretteButts / confidenceLengths.cigaretteButts : null,
    },
  };
}
function mixedValue(values: CategoryValues): number | null {
  const available = Object.values(values).filter((value): value is number => value !== null);
  return available.length > 0 ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}
function confidenceFor(score: number | null): RoutePollutionPotentialConfidence {
  if (score === null) return { level: "unknown", score: null, source: "unavailable" };
  const normalizedScore = round(clamp(score, 0, 1), 3);
  return {
    level: normalizedScore >= 0.75 ? "high" : normalizedScore >= 0.5 ? "medium" : "low",
    score: normalizedScore,
    source: "segment_projection",
  };
}
function combineConfidence(
  values: readonly RoutePollutionPotentialCategoryResult[],
): RoutePollutionPotentialConfidence {
  const available = values.filter((item) => item.confidence.score !== null);
  if (available.length === 0) return confidenceFor(null);
  return confidenceFor(available.reduce((sum, item) => sum + (item.confidence.score ?? 0), 0) / available.length);
}
function relativeValue(raw: number | null, reference: number | null): number | null {
  if (raw === null || reference === null || reference <= 0) return null;
  return round(clamp((raw / reference) * 100));
}
function categoryResult(
  category: Category,
  stats: SegmentStats,
  reference: RoutePollutionReference | null,
  reasonWhenUnavailable: string,
): RoutePollutionPotentialCategoryResult {
  const rawProjectionIndex = stats.values[category];
  const coveredLengthM = stats.coveredLengthM[category];
  const coverageRatio = stats.collectionLengthM > 0 ? round(coveredLengthM / stats.collectionLengthM, 4) : null;
  const missingReasons: string[] = [];
  if (stats.uniqueSegmentCount === 0) missingReasons.push("no_unique_collection_segments");
  if (rawProjectionIndex === null) missingReasons.push(reasonWhenUnavailable);
  if (rawProjectionIndex !== null && !reference) missingReasons.push("reference_catalog_unavailable");
  if (rawProjectionIndex !== null && reference && reference.rawProjectionIndex[category] === null) {
    missingReasons.push("reference_category_unavailable");
  }
  const value = relativeValue(rawProjectionIndex, reference?.rawProjectionIndex[category] ?? null);
  const status: RoutePollutionPotentialStatus = value === null
    ? "unavailable"
    : coverageRatio !== null && coverageRatio < 1
      ? "partial"
      : "available";
  return {
    value,
    rawProjectionIndex: rawProjectionIndex === null ? null : round(rawProjectionIndex),
    status,
    uniqueSegmentCount: stats.uniqueSegmentCount,
    availableSegmentCount: stats.availableSegmentCount[category],
    collectionLengthM: round(stats.collectionLengthM),
    coveredLengthM: round(coveredLengthM),
    coverageRatio,
    confidence: confidenceFor(stats.confidenceScore[category]),
    missingReasons: [...new Set(missingReasons)],
  };
}
function buildIndex(
  segmentIds: readonly string[],
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
  reference: RoutePollutionReference | null,
  limitations: readonly string[],
  selectedCategory: RoutePollutionPotentialCategory,
): RoutePollutionPotentialIndex {
  const stats = weightedSegmentStats(segmentIds, segments);
  const waste = categoryResult("waste", stats, reference, "waste_category_missing_on_collection_segments");
  const cigaretteButts = categoryResult("cigaretteButts", stats, reference, "cigarette_butts_category_missing_on_collection_segments");
  const mixedRaw = mixedValue({ waste: stats.values.waste, cigaretteButts: stats.values.cigaretteButts });
  const normalizedMixedValue = mixedValue({ waste: waste.value, cigaretteButts: cigaretteButts.value });
  const mixed: RoutePollutionPotentialCategoryResult = {
    value: normalizedMixedValue,
    rawProjectionIndex: mixedRaw === null ? null : round(mixedRaw),
    status: normalizedMixedValue === null
      ? "unavailable"
      : waste.status === "partial" || cigaretteButts.status === "partial" || waste.status === "unavailable" || cigaretteButts.status === "unavailable"
        ? "partial"
        : "available",
    uniqueSegmentCount: stats.uniqueSegmentCount,
    availableSegmentCount: Math.max(waste.availableSegmentCount, cigaretteButts.availableSegmentCount),
    collectionLengthM: round(stats.collectionLengthM),
    coveredLengthM: round(Math.max(waste.coveredLengthM, cigaretteButts.coveredLengthM)),
    coverageRatio: stats.collectionLengthM > 0
      ? round(Math.max(waste.coveredLengthM, cigaretteButts.coveredLengthM) / stats.collectionLengthM, 4)
      : null,
    confidence: combineConfidence([waste, cigaretteButts]),
    missingReasons: [
      ...(waste.value === null ? ["waste_category_missing"] : []),
      ...(cigaretteButts.value === null ? ["cigarette_butts_category_missing"] : []),
      ...(reference ? [] : ["reference_catalog_unavailable"]),
    ],
  };
  const categories = { waste, cigaretteButts, mixed };
  const missingCategories = (Object.entries(categories) as Array<[RoutePollutionPotentialCategory, RoutePollutionPotentialCategoryResult]>)
    .filter(([, result]) => result.value === null)
    .map(([category]) => category);
  const selectedResult = categories[selectedCategory];
  const value = selectedResult.value;
  return {
    value,
    status: selectedResult.status,
    categories,
    uniqueSegmentCount: stats.uniqueSegmentCount,
    collectionLengthM: round(stats.collectionLengthM),
    coveredLengthM: round(Math.max(waste.coveredLengthM, cigaretteButts.coveredLengthM)),
    coverageRatio: stats.collectionLengthM > 0
      ? round(Math.max(waste.coveredLengthM, cigaretteButts.coveredLengthM) / stats.collectionLengthM, 4)
      : null,
    confidence: selectedResult.confidence,
    missingCategories,
    limitations: [...new Set(limitations)],
  };
}
function referenceStrength(values: CategoryValues, preference: RoutePickupPreference): number | null {
  const relevant = preference === "waste"
    ? [values.waste]
    : preference === "cigarette_butts"
      ? [values.cigaretteButts]
      : [values.waste, values.cigaretteButts];
  const available = relevant.filter((value): value is number => value !== null);
  if (available.length === 0) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}
function referenceCategoryValues(
  segmentIds: readonly string[],
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): CategoryValues {
  const stats = weightedSegmentStats(segmentIds, segments);
  return stats.values;
}
function networkPathIsDirectedAndContinuous(
  geometry: ReferenceGeometryInput,
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): boolean {
  if (geometry.edgeKeys.length === 0) return false;
  const edges = geometry.edgeKeys.map((edgeKey) => [...segments.values()].find((candidate) => candidate.edgeKey === edgeKey));
  if (edges.some((edge) => !edge || edge.riskStatus !== "predicted" || !finitePositive(edge.lengthM))) return false;
  return edges.every((edge, index) => index === 0 || edges[index - 1]!.toNodeId === edge!.fromNodeId);
}
function geometryFollowsEdgeSequence(
  geometry: ReferenceGeometryInput,
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): boolean {
  const matches = (left: readonly number[], right: readonly number[]) =>
    Math.abs(left[0] - right[0]) <= 1e-6 && Math.abs(left[1] - right[1]) <= 1e-6;
  let cursor = 0;
  for (const edgeKey of geometry.edgeKeys) {
    const segment = [...segments.values()].find((candidate) => candidate.edgeKey === edgeKey);
    if (!segment) return false;
    const start = geometry.coordinates.findIndex((_, index) => index >= cursor && segment.coordinates.every((coordinate, offset) => matches(geometry.coordinates[index + offset] ?? [], coordinate)));
    if (start < 0) return false;
    cursor = start + segment.coordinates.length - 1;
  }
  return true;
}
function selectedSegmentsFollowPath(
  geometry: ReferenceGeometryInput,
  segmentIds: readonly string[],
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): boolean {
  let edgeIndex = 0;
  return segmentIds.every((segmentId) => {
    const segment = segments.get(segmentId);
    const nextIndex = segment ? geometry.edgeKeys.indexOf(segment.edgeKey, edgeIndex) : -1;
    if (nextIndex < 0) return false;
    edgeIndex = nextIndex + 1;
    return true;
  });
}
function validReferenceGeometry(
  geometry: ReferenceGeometryInput,
  segmentIds: readonly string[],
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
  usefulCollectionLengthM: number,
): boolean {
  if (geometry.mode !== "network" || geometry.coordinates.length < 2 || !geometry.coordinates.every(validCoordinate) || !Array.isArray(geometry.edgeKeys) || !geometry.edgeKeys.every((edgeKey) => typeof edgeKey === "string" && edgeKey.length > 0)) return false;
  const pathValid = networkPathIsDirectedAndContinuous(geometry, segments);
  const selectedValid = selectedSegmentsFollowPath(geometry, segmentIds, segments);
  if (!pathValid || !selectedValid || !geometryFollowsEdgeSequence(geometry, segments)) return false;
  const mappedSegments = segmentIds.map((id) => segments.get(id));
  if (mappedSegments.some((segment) => !segment || segment.riskStatus !== "predicted" || !finitePositive(segment.lengthM))) return false;
  const segmentLength = mappedSegments.reduce((sum, segment) => sum + (segment?.lengthM ?? 0), 0);
  return Math.abs(segmentLength - usefulCollectionLengthM) / Math.max(segmentLength, usefulCollectionLengthM, 1) <= ROUTE_REFERENCE_LENGTH_TOLERANCE;
}
function validComparison(comparison: RoutePollutionReferenceComparison): boolean {
  return Number.isFinite(comparison.travelBudgetMinutes) && comparison.travelBudgetMinutes > 0 &&
    Number.isFinite(comparison.usefulCollectionLengthM) && comparison.usefulCollectionLengthM > 0;
}
function makeReference(
  input: {
    id: string;
    label: string;
    kind: RoutePollutionReferenceKind;
    comparison: RoutePollutionReferenceComparison;
    geometry: ReferenceGeometryInput;
    collectionSegmentIds: readonly string[];
    historicalScore: 100 | null;
    measurementMethods: string[];
    provenance: string[];
    limitations: string[];
  },
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): RoutePollutionReference | null {
  const segmentIds = [...input.collectionSegmentIds];
  if (!validComparison(input.comparison) || segmentIds.length === 0 || segmentIds.length !== input.collectionSegmentIds.length || !validReferenceGeometry(input.geometry, segmentIds, segments, input.comparison.usefulCollectionLengthM)) return null;
  const rawProjectionIndex = referenceCategoryValues(segmentIds, segments);
  if (referenceStrength(rawProjectionIndex, input.comparison.pickupPreference) === null) return null;
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    comparison: { ...input.comparison },
    segmentIds,
    rawProjectionIndex: {
      waste: rawProjectionIndex.waste === null ? null : round(rawProjectionIndex.waste),
      cigaretteButts: rawProjectionIndex.cigaretteButts === null ? null : round(rawProjectionIndex.cigaretteButts),
      mixed: mixedValue(rawProjectionIndex) === null ? null : round(mixedValue(rawProjectionIndex)!),
    },
    strength: referenceStrength(rawProjectionIndex, input.comparison.pickupPreference),
    realizable: true,
    historicalScore: input.historicalScore,
    measurementMethods: [...new Set(input.measurementMethods)],
    provenance: [...new Set(input.provenance)],
    limitations: [...new Set(input.limitations)],
  };
}
function historicalExclusion(
  input: RouteHistoricalPollutionReferenceInput,
  segments: ReadonlyMap<string, PedestrianRiskProjectionSegment>,
): string | null {
  if (input.historicalScore !== 100) return "historical_score_is_not_100";
  if (!validComparison(input.comparison)) return "comparison_dimensions_missing";
  const segmentIds = [...input.collectionSegmentIds];
  const requiredMeasurements: HistoricalMeasurement[] = input.comparison.pickupPreference === "waste"
    ? [input.measurements.waste]
    : input.comparison.pickupPreference === "cigarette_butts"
      ? [input.measurements.cigaretteButts]
      : [input.measurements.waste, input.measurements.cigaretteButts];
  if (requiredMeasurements.some((measurement) => measurement.value === null || !Number.isFinite(measurement.value))) {
    return "required_measurement_missing";
  }
  if (requiredMeasurements.some((measurement) => measurement.methodVersion !== ROUTE_POLLUTION_REFERENCE_COMPARISON_METHOD_VERSION)) {
    return "measurement_method_not_homogeneous";
  }
  if (segmentIds.length === 0 || segmentIds.length !== input.collectionSegmentIds.length || !validReferenceGeometry(input.geometry, segmentIds, segments, input.comparison.usefulCollectionLengthM)) return "collection_geometry_not_mapped_to_network";
  return null;
}

export function buildRoutePollutionReferenceCatalog(input: {
  projection: PedestrianRiskProjectionSnapshot;
  historicalReferences?: readonly RouteHistoricalPollutionReferenceInput[];
  theoreticalReferences: readonly RouteTheoreticalPollutionReferenceInput[];
  generatedAt: string;
}): RoutePollutionReferenceCatalog {
  const segments = projectionSegmentMap(input.projection);
  const references: RoutePollutionReference[] = [];
  const historicalExcluded: Array<{ id: string; reason: string }> = [];
  for (const historical of input.historicalReferences ?? []) {
    const reason = historicalExclusion(historical, segments);
    if (reason) {
      historicalExcluded.push({ id: historical.id, reason });
      continue;
    }
    const reference = makeReference({
      id: historical.id,
      label: historical.label,
      kind: "historical_action_score_100",
      comparison: historical.comparison,
      geometry: historical.geometry,
      collectionSegmentIds: historical.collectionSegmentIds,
      historicalScore: 100,
      measurementMethods: [
        historical.measurements.waste.methodVersion,
        historical.measurements.cigaretteButts.methodVersion,
      ].filter((value): value is string => Boolean(value)),
      provenance: historical.provenance,
      limitations: ["Le score historique 100 qualifie la référence ; il n'est pas converti en risque spatial."],
    }, segments);
    if (reference) references.push(reference);
    else historicalExcluded.push({ id: historical.id, reason: "projection_reference_not_admissible" });
  }
  let theoreticalAdmitted = 0;
  for (const theoretical of input.theoreticalReferences) {
    const reference = makeReference({
      id: theoretical.id,
      label: theoretical.label,
      kind: "theoretical_network",
      comparison: theoretical.comparison,
      geometry: theoretical.geometry,
      collectionSegmentIds: theoretical.collectionSegmentIds,
      historicalScore: null,
      measurementMethods: [],
      provenance: theoretical.provenance,
      limitations: ["Référence issue du réseau et de la projection pré-calculés ; aucune mesure terrain n'est inférée."],
    }, segments);
    if (reference) {
      references.push(reference);
      theoreticalAdmitted += 1;
    }
  }
  return {
    schemaVersion: ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION,
    generatedAt: new Date(input.generatedAt).toISOString(),
    projection: {
      schemaVersion: input.projection.schemaVersion,
      projectionKey: input.projection.projectionKey,
      projectionVersionId: input.projection.projectionVersionId,
      networkVersionId: input.projection.networkVersionId,
      riskModelVersion: input.projection.sourceVersions.riskModelVersion,
    },
    references,
    diagnostics: {
      historicalConsidered: input.historicalReferences?.length ?? 0,
      historicalAdmitted: references.filter((reference) => reference.kind === "historical_action_score_100").length,
      historicalExcluded,
      theoreticalConsidered: input.theoreticalReferences.length,
      theoreticalAdmitted,
    },
    provenance: [
      `projection:${input.projection.projectionKey}`,
      `risk-model:${input.projection.sourceVersions.riskModelVersion}`,
      "Les mesures historiques servent uniquement à qualifier une référence homogène.",
    ],
  };
}
function comparableReference(
  reference: RoutePollutionReference,
  input: Pick<RoutePollutionPotentialRouteInput, "pickupPreference" | "routeTopology" | "travelBudgetMinutes" | "usefulCollectionLengthM"> & {
    availableCategories?: ReadonlyArray<"waste" | "cigaretteButts">;
  },
): boolean {
  if (reference.comparison.pickupPreference !== input.pickupPreference || reference.comparison.routeTopology !== input.routeTopology) return false;
  const budgetDelta = Math.abs(reference.comparison.travelBudgetMinutes - input.travelBudgetMinutes);
  if (budgetDelta > Math.max(ROUTE_REFERENCE_BUDGET_TOLERANCE_MINUTES, input.travelBudgetMinutes * ROUTE_REFERENCE_LENGTH_TOLERANCE)) return false;
  if (input.usefulCollectionLengthM === null || input.usefulCollectionLengthM === undefined) return true;
  const referenceLength = reference.comparison.usefulCollectionLengthM;
  const ratio = Math.abs(referenceLength - input.usefulCollectionLengthM) / Math.max(referenceLength, input.usefulCollectionLengthM, 1);
  if (ratio > ROUTE_REFERENCE_LENGTH_TOLERANCE) return false;
  if (!input.availableCategories) return true;
  if (input.pickupPreference !== "balanced") {
    const selectedCategory = input.pickupPreference === "waste" ? "waste" : "cigaretteButts";
    return reference.rawProjectionIndex[selectedCategory] !== null;
  }
  const referenceCategories = (["waste", "cigaretteButts"] as const).filter((category) => reference.rawProjectionIndex[category] !== null);
  return referenceCategories.length === input.availableCategories.length && referenceCategories.every((category, index) => category === input.availableCategories?.[index]);
}
function catalogMatchesProjection(
  catalog: RoutePollutionReferenceCatalog,
  projection: PedestrianRiskProjectionSnapshot,
): boolean {
  return catalog.projection.schemaVersion === projection.schemaVersion &&
    catalog.projection.projectionKey === projection.projectionKey &&
    catalog.projection.projectionVersionId === projection.projectionVersionId &&
    catalog.projection.networkVersionId === projection.networkVersionId &&
    catalog.projection.riskModelVersion === projection.sourceVersions.riskModelVersion;
}
export function selectRoutePollutionReference(
  catalog: RoutePollutionReferenceCatalog | null | undefined,
  input: Pick<RoutePollutionPotentialRouteInput, "pickupPreference" | "routeTopology" | "travelBudgetMinutes" | "usefulCollectionLengthM"> & {
    availableCategories?: ReadonlyArray<"waste" | "cigaretteButts">;
  },
): RoutePollutionReference | null {
  if (!catalog || catalog.schemaVersion !== ROUTE_POLLUTION_REFERENCE_CATALOG_SCHEMA_VERSION) return null;
  const compatible = catalog.references.filter((reference) => comparableReference(reference, input));
  return compatible.sort((left, right) => {
    const historicalRank = Number(right.kind === "historical_action_score_100") - Number(left.kind === "historical_action_score_100");
    if (historicalRank !== 0) return historicalRank;
    return (right.strength ?? -1) - (left.strength ?? -1) || left.id.localeCompare(right.id);
  })[0] ?? null;
}
function selectedSegmentIds(
  groups: readonly RoutePollutionPotentialGroupInput[],
  candidates: readonly RoutePlannerCandidate[],
): string[][] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return groups.map((group) => uniqueIds(group.candidateIds.flatMap((id) => {
    const candidate = byId.get(id);
    return candidate?.family === "predicted" && candidate.evidence.segmentId ? [candidate.evidence.segmentId] : [];
  })));
}
function indexLimitations(
  route: RoutePollutionPotentialRouteInput,
  reference: RoutePollutionReference | null,
  catalogMatches: boolean,
): string[] {
  const limitations = [
    "Indice théorique relatif à une référence, pas une probabilité ni une quantité mesurée.",
    "scoreBreakdown.priority et les scores historiques des actions restent inchangés.",
    "Les segments sont comptés une seule fois par identifiant de projection ; les liaisons et passages répétés ne sont pas valorisés.",
  ];
  if (!route.projection) limitations.push("Projection piétonne absente.");
  if (!route.referenceCatalog) limitations.push("Catalogue de références pré-calculé absent.");
  if (route.referenceCatalog && !catalogMatches) limitations.push("Catalogue de références incompatible avec le snapshot de projection.");
  if (!reference) limitations.push("Aucune référence homogène et réalisable n'est disponible pour ces dimensions.");
  return limitations;
}
export function buildRoutePollutionPotential(
  input: RoutePollutionPotentialRouteInput,
): RoutePollutionPotential {
  const projection = input.projection;
  const segments = projection ? projectionSegmentMap(projection) : new Map<string, PedestrianRiskProjectionSegment>();
  const idsByGroup = selectedSegmentIds(input.groups, input.candidates);
  const allSegmentIds = uniqueIds(idsByGroup.flat());
  const usefulCollectionLengthM = input.usefulCollectionLengthM ?? weightedSegmentStats(allSegmentIds, segments).collectionLengthM;
  const routeValues = weightedSegmentStats(allSegmentIds, segments).values;
  const availableCategories = input.pickupPreference === "balanced"
    ? (["waste", "cigaretteButts"] as const).filter((category) => routeValues[category] !== null)
    : [input.pickupPreference === "waste" ? "waste" : "cigaretteButts"] as const;
  const selectedCategory: RoutePollutionPotentialCategory = input.pickupPreference === "waste"
    ? "waste"
    : input.pickupPreference === "cigarette_butts"
      ? "cigaretteButts"
      : "mixed";
  const catalogMatches = Boolean(
    input.referenceCatalog && projection && catalogMatchesProjection(input.referenceCatalog, projection),
  );
  const usableCatalog = catalogMatches ? input.referenceCatalog : null;
  const reference = selectRoutePollutionReference(usableCatalog, {
    pickupPreference: input.pickupPreference,
    routeTopology: input.routeTopology,
    travelBudgetMinutes: input.travelBudgetMinutes,
    usefulCollectionLengthM,
    availableCategories,
  });
  const limitations = indexLimitations(input, reference, catalogMatches);
  const global = buildIndex(allSegmentIds, segments, reference, limitations, selectedCategory);
  const groups = input.groups.map((group, index) => ({
    groupIndex: group.groupIndex,
    volunteerCount: group.volunteerCount,
    index: buildIndex(idsByGroup[index] ?? [], segments, reference, limitations, selectedCategory),
  }));
  const selectedValue = global.categories[selectedCategory].value;
  const status: RoutePollutionPotentialStatus = selectedValue === null
    ? "unavailable"
    : global.categories[selectedCategory].status === "partial"
      ? "partial"
      : "available";
  const provenance = [
    ...(projection ? [
      `projection:${projection.projectionKey}`,
      `projection-version:${projection.projectionVersionId ?? "unknown"}`,
      `risk-model:${projection.sourceVersions.riskModelVersion}`,
    ] : []),
    ...(reference?.provenance ?? []),
  ];
  return {
    schemaVersion: ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION,
    status,
    value: selectedValue,
    selectedCategory,
    global,
    groups,
    reference: reference
      ? {
          id: reference.id,
          label: reference.label,
          kind: reference.kind,
          historicalScore: reference.historicalScore,
          comparison: structuredClone(reference.comparison),
          provenance: [...reference.provenance],
        }
      : null,
    coverage: {
      uniqueSegmentCount: global.uniqueSegmentCount,
      collectionLengthM: global.collectionLengthM,
      coveredLengthM: global.coveredLengthM,
      coverageRatio: global.coverageRatio,
      groupCount: input.groups.length,
    },
    confidence: global.confidence,
    version: {
      potentialSchemaVersion: ROUTE_POLLUTION_POTENTIAL_SCHEMA_VERSION,
      referenceCatalogSchemaVersion: input.referenceCatalog?.schemaVersion ?? null,
      projectionSchemaVersion: projection?.schemaVersion ?? null,
      projectionVersionId: projection?.projectionVersionId ?? null,
      networkVersionId: projection?.networkVersionId ?? null,
      riskModelVersion: projection?.sourceVersions.riskModelVersion ?? null,
    },
    provenance: [...new Set(provenance)],
    limitations: [...new Set([
      ...limitations,
      ...(reference?.limitations ?? []),
    ])],
  };
}

export { isRoutePollutionPotential, isRoutePollutionPotentialConfidence } from "./route-pollution-potential-validation";
