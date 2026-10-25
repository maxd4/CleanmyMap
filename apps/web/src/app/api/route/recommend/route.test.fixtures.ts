import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type { RouteGeometry } from "@/lib/route/route-contract";
import type { RoutePlannerCandidate, PlannedRouteStop } from "@/lib/route/route-planner";
import type { TrashSpotterRouteCandidate } from "@/lib/route/trash-spotter-recommendation";

export const availableSourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["spots"],
  warnings: [],
} satisfies UnifiedSourceHealth;

export const candidate: TrashSpotterRouteCandidate = {
  id: "spot-1",
  label: "Paris 4e",
  latitude: 48.85,
  longitude: 2.35,
  observedAt: "2026-05-01T09:00:00.000Z",
  wasteCategories: ["plastic"],
  source: "trash_spotter_spots",
  sourceStatus: "validated",
  safety: {
    volunteerEligibility: "eligible",
    specializationReason: null,
  },
  contract: buildActionDataContract({
    id: "spot-1",
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    observedAt: "2026-05-01T09:00:00.000Z",
    locationLabel: "Paris 4e",
    latitude: 48.85,
    longitude: 2.35,
    wasteCategories: ["plastic"],
  }),
  score: 80,
  reason: "Signalement récent",
  baseScore: 80,
  eventPressure: null,
  eventScoreContribution: 0,
  pollutionPriority: 80,
  volunteerAdditionality: null,
  finalPlannerContribution: 80,
  volunteerAdditionalityConfidence: null,
  additionalityWeight: 0.25,
  volunteerSafety: {
    status: "unknown",
    confidence: 0,
    suitability: null,
  },
  family: "observed",
  evidence: {
    family: "observed",
    source: "trash_spotter_spots",
    proof: "validated",
    observedAt: "2026-05-01T09:00:00.000Z",
    pollutionPriority: 80,
    volunteerAdditionality: null,
    finalPlannerContribution: 80,
    volunteerAdditionalityConfidence: null,
    additionalityWeight: 0.25,
  },
};

export function predictedCandidate(id = "predicted:zone-1"): Extract<RoutePlannerCandidate, { family: "predicted" }> {
  return {
    family: "predicted",
    id,
    label: "Zone prédite",
    latitude: 48.85,
    longitude: 2.35,
    score: 70,
    reason: "Pression urbaine prédite",
    volunteerSafety: { status: "safe", confidence: 1, suitability: 1 },
    evidence: {
      family: "predicted",
      source: "urban-pressure-model",
      modelVersion: "test-model",
      zoneId: "zone-1",
      zoneLabel: "Zone prédite",
      geographicLevel: "grid",
      centroid: { latitude: 48.85, longitude: 2.35 },
      radiusKm: 0.2,
      areaKm2: 0.1,
      distanceToCorridorKm: 0,
      planningCorridor: {
        source: "origin_only",
        pointCount: 1,
        isNetworkGeometry: false,
        note: "fixture",
      },
      detourDistanceKm: 0,
      detourMinutes: 0,
      riskFocus: "all",
      dominantRisk: "waste",
      wasteRisk: 50,
      cigaretteButtRisk: 20,
      confidence: {
        waste: {
          dataCompleteness: 0,
          sourceCompleteness: 0,
          cleanlinessCorrectionCompleteness: 0,
          cleanlinessCorrectionSourceReliability: 0,
          score: 0,
          level: "unknown",
          availableFactors: 0,
          totalFactors: 10,
          missingFactors: [],
        },
        cigaretteButts: {
          dataCompleteness: 0,
          sourceCompleteness: 0,
          cleanlinessCorrectionCompleteness: 0,
          cleanlinessCorrectionSourceReliability: 0,
          score: 0,
          level: "unknown",
          availableFactors: 0,
          totalFactors: 10,
          missingFactors: [],
        },
      },
      contributions: { waste: [], cigaretteButts: [] },
      cleanlinessCorrection: {
        waste: {
          normalizedPressure: null,
          points: 0,
          available: false,
          resolution: "unknown",
          resolutionReason: "missing_prior",
          sourceReliability: 0,
          explanation: "fixture",
        },
        cigaretteButts: {
          normalizedPressure: null,
          points: 0,
          available: false,
          resolution: "unknown",
          resolutionReason: "missing_prior",
          sourceReliability: 0,
          explanation: "fixture",
        },
      },
      urbanMorphologyPrior: {
        waste: {
          version: "urban-morphology-prior-v1",
          status: "unavailable",
          source: null,
          geographicSource: null,
          morphologyType: [],
          confidence: 0,
          features: null,
          components: { lowTrafficLocalStreet: 0, deadEnd: 0, parkInterior: 0, residentialLowFlow: 0 },
          baseMalusPoints: 0,
          compensationPoints: 0,
          appliedMalusPoints: 0,
          beforeRisk: 50,
          afterRisk: 50,
          compensatingSignals: [],
          explanation: "fixture",
        },
        cigaretteButts: {
          version: "urban-morphology-prior-v1",
          status: "unavailable",
          source: null,
          geographicSource: null,
          morphologyType: [],
          confidence: 0,
          features: null,
          components: { lowTrafficLocalStreet: 0, deadEnd: 0, parkInterior: 0, residentialLowFlow: 0 },
          baseMalusPoints: 0,
          compensationPoints: 0,
          appliedMalusPoints: 0,
          beforeRisk: 20,
          afterRisk: 20,
          compensatingSignals: [],
          explanation: "fixture",
        },
      },
      snapshot: {
        snapshotId: "fixture",
        schemaVersion: "paris-pressure-v1",
        generatedAt: "2026-05-01T09:00:00.000Z",
        refreshedAt: "2026-05-01T09:00:00.000Z",
      },
      provenance: [],
      contextProvenance: [],
      provenanceGaps: [],
    },
  };
}
export const fallbackGeometry = (
  coordinates: [number, number][] = [],
  durationMinutes = 0,
): RouteGeometry => ({
  isLoop: coordinates.length >= 2 && coordinates[0]?.[0] === coordinates.at(-1)?.[0] && coordinates[0]?.[1] === coordinates.at(-1)?.[1],
  origin: coordinates[0] ?? null,
  returnLeg: coordinates.length >= 2 && coordinates[0]?.[0] === coordinates.at(-1)?.[0] && coordinates[0]?.[1] === coordinates.at(-1)?.[1]
    ? { fromStopIndex: coordinates.length - 2, toStopIndex: coordinates.length - 1, distanceKm: 0, estimatedMinutes: 0 }
    : null,
  coordinates,
  distanceKm: 1,
  durationMinutes,
  legs: [],
  provider: "none" as const,
  profile: null,
  mode: "fallback" as const,
  estimated: true,
});

export function request(payload: unknown = {}) {
  return new Request("http://localhost/api/route/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function plannedStop(candidateValue: RoutePlannerCandidate = candidate, index = 0): PlannedRouteStop {
  return {
    candidate: candidateValue,
    incrementalDistanceKm: index + 1,
    incrementalTravelMinutes: index + 5,
    cumulativeTravelMinutes: (index + 1) * 5,
    returnDistanceKm: index + 1,
    returnTravelMinutes: index + 5,
    loopDistanceKm: (index + 1) * 2,
    loopTravelMinutes: (index + 1) * 10,
  };
}
