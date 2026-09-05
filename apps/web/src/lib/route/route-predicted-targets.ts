import type {
  ParisPressureProvenance,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "@/lib/geo/paris-pressure-contract";
import { estimateParisPressureRisk } from "@/lib/geo/paris-pressure-risk";
import type {
  ParisPressureRiskConfidence,
  ParisPressureRiskEvent,
  ParisPressureRiskEstimate,
  ParisPressureRiskContext,
  ParisPressureRiskScore,
} from "@/lib/geo/paris-pressure-risk-contract";
import { routeDistanceKm, travelMinutesForDistance } from "./route-planner";
import type { RoutePlannerCandidate } from "./route-planner";

export const URBAN_PRESSURE_MODEL_SOURCE = "urban-pressure-model" as const;
export const PREDICTED_CORRIDOR_RADIUS_KM = 1.5;
export const PREDICTED_DEDUPLICATION_RADIUS_KM = 0.35;
export const PREDICTED_MAX_DETOUR_MINUTES = 20;
export const PREDICTED_STRONG_RISK_THRESHOLD = 70;
export const PREDICTED_PRIORITY_FACTOR = 0.72;

export type RouteRiskFocus = "all" | "waste" | "cigaretteButts";

export type RouteObservedEvidence = {
  family: "observed";
  source: "trash_spotter_spots";
  proof: "validated";
  observedAt: string;
};

export type RoutePredictedEvidence = {
  family: "predicted";
  source: typeof URBAN_PRESSURE_MODEL_SOURCE;
  modelVersion: string;
  zoneId: string;
  zoneLabel: string;
  geographicLevel: ParisPressureZone["geographicLevel"];
  centroid: ParisPressureZone["centroid"];
  radiusKm: number;
  areaKm2: number | null;
  distanceToCorridorKm: number;
  planningCorridor: {
    source: "origin_only" | "ordered_baseline";
    pointCount: number;
    isNetworkGeometry: false;
    note: string;
  };
  detourDistanceKm: number;
  detourMinutes: number;
  admission?: {
    nearCorridor: boolean;
    strongOpportunity: boolean;
    reason: "corridor" | "strong_opportunity";
    riskThreshold: number;
    detourLimitMinutes: number;
  };
  riskFocus: RouteRiskFocus;
  dominantRisk: "waste" | "cigaretteButts";
  wasteRisk: number;
  cigaretteButtRisk: number;
  confidence: {
    waste: ParisPressureRiskConfidence;
    cigaretteButts: ParisPressureRiskConfidence;
  };
  contributions: {
    waste: ParisPressureRiskScore["contributions"];
    cigaretteButts: ParisPressureRiskScore["contributions"];
  };
  cleanlinessCorrection: {
    waste: ParisPressureRiskScore["cleanlinessCorrection"];
    cigaretteButts: ParisPressureRiskScore["cleanlinessCorrection"];
  };
  snapshot: Pick<
    ParisPressureSnapshot,
    "snapshotId" | "schemaVersion" | "generatedAt" | "refreshedAt"
  >;
  provenance: ParisPressureProvenance[];
  contextProvenance: ParisPressureRiskEstimate["contextProvenance"];
  provenanceGaps: ParisPressureRiskEstimate["provenanceGaps"];
};

export type RoutePredictedCandidate = {
  family: "predicted";
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  score: number;
  reason: string;
  evidence: RoutePredictedEvidence;
};

export type RouteTargetEvidence = RouteObservedEvidence | RoutePredictedEvidence;

export type RoutePredictionAvailability = {
  status: "available" | "partial" | "unavailable";
  source: typeof URBAN_PRESSURE_MODEL_SOURCE;
  modelVersion: string | null;
  snapshot: RoutePredictedEvidence["snapshot"] | null;
  riskFocus: RouteRiskFocus;
  zonesConsidered: number;
  candidatesConsidered: number;
  admitted: number;
  admittedCandidateIds: string[];
  passedToPlanner: number;
  excludedByPreselection: number;
  excludedByPlannerBudget: number;
  preselectionExcludedCandidateIds: string[];
  preselectionExclusionReasons: Record<string, "preselection_bound">;
  selected: number;
  selectedCandidateIds: string[];
  excludedByCorridor: number;
  deduplicated: number;
  excludedZoneIds?: string[];
  deduplicatedZoneIds?: string[];
  warnings: string[];
};

export type RoutePredictionSummary = RoutePredictionAvailability;

type CorridorPoint = { latitude: number; longitude: number };

export type RoutePredictionCorridor = {
  points: readonly CorridorPoint[];
  source: "origin_only" | "ordered_baseline";
};

export type RoutePredictionPoolAudit = {
  admittedCandidateIds: string[];
  passedToPlannerCandidateIds: string[];
  excludedByPreselectionCandidateIds: string[];
  excludedByPreselectionReasons: Record<string, "preselection_bound">;
};

export function buildRoutePlannerCandidatePool(input: {
  observedCandidates: readonly RoutePlannerCandidate[];
  predictedCandidates: readonly RoutePredictedCandidate[];
  maxCandidates: number;
}): {
  candidates: RoutePlannerCandidate[];
  audit: RoutePredictionPoolAudit;
} {
  const all = [...input.observedCandidates, ...input.predictedCandidates];
  const ordered = [...all].sort((left, right) => {
    const leftScore = clamp(left.score, 0, 100);
    const rightScore = clamp(right.score, 0, 100);
    if (Math.abs(leftScore - rightScore) > Number.EPSILON) {
      return rightScore - leftScore;
    }
    const leftObserved = left.family !== "predicted";
    const rightObserved = right.family !== "predicted";
    if (leftObserved !== rightObserved) return leftObserved ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  const maxCandidates = Math.max(0, Math.floor(input.maxCandidates));
  const passed = ordered.slice(0, maxCandidates);
  const excluded = ordered.slice(maxCandidates);
  return {
    candidates: passed,
    audit: {
      admittedCandidateIds: ordered.map((candidate) => candidate.id),
      passedToPlannerCandidateIds: passed.map((candidate) => candidate.id),
      excludedByPreselectionCandidateIds: excluded.map((candidate) => candidate.id),
      excludedByPreselectionReasons: Object.fromEntries(
        excluded.map((candidate) => [candidate.id, "preselection_bound"] as const),
      ),
    },
  };
}

export function applyRoutePredictionPoolAudit(
  summary: RoutePredictionSummary,
  audit: RoutePredictionPoolAudit,
): RoutePredictionSummary {
  const predicted = new Set(summary.admittedCandidateIds);
  const admittedCandidateIds = audit.admittedCandidateIds.filter((id) => predicted.has(id));
  const passedToPlannerCandidateIds = audit.passedToPlannerCandidateIds.filter((id) => predicted.has(id));
  const excludedByPreselectionCandidateIds = audit.excludedByPreselectionCandidateIds.filter((id) => predicted.has(id));
  return {
    ...summary,
    admitted: admittedCandidateIds.length,
    passedToPlanner: passedToPlannerCandidateIds.length,
    excludedByPreselection: excludedByPreselectionCandidateIds.length,
    preselectionExcludedCandidateIds: excludedByPreselectionCandidateIds,
    preselectionExclusionReasons: Object.fromEntries(
      excludedByPreselectionCandidateIds.map((id) => [id, "preselection_bound"] as const),
    ),
  };
}

export function applyRoutePredictionPlannerBudgetAudit(
  summary: RoutePredictionSummary,
  input: {
    passedCandidateIds: readonly string[];
    evaluations: readonly { candidateId: string; feasible: boolean }[];
  },
): RoutePredictionSummary {
  const passed = new Set(input.passedCandidateIds);
  return {
    ...summary,
    excludedByPlannerBudget: new Set(
      input.evaluations
        .filter((evaluation) => passed.has(evaluation.candidateId) && !evaluation.feasible)
        .map((evaluation) => evaluation.candidateId),
    ).size,
  };
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function zoneRadiusKm(zone: ParisPressureZone): number {
  if (
    typeof zone.areaKm2 === "number" &&
    Number.isFinite(zone.areaKm2) &&
    zone.areaKm2 > 0
  ) {
    return clamp(Math.sqrt(zone.areaKm2 / Math.PI), 0.05, 0.75);
  }
  return 0.2;
}

function pointToSegmentDistanceKm(
  point: CorridorPoint,
  start: CorridorPoint,
  end: CorridorPoint,
): number {
  const latitudeScale = 111;
  const longitudeScale = 73;
  const px = point.longitude * longitudeScale;
  const py = point.latitude * latitudeScale;
  const sx = start.longitude * longitudeScale;
  const sy = start.latitude * latitudeScale;
  const ex = end.longitude * longitudeScale;
  const ey = end.latitude * latitudeScale;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    lengthSquared === 0
      ? 0
      : clamp(((px - sx) * dx + (py - sy) * dy) / lengthSquared);
  return Math.sqrt(
    (px - (sx + projection * dx)) ** 2 +
      (py - (sy + projection * dy)) ** 2,
  );
}

export function distanceToRouteCorridorKm(
  point: CorridorPoint,
  corridor: readonly CorridorPoint[],
): number {
  if (corridor.length === 0) return Number.POSITIVE_INFINITY;
  if (corridor.length === 1) return routeDistanceKm(point, corridor[0]!);
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < corridor.length; index += 1) {
    nearest = Math.min(
      nearest,
      pointToSegmentDistanceKm(point, corridor[index - 1]!, corridor[index]!),
    );
  }
  return nearest;
}

function chosenRisk(
  estimate: ParisPressureRiskEstimate,
  riskFocus: RouteRiskFocus,
): number {
  if (riskFocus === "waste") return estimate.wasteRisk;
  if (riskFocus === "cigaretteButts") return estimate.cigaretteButtRisk;
  return Math.max(estimate.wasteRisk, estimate.cigaretteButtRisk);
}

function actualFactorLabels(score: ParisPressureRiskScore): string[] {
  return score.contributions
    .filter((contribution) => contribution.available && contribution.points > 0)
    .sort(
      (left, right) =>
        right.points - left.points || left.key.localeCompare(right.key),
    )
    .slice(0, 4)
    .map((contribution) => contribution.label);
}

function buildReason(
  estimate: ParisPressureRiskEstimate,
  riskFocus: RouteRiskFocus,
  distanceToCorridorKm: number,
  detourMinutes: number,
): string {
  const score =
    riskFocus === "cigaretteButts" ? estimate.cigaretteButts : estimate.waste;
  const labels = actualFactorLabels(score);
  const cleanliness = score.cleanlinessCorrection;
  const factors =
    labels.length > 0 ? labels.join(", ") : "facteurs disponibles limités";
  const cleanlinessText =
    cleanliness.available && cleanliness.points < 0
      ? "; propreté habituelle atténuante=" +
        round(cleanliness.points, 2) +
        " pts"
      : "";
  return (
    "Zone prédite " +
    (riskFocus === "cigaretteButts"
      ? "mégots"
      : riskFocus === "waste"
        ? "déchets"
        : "déchets/mégots") +
    " à " +
    round(distanceToCorridorKm, 2) +
    " km du corridor, détour estimé " +
    round(detourMinutes, 1) +
    " min; facteurs calculés=" +
    factors +
    cleanlinessText +
    "."
  );
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
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor: 0,
    deduplicated: 0,
    excludedZoneIds: [],
    deduplicatedZoneIds: [],
    warnings: [warning],
  };
}

export function buildPredictedRouteCandidates(input: {
  snapshot: ParisPressureSnapshot | null;
  origin: CorridorPoint;
  observedCandidates?: readonly CorridorPoint[];
  corridor?: RoutePredictionCorridor;
  travelBudgetMinutes: number;
  riskFocus?: RouteRiskFocus;
  recentEvents?: readonly (CorridorPoint & {
    ageDays: number;
    attendancePressure: number | null;
  })[];
  contextProvenance?: ParisPressureRiskContext["contextProvenance"];
}): {
  candidates: RoutePredictedCandidate[];
  summary: RoutePredictionSummary;
} {
  const riskFocus = input.riskFocus ?? "all";
  if (!input.snapshot) {
    return {
      candidates: [],
      summary: emptySummary(
        riskFocus,
        "Le snapshot du modèle de pression urbaine est indisponible.",
      ),
    };
  }

  const snapshotStatus =
    input.snapshot.coverage.complete &&
    input.snapshot.sources.every((source) => source.status === "available")
      ? "available"
      : "partial";
  const corridor: RoutePredictionCorridor = input.corridor ?? {
    points: [input.origin],
    source: "origin_only",
  };
  const rawCandidates: Array<RoutePredictedCandidate & { selectedRisk: number }> =
    [];
  let excludedByCorridor = 0;
  const excludedZoneIds: string[] = [];

  for (const zone of input.snapshot.zones) {
    const recentEvents: ParisPressureRiskEvent[] | undefined =
      input.recentEvents?.map((event) => ({
        distanceKm: routeDistanceKm(zone.centroid, event),
        ageDays: event.ageDays,
        attendancePressure: event.attendancePressure,
      }));
    const riskContext: ParisPressureRiskContext = {
      ...(recentEvents && recentEvents.length > 0 ? { recentEvents } : {}),
      contextProvenance: input.contextProvenance,
    };
    const estimate = estimateParisPressureRisk(zone, input.snapshot, riskContext);
    const radiusKm = zoneRadiusKm(zone);
    const distanceToCorridorKm = distanceToRouteCorridorKm(
      zone.centroid,
      corridor.points,
    );
    const detourDistanceKm = Math.max(0, distanceToCorridorKm - radiusKm);
    const detourMinutes = travelMinutesForDistance(detourDistanceKm);
    const risk = chosenRisk(estimate, riskFocus);
    const nearCorridor =
      distanceToCorridorKm <= PREDICTED_CORRIDOR_RADIUS_KM + radiusKm;
    const strongOpportunity =
      risk >= PREDICTED_STRONG_RISK_THRESHOLD &&
      detourMinutes <=
        Math.min(
          PREDICTED_MAX_DETOUR_MINUTES,
          Math.max(0, input.travelBudgetMinutes * 0.35),
        );

    if (!nearCorridor && !strongOpportunity) {
      excludedByCorridor += 1;
      excludedZoneIds.push(zone.id);
      continue;
    }

    const proximity = clamp(
      1 - distanceToCorridorKm / (PREDICTED_CORRIDOR_RADIUS_KM + radiusKm),
    );
    const score = clamp(
      risk * PREDICTED_PRIORITY_FACTOR +
        proximity * 8 -
        Math.min(18, detourMinutes * 0.6),
      0,
      100,
    );
    const dominantRisk =
      estimate.wasteRisk >= estimate.cigaretteButtRisk
        ? "waste"
        : "cigaretteButts";
    const evidence: RoutePredictedEvidence = {
      family: "predicted",
      source: URBAN_PRESSURE_MODEL_SOURCE,
      modelVersion: estimate.predictionModelVersion,
      zoneId: estimate.zoneId,
      zoneLabel: estimate.zoneLabel,
      geographicLevel: zone.geographicLevel,
      centroid: zone.centroid,
      radiusKm: round(radiusKm),
      areaKm2: zone.areaKm2,
      distanceToCorridorKm: round(distanceToCorridorKm),
      detourDistanceKm: round(detourDistanceKm),
      detourMinutes: round(detourMinutes, 1),
      admission: {
        nearCorridor,
        strongOpportunity,
        reason: nearCorridor ? "corridor" : "strong_opportunity",
        riskThreshold: PREDICTED_STRONG_RISK_THRESHOLD,
        detourLimitMinutes: round(
          Math.min(
            PREDICTED_MAX_DETOUR_MINUTES,
            Math.max(0, input.travelBudgetMinutes * 0.35),
          ),
          1,
        ),
      },
      planningCorridor: {
        source: corridor.source,
        pointCount: corridor.points.length,
        isNetworkGeometry: false,
        note:
          corridor.source === "ordered_baseline"
            ? "Distance calculée sur l'ordre des arrêts retenus par le planner de base ; ce n'est pas une géométrie réseau."
            : "Aucun corridor d'arrêts de base disponible ; distance calculée depuis l'origine uniquement.",
      },
      riskFocus,
      dominantRisk,
      wasteRisk: estimate.wasteRisk,
      cigaretteButtRisk: estimate.cigaretteButtRisk,
      confidence: estimate.confidence,
      contributions: {
        waste: estimate.waste.contributions,
        cigaretteButts: estimate.cigaretteButts.contributions,
      },
      cleanlinessCorrection: {
        waste: estimate.waste.cleanlinessCorrection,
        cigaretteButts: estimate.cigaretteButts.cleanlinessCorrection,
      },
      snapshot: estimate.snapshot,
      provenance: estimate.provenance,
      contextProvenance: estimate.contextProvenance,
      provenanceGaps: estimate.provenanceGaps,
    };
    rawCandidates.push({
      family: "predicted",
      id: "predicted:" + zone.id,
      label: "Zone prédite · " + zone.label,
      latitude: zone.centroid.latitude,
      longitude: zone.centroid.longitude,
      score: round(score, 2),
      reason: buildReason(
        estimate,
        riskFocus,
        distanceToCorridorKm,
        detourMinutes,
      ),
      evidence,
      selectedRisk: risk,
    });
  }

  rawCandidates.sort(
    (left, right) =>
      right.score - left.score ||
      right.selectedRisk - left.selectedRisk ||
      left.evidence.distanceToCorridorKm - right.evidence.distanceToCorridorKm ||
      left.id.localeCompare(right.id),
  );

  const deduplicated: RoutePredictedCandidate[] = [];
  let deduplicatedCount = 0;
  const deduplicatedZoneIds: string[] = [];
  for (const candidate of rawCandidates) {
    const isNearExisting = deduplicated.some(
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
    deduplicated.push(candidate);
  }

  const candidates = deduplicated;
  const modelVersion =
    candidates[0]?.evidence.modelVersion ??
    (input.snapshot.zones.length > 0
      ? estimateParisPressureRisk(input.snapshot.zones[0]!, input.snapshot)
          .predictionModelVersion
      : null);
  const snapshot =
    candidates[0]?.evidence.snapshot ??
    (modelVersion && input.snapshot.zones.length > 0
      ? estimateParisPressureRisk(input.snapshot.zones[0]!, input.snapshot)
          .snapshot
      : null);
  return {
    candidates,
    summary: {
      status: snapshotStatus,
      source: URBAN_PRESSURE_MODEL_SOURCE,
      modelVersion,
      snapshot,
      riskFocus,
      zonesConsidered: input.snapshot.zones.length,
      candidatesConsidered: rawCandidates.length,
      admitted: deduplicated.length,
      admittedCandidateIds: deduplicated.map((candidate) => candidate.id),
      passedToPlanner: 0,
      excludedByPreselection: 0,
      excludedByPlannerBudget: 0,
      preselectionExcludedCandidateIds: [],
      preselectionExclusionReasons: {},
      selected: 0,
      selectedCandidateIds: [],
      excludedByCorridor,
      deduplicated: deduplicatedCount,
      excludedZoneIds,
      deduplicatedZoneIds,
      warnings:
        snapshotStatus === "partial"
          ? [
              "Le snapshot de pression urbaine est partiel ; la prédiction reste distincte des observations terrain.",
            ]
          : [],
    },
  };
}
