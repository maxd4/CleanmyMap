import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import { estimateParisPressureRisk } from "@/lib/geo/paris-pressure-risk";
import type { ParisPressureRiskContext } from "@/lib/geo/paris-pressure-risk-contract";
import type { MunicipalCleaningServiceabilitySnapshot } from "@/lib/geo/municipal-cleaning-serviceability-contract";
import type { VolunteerSafetyAssessment } from "@/lib/geo/volunteer-additionality-contract";
import type { PedestrianRiskProjectionSegment, PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import { calculateRouteAdditionality, contributionForAdditionality, evidenceWithContribution, routePlannerContributionFields, serviceabilityByZone } from "./route-additionality";
import { routeDistanceKm, travelMinutesForDistance } from "./route-planner";
import { URBAN_PRESSURE_MODEL_SOURCE } from "./route-target-contract";
import type { RoutePredictedCandidate, RoutePredictedEvidence, RouteRiskFocus } from "./route-target-contract";
import type {
  CorridorPoint,
  RoutePredictionCorridor,
  RoutePredictionSummary,
} from "./route-predicted-targets-types";
import {
  buildPredictedCandidateForZone,
  type PredictedCandidateInput,
} from "./route-predicted-targets-candidate";
import { distanceToRouteCorridorKm } from "./route-predicted-targets-geometry";

const PREDICTED_DEDUPLICATION_RADIUS_KM = 0.35;
const PREDICTED_CORRIDOR_RADIUS_KM = 1.5;
const PREDICTED_MAX_DETOUR_MINUTES = 20;
const PREDICTED_STRONG_RISK_THRESHOLD = 70;
const PREDICTED_PRIORITY_FACTOR = 0.72;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function emptySummary(
  riskFocus: RouteRiskFocus,
  warning: string,
): RoutePredictionSummary {
  return {
    status: "unavailable",
    source: URBAN_PRESSURE_MODEL_SOURCE,
    modelVersion: null,
    snapshot: null,
    riskFocus,
    zonesConsidered: 0,
    candidatesConsidered: 0,
    admitted: 0,
    admittedCandidateIds: [],
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    excludedByFinalRoutingBudget: 0,
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    finalRoutingBudgetExcludedCandidateIds: [],
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor: 0,
    deduplicated: 0,
    excludedZoneIds: [],
    deduplicatedZoneIds: [],
    warnings: [warning],
  };
}

export type RoutePredictionInput = {
  snapshot: ParisPressureSnapshot | null;
  projection?: PedestrianRiskProjectionSnapshot | null;
  origin: CorridorPoint;
  observedCandidates?: readonly CorridorPoint[];
  corridor?: RoutePredictionCorridor;
  travelBudgetMinutes: number;
  effectiveRiskFocus?: RouteRiskFocus;
  /** @deprecated Use effectiveRiskFocus at the route boundary. */
  riskFocus?: RouteRiskFocus;
  recentEvents?: readonly (CorridorPoint & {
    ageDays: number;
    attendancePressure: number | null;
  })[];
  contextProvenance?: ParisPressureRiskContext["contextProvenance"];
  municipalCleaningSnapshot?: MunicipalCleaningServiceabilitySnapshot | null;
  volunteerSafetyByZone?: ReadonlyMap<string, VolunteerSafetyAssessment>;
  municipalInterventionsByZone?: ReadonlyMap<string, NonNullable<Parameters<typeof calculateRouteAdditionality>[0]["municipalInterventions"]>>;
};

function projectionSelectedRisk(
  segment: PedestrianRiskProjectionSegment,
  riskFocus: RouteRiskFocus,
): number | null {
  if (segment.riskStatus !== "predicted") return null;
  if (riskFocus === "waste") return segment.wasteRisk;
  if (riskFocus === "cigaretteButts") return segment.cigaretteButtRisk;
  return segment.mixedRisk;
}

function projectionSnapshotMetadata(projection: PedestrianRiskProjectionSnapshot): RoutePredictionSummary["snapshot"] {
  return {
    snapshotId: projection.sourceVersions.pressureSnapshotId,
    schemaVersion: projection.sourceVersions.pressureSchemaVersion as ParisPressureSnapshot["schemaVersion"],
    generatedAt: projection.sourceVersions.pressureGeneratedAt,
    refreshedAt: projection.sourceVersions.pressureRefreshedAt,
  };
}

function buildProjectedCandidate(input: {
  segment: PedestrianRiskProjectionSegment;
  projection: PedestrianRiskProjectionSnapshot;
  corridor: RoutePredictionCorridor;
  riskFocus: RouteRiskFocus;
  travelBudgetMinutes: number;
}): { candidate: RoutePredictedCandidate & { selectedRisk: number }; nearCorridor: boolean } | null {
  const selectedRisk = projectionSelectedRisk(input.segment, input.riskFocus);
  if (selectedRisk === null) return null;
  const radiusKm = Math.max(0.001, input.segment.lengthM / 2000);
  const midpoint = { latitude: input.segment.midpoint[0], longitude: input.segment.midpoint[1] };
  const corridorDistanceKm = distanceToRouteCorridorKm(midpoint, input.corridor.points);
  const detourDistanceKm = Math.max(0, corridorDistanceKm - radiusKm);
  const detourMinutes = travelMinutesForDistance(detourDistanceKm);
  const nearCorridor = corridorDistanceKm <= PREDICTED_CORRIDOR_RADIUS_KM + radiusKm;
  const strongOpportunity = selectedRisk >= PREDICTED_STRONG_RISK_THRESHOLD && detourMinutes <= Math.min(
    PREDICTED_MAX_DETOUR_MINUTES,
    Math.max(0, input.travelBudgetMinutes * 0.35),
  );
  if (!nearCorridor && !strongOpportunity) return null;
  const proximity = clamp(1 - corridorDistanceKm / (PREDICTED_CORRIDOR_RADIUS_KM + radiusKm));
  const pollutionPriority = clamp(
    selectedRisk * PREDICTED_PRIORITY_FACTOR + proximity * 8 - Math.min(18, detourMinutes * 0.6),
    0,
    100,
  );
  const dominantRisk = (input.segment.wasteRisk ?? 0) >= (input.segment.cigaretteButtRisk ?? 0)
    ? "waste"
    : "cigaretteButts";
  const zoneId = input.segment.zoneId ?? "unknown";
  const zoneLabel = input.segment.zoneId ? `IRIS ${input.segment.zoneId}` : "Zone IRIS inconnue";
  const contribution = contributionForAdditionality(pollutionPriority, null);
  const evidence: RoutePredictedEvidence = evidenceWithContribution({
    family: "predicted",
    source: URBAN_PRESSURE_MODEL_SOURCE,
    modelVersion: input.projection.sourceVersions.riskModelVersion,
    zoneId,
    zoneLabel,
    segmentId: input.segment.projectionSegmentId,
    projectionVersionId: input.projection.projectionVersionId,
    networkVersionId: input.projection.networkVersionId,
    effectiveResolution: input.segment.effectiveResolution,
    calibrationStatus: "not_calibrated_theoretical",
    segmentGeometry: {
      type: "LineString",
      coordinates: input.segment.coordinates.map(([latitude, longitude]) => [longitude, latitude]),
    },
    geographicLevel: "iris",
    centroid: midpoint,
    radiusKm: Number(radiusKm.toFixed(3)),
    areaKm2: null,
    distanceToCorridorKm: Number(corridorDistanceKm.toFixed(3)),
    detourDistanceKm: Number(detourDistanceKm.toFixed(3)),
    detourMinutes: Number(detourMinutes.toFixed(1)),
    admission: {
      nearCorridor,
      strongOpportunity,
      reason: nearCorridor ? "corridor" : "strong_opportunity",
      riskThreshold: PREDICTED_STRONG_RISK_THRESHOLD,
      detourLimitMinutes: Number(Math.min(
        PREDICTED_MAX_DETOUR_MINUTES,
        Math.max(0, input.travelBudgetMinutes * 0.35),
      ).toFixed(1)),
    },
    planningCorridor: {
      source: input.corridor.source,
      pointCount: input.corridor.points.length,
      isNetworkGeometry: false,
      note: "Le score provient d'un segment du graphe piéton ; le corridor de comparaison reste celui du planner.",
    },
    riskFocus: input.riskFocus,
    dominantRisk,
    wasteRisk: input.segment.wasteRisk!,
    cigaretteButtRisk: input.segment.cigaretteButtRisk!,
    mixedRisk: input.segment.mixedRisk!,
    confidence: {
      waste: input.segment.wasteConfidence!,
      cigaretteButts: input.segment.cigaretteButtConfidence!,
    },
    contributions: {
      waste: input.segment.wasteFactors!.contributions,
      cigaretteButts: input.segment.cigaretteButtFactors!.contributions,
    },
    cleanlinessCorrection: {
      waste: input.segment.wasteFactors!.cleanlinessCorrection,
      cigaretteButts: input.segment.cigaretteButtFactors!.cleanlinessCorrection,
    },
    urbanMorphologyPrior: {
      waste: input.segment.wasteFactors!.urbanMorphologyPrior,
      cigaretteButts: input.segment.cigaretteButtFactors!.urbanMorphologyPrior,
    },
    snapshot: projectionSnapshotMetadata(input.projection)!,
    provenance: input.segment.provenance,
    contextProvenance: [],
    provenanceGaps: [],
    availableFactors: input.segment.availableFactors,
    missingFactors: input.segment.missingFactors,
    serviceability: input.segment.serviceability,
  } as const, contribution);
  const volunteerSafety: VolunteerSafetyAssessment = {
    status: "unknown",
    suitability: null,
    confidence: 0,
    evidenceIds: [],
  };
  return {
    nearCorridor,
    candidate: {
      family: "predicted",
      id: `predicted:segment:${input.segment.projectionSegmentId}`,
      label: `Segment piéton · ${zoneLabel}`,
      latitude: input.segment.midpoint[0],
      longitude: input.segment.midpoint[1],
      ...routePlannerContributionFields(contribution),
      score: contribution.finalPlannerContribution,
      volunteerSafety,
      reason: `Segment piéton ${input.riskFocus === "all" ? "mixte" : input.riskFocus === "waste" ? "déchets" : "mégots"} à ${corridorDistanceKm.toFixed(2)} km du corridor, détour estimé ${detourMinutes.toFixed(1)} min ; score théorique zonal non calibré.`,
      evidence,
      selectedRisk,
    },
  };
}

function buildProjectedRouteCandidates(input: RoutePredictionInput, projection: PedestrianRiskProjectionSnapshot): {
  candidates: RoutePredictedCandidate[];
  summary: RoutePredictionSummary;
} {
  const riskFocus = input.effectiveRiskFocus ?? input.riskFocus ?? "all";
  const corridor: RoutePredictionCorridor = input.corridor ?? { points: [input.origin], source: "origin_only" };
  const rawCandidates: Array<RoutePredictedCandidate & { selectedRisk: number }> = [];
  const excludedZoneIds: string[] = [];
  let excludedByCorridor = 0;
  for (const segment of projection.segments) {
    const result = buildProjectedCandidate({
      segment,
      projection,
      corridor,
      riskFocus,
      travelBudgetMinutes: input.travelBudgetMinutes,
    });
    if (!result) {
      excludedByCorridor += 1;
      if (segment.zoneId) excludedZoneIds.push(segment.zoneId);
      continue;
    }
    rawCandidates.push(result.candidate);
  }
  const selection = deduplicatePredictedCandidates(rawCandidates);
  const status: RoutePredictionSummary["status"] = projection.counts.unavailableSegments > 0 ? "partial" : "available";
  const summary: RoutePredictionSummary = {
    status,
    source: URBAN_PRESSURE_MODEL_SOURCE,
    modelVersion: projection.sourceVersions.riskModelVersion,
    snapshot: projectionSnapshotMetadata(projection),
    riskFocus,
    projectionVersionId: projection.projectionVersionId,
    zonesConsidered: new Set(projection.segments.flatMap((segment) => segment.intersectedZoneIds)).size,
    candidatesConsidered: rawCandidates.length,
    admitted: selection.candidates.length,
    admittedCandidateIds: selection.candidates.map((candidate) => candidate.id),
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    excludedByFinalRoutingBudget: 0,
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    finalRoutingBudgetExcludedCandidateIds: [],
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor,
    deduplicated: selection.deduplicatedCount,
    excludedZoneIds,
    deduplicatedZoneIds: selection.deduplicatedZoneIds,
    warnings: [
      ...(status === "partial" ? ["Certains segments n'ont pas de zone IRIS résolue ; ils restent indisponibles."] : []),
      ...(input.volunteerSafetyByZone ? [] : ["La sécurité bénévole des segments projetés n'est pas documentée ; elle reste inconnue."]),
    ],
  };
  return { candidates: selection.candidates, summary };
}

function collectPredictedCandidates(input: {
  route: RoutePredictionInput;
  snapshot: ParisPressureSnapshot;
  corridor: RoutePredictionCorridor;
  riskFocus: RouteRiskFocus;
  serviceability: ReturnType<typeof serviceabilityByZone>;
}): {
  rawCandidates: Array<RoutePredictedCandidate & { selectedRisk: number }>;
  excludedByCorridor: number;
  excludedZoneIds: string[];
} {
  let excludedByCorridor = 0;
  const excludedZoneIds: string[] = [];
  const rawCandidates: Array<RoutePredictedCandidate & { selectedRisk: number }> = [];
  for (const zone of input.snapshot.zones) {
    const candidateInput: PredictedCandidateInput = {
      zone,
      snapshot: input.snapshot,
      corridor: input.corridor,
      riskFocus: input.riskFocus,
      travelBudgetMinutes: input.route.travelBudgetMinutes,
      recentEvents: input.route.recentEvents,
      contextProvenance: input.route.contextProvenance,
      serviceability: input.serviceability,
      volunteerSafetyByZone: input.route.volunteerSafetyByZone,
      municipalInterventionsByZone: input.route.municipalInterventionsByZone,
    };
    const result = buildPredictedCandidateForZone(candidateInput);
    if (!result) {
      excludedByCorridor += 1;
      excludedZoneIds.push(zone.id);
      continue;
    }
    rawCandidates.push(result.candidate);
  }
  return { rawCandidates, excludedByCorridor, excludedZoneIds };
}

function deduplicatePredictedCandidates(
  rawCandidates: Array<RoutePredictedCandidate & { selectedRisk: number }>,
): {
  candidates: RoutePredictedCandidate[];
  deduplicatedCount: number;
  deduplicatedZoneIds: string[];
} {
  rawCandidates.sort(
    (left, right) =>
      right.score - left.score ||
      right.selectedRisk - left.selectedRisk ||
      left.evidence.distanceToCorridorKm - right.evidence.distanceToCorridorKm ||
      left.id.localeCompare(right.id),
  );
  const candidates: RoutePredictedCandidate[] = [];
  let deduplicatedCount = 0;
  const deduplicatedZoneIds: string[] = [];
  for (const candidate of rawCandidates) {
    const isProjectedSegment = Boolean(candidate.evidence.segmentId);
    const isNearExisting = isProjectedSegment
      ? candidates.some((existing) => existing.evidence.segmentId === candidate.evidence.segmentId)
      : candidates.some(
          (existing) =>
            routeDistanceKm(candidate, existing) <=
            Math.max(
              PREDICTED_DEDUPLICATION_RADIUS_KM,
              (candidate.evidence.radiusKm + existing.evidence.radiusKm) * 0.75,
            ),
        );
    if (isNearExisting) {
      deduplicatedCount += 1;
      deduplicatedZoneIds.push(candidate.evidence.zoneId);
      continue;
    }
    candidates.push(candidate);
  }
  return { candidates, deduplicatedCount, deduplicatedZoneIds };
}

function resolvePredictionMetadata(
  snapshot: ParisPressureSnapshot,
  candidates: RoutePredictedCandidate[],
): Pick<RoutePredictionSummary, "modelVersion" | "snapshot"> {
  const modelVersion =
    candidates[0]?.evidence.modelVersion ??
    (snapshot.zones.length > 0
      ? estimateParisPressureRisk(snapshot.zones[0]!, snapshot)
          .predictionModelVersion
      : null);
  return {
    modelVersion,
    snapshot:
      candidates[0]?.evidence.snapshot ??
      (modelVersion && snapshot.zones.length > 0
        ? estimateParisPressureRisk(snapshot.zones[0]!, snapshot).snapshot
        : null),
  };
}

function buildPredictionWarnings(
  status: RoutePredictionSummary["status"],
  hasVolunteerSafety: boolean,
): string[] {
  return [
    ...(status === "partial"
      ? [
          "Le snapshot de pression urbaine est partiel ; la prédiction reste distincte des observations terrain.",
        ]
      : []),
    ...(hasVolunteerSafety
      ? []
      : [
          "La sécurité géographique des zones prédites n'est pas documentée ; elles ne sont pas transmises au planner bénévole.",
        ]),
  ];
}

function buildPredictionSummary(input: {
  status: RoutePredictionSummary["status"];
  riskFocus: RouteRiskFocus;
  snapshot: ParisPressureSnapshot;
  candidates: RoutePredictedCandidate[];
  collection: ReturnType<typeof collectPredictedCandidates>;
  selection: ReturnType<typeof deduplicatePredictedCandidates>;
  metadata: Pick<RoutePredictionSummary, "modelVersion" | "snapshot">;
  hasVolunteerSafety: boolean;
}): RoutePredictionSummary {
  return {
    status: input.status,
    source: URBAN_PRESSURE_MODEL_SOURCE,
    ...input.metadata,
    riskFocus: input.riskFocus,
    zonesConsidered: input.snapshot.zones.length,
    candidatesConsidered: input.collection.rawCandidates.length,
    admitted: input.candidates.length,
    admittedCandidateIds: input.candidates.map((candidate) => candidate.id),
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    excludedByFinalRoutingBudget: 0,
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    finalRoutingBudgetExcludedCandidateIds: [],
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor: input.collection.excludedByCorridor,
    deduplicated: input.selection.deduplicatedCount,
    excludedZoneIds: input.collection.excludedZoneIds,
    deduplicatedZoneIds: input.selection.deduplicatedZoneIds,
    warnings: buildPredictionWarnings(input.status, input.hasVolunteerSafety),
  };
}

export function buildPredictedRouteCandidates(input: RoutePredictionInput): {
  candidates: RoutePredictedCandidate[];
  summary: RoutePredictionSummary;
} {
  const riskFocus = input.effectiveRiskFocus ?? input.riskFocus ?? "all";
  if (input.projection) return buildProjectedRouteCandidates(input, input.projection);
  if (!input.snapshot) {
    return {
      candidates: [],
      summary: emptySummary(
        riskFocus,
        "Le snapshot du modèle de pression urbaine est indisponible.",
      ),
    };
  }
  const snapshotStatus: RoutePredictionSummary["status"] =
    input.snapshot.coverage.complete &&
    input.snapshot.sources.every((source) => source.status === "available")
      ? "available"
      : "partial";
  const corridor: RoutePredictionCorridor = input.corridor ?? {
    points: [input.origin],
    source: "origin_only",
  };
  const serviceability = serviceabilityByZone(input.municipalCleaningSnapshot ?? null);
  const collection = collectPredictedCandidates({
    route: input,
    snapshot: input.snapshot,
    corridor,
    riskFocus,
    serviceability,
  });
  const selection = deduplicatePredictedCandidates(collection.rawCandidates);
  const metadata = resolvePredictionMetadata(input.snapshot, selection.candidates);
  return {
    candidates: selection.candidates,
    summary: buildPredictionSummary({
      status: snapshotStatus,
      riskFocus,
      snapshot: input.snapshot,
      candidates: selection.candidates,
      collection,
      selection,
      metadata,
      hasVolunteerSafety: Boolean(input.volunteerSafetyByZone),
    }),
  };
}
