import type {
  ParisPressureSnapshot,
  ParisPressureZone,
} from "@/lib/geo/paris-pressure-contract";
import { estimateParisPressureRisk } from "@/lib/geo/paris-pressure-risk";
import type {
  ParisPressureRiskContext,
  ParisPressureRiskEstimate,
  ParisPressureRiskEvent,
  ParisPressureRiskScore,
} from "@/lib/geo/paris-pressure-risk-contract";
import type { VolunteerSafetyAssessment } from "@/lib/geo/volunteer-additionality-contract";
import {
  calculateRouteAdditionality,
  contributionForAdditionality,
  evidenceWithContribution,
  routePlannerContributionFields,
  serviceabilityByZone,
} from "./route-additionality";
import { routeDistanceKm, travelMinutesForDistance } from "./route-planner";
import { URBAN_PRESSURE_MODEL_SOURCE } from "./route-target-contract";
import type {
  RoutePredictedCandidate,
  RoutePredictedEvidence,
  RouteRiskFocus,
} from "./route-target-contract";
import type { CorridorPoint, RoutePredictionCorridor } from "./route-predicted-targets-types";
import { distanceToRouteCorridorKm, predictedZoneRadiusKm } from "./route-predicted-targets-geometry";

const PREDICTED_CORRIDOR_RADIUS_KM = 1.5;
const PREDICTED_MAX_DETOUR_MINUTES = 20;
const PREDICTED_STRONG_RISK_THRESHOLD = 70;
const PREDICTED_PRIORITY_FACTOR = 0.72;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
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
  dominantRisk: "waste" | "cigaretteButts",
  distanceToCorridorKm: number,
  detourMinutes: number,
): string {
  const reasonRisk = riskFocus === "all" ? dominantRisk : riskFocus;
  const score = reasonRisk === "cigaretteButts"
    ? estimate.cigaretteButts
    : estimate.waste;
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
  const morphology = score.urbanMorphologyPrior;
  const morphologyText =
    morphology.status === "applied" && morphology.appliedMalusPoints > 0
      ? "; contexte morphologique atténuant=" +
        round(morphology.appliedMalusPoints, 2) +
        " pts"
      : morphology.compensatingSignals.length > 0
        ? "; prior morphologique compensé par " +
          morphology.compensatingSignals.join(", ")
        : "";
  return (
    "Zone prédite " +
    (reasonRisk === "cigaretteButts" ? "mégots" : "déchets") +
    " à " +
    round(distanceToCorridorKm, 2) +
    " km du corridor, détour estimé " +
    round(detourMinutes, 1) +
    " min; facteurs calculés=" +
    factors +
    cleanlinessText +
    morphologyText +
    "."
  );
}

export type PredictedCandidateInput = {
  zone: ParisPressureZone;
  snapshot: ParisPressureSnapshot;
  corridor: RoutePredictionCorridor;
  riskFocus: RouteRiskFocus;
  travelBudgetMinutes: number;
  recentEvents?: readonly (CorridorPoint & {
    ageDays: number;
    attendancePressure: number | null;
  })[];
  contextProvenance?: ParisPressureRiskContext["contextProvenance"];
  serviceability: ReturnType<typeof serviceabilityByZone>;
  volunteerSafetyByZone?: ReadonlyMap<string, VolunteerSafetyAssessment>;
  municipalInterventionsByZone?: ReadonlyMap<string, NonNullable<Parameters<typeof calculateRouteAdditionality>[0]["municipalInterventions"]>>;
};

type PredictedZoneAssessment = {
  estimate: ParisPressureRiskEstimate;
  recentEvents: ParisPressureRiskEvent[] | undefined;
  radiusKm: number;
  distanceToCorridorKm: number;
  detourDistanceKm: number;
  detourMinutes: number;
  risk: number;
  nearCorridor: boolean;
  strongOpportunity: boolean;
};

function assessPredictedZone(
  input: PredictedCandidateInput,
): PredictedZoneAssessment | null {
  const recentEvents: ParisPressureRiskEvent[] | undefined = input.recentEvents?.map((event) => ({
    distanceKm: routeDistanceKm(input.zone.centroid, event),
    ageDays: event.ageDays,
    attendancePressure: event.attendancePressure,
  }));
  const riskContext: ParisPressureRiskContext = {
    ...(recentEvents && recentEvents.length > 0 ? { recentEvents } : {}),
    contextProvenance: input.contextProvenance,
  };
  const estimate = estimateParisPressureRisk(input.zone, input.snapshot, riskContext);
  const radiusKm = predictedZoneRadiusKm(input.zone);
  const distanceToCorridorKm = distanceToRouteCorridorKm(
    input.zone.centroid,
    input.corridor.points,
  );
  const detourDistanceKm = Math.max(0, distanceToCorridorKm - radiusKm);
  const detourMinutes = travelMinutesForDistance(detourDistanceKm);
  const risk = chosenRisk(estimate, input.riskFocus);
  const nearCorridor =
    distanceToCorridorKm <= PREDICTED_CORRIDOR_RADIUS_KM + radiusKm;
  const admissionRisk = chosenRisk(estimate, "all");
  const strongOpportunity =
    admissionRisk >= PREDICTED_STRONG_RISK_THRESHOLD &&
    detourMinutes <=
      Math.min(
        PREDICTED_MAX_DETOUR_MINUTES,
        Math.max(0, input.travelBudgetMinutes * 0.35),
      );
  if (!nearCorridor && !strongOpportunity) return null;
  return {
    estimate,
    recentEvents,
    radiusKm,
    distanceToCorridorKm,
    detourDistanceKm,
    detourMinutes,
    risk,
    nearCorridor,
    strongOpportunity,
  };
}

function buildPredictedAdmission(
  route: PredictedCandidateInput,
  assessment: PredictedZoneAssessment,
) {
  return {
    nearCorridor: assessment.nearCorridor,
    strongOpportunity: assessment.strongOpportunity,
    reason: assessment.nearCorridor ? "corridor" as const : "strong_opportunity" as const,
    riskThreshold: PREDICTED_STRONG_RISK_THRESHOLD,
    detourLimitMinutes: round(
      Math.min(
        PREDICTED_MAX_DETOUR_MINUTES,
        Math.max(0, route.travelBudgetMinutes * 0.35),
      ),
      1,
    ),
  };
}

function buildPredictedPlanningCorridor(route: PredictedCandidateInput) {
  return {
    source: route.corridor.source,
    pointCount: route.corridor.points.length,
    isNetworkGeometry: false as const,
    note:
      route.corridor.source === "ordered_baseline"
        ? "Distance calculée sur l'ordre des arrêts retenus par le planner de base ; ce n'est pas une géométrie réseau."
        : "Aucun corridor d'arrêts de base disponible ; distance calculée depuis l'origine uniquement.",
  };
}

function buildPredictedEvidence(input: {
  route: PredictedCandidateInput;
  assessment: PredictedZoneAssessment;
  dominantRisk: "waste" | "cigaretteButts";
  contribution: ReturnType<typeof contributionForAdditionality>;
}): RoutePredictedEvidence {
  const { route, assessment, dominantRisk, contribution } = input;
  const { estimate, radiusKm, distanceToCorridorKm, detourDistanceKm, detourMinutes } = assessment;
  return evidenceWithContribution({
    family: "predicted",
    source: URBAN_PRESSURE_MODEL_SOURCE,
    modelVersion: estimate.predictionModelVersion,
    zoneId: estimate.zoneId,
    zoneLabel: estimate.zoneLabel,
    geographicLevel: route.zone.geographicLevel,
    centroid: route.zone.centroid,
    radiusKm: round(radiusKm),
    areaKm2: route.zone.areaKm2,
    distanceToCorridorKm: round(distanceToCorridorKm),
    detourDistanceKm: round(detourDistanceKm),
    detourMinutes: round(detourMinutes, 1),
    admission: buildPredictedAdmission(route, assessment),
    planningCorridor: buildPredictedPlanningCorridor(route),
    riskFocus: route.riskFocus,
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
    urbanMorphologyPrior: {
      waste: estimate.waste.urbanMorphologyPrior,
      cigaretteButts: estimate.cigaretteButts.urbanMorphologyPrior,
    },
    snapshot: estimate.snapshot,
    provenance: estimate.provenance,
    contextProvenance: estimate.contextProvenance,
    provenanceGaps: estimate.provenanceGaps,
  }, contribution);
}

function buildPredictedCandidate(input: {
  route: PredictedCandidateInput;
  assessment: PredictedZoneAssessment;
  dominantRisk: "waste" | "cigaretteButts";
  contribution: ReturnType<typeof contributionForAdditionality>;
  volunteerSafety: VolunteerSafetyAssessment;
  evidence: RoutePredictedEvidence;
}): RoutePredictedCandidate & { selectedRisk: number } {
  const { route, assessment, dominantRisk, contribution, volunteerSafety, evidence } = input;
  return {
    family: "predicted",
    id: "predicted:" + route.zone.id,
    label: "Zone prédite · " + route.zone.label,
    latitude: route.zone.centroid.latitude,
    longitude: route.zone.centroid.longitude,
    ...routePlannerContributionFields(contribution),
    score: contribution.finalPlannerContribution,
    volunteerSafety,
    reason: buildReason(
      assessment.estimate,
      route.riskFocus,
      dominantRisk,
      assessment.distanceToCorridorKm,
      assessment.detourMinutes,
    ),
    evidence,
    selectedRisk: assessment.risk,
  };
}

function resolvePredictedAdditionality(
  input: PredictedCandidateInput,
  volunteerSafety: VolunteerSafetyAssessment,
  recentEvents: ParisPressureRiskEvent[] | undefined,
) {
  if (!input.volunteerSafetyByZone?.has(input.zone.id)) return null;
  return calculateRouteAdditionality({
    zone: input.zone,
    pressureSnapshot: input.snapshot,
    municipalCleaning: input.serviceability.get(input.zone.id) ?? null,
    volunteerSafety,
    municipalInterventions: input.municipalInterventionsByZone?.get(input.zone.id),
    eventPressure: recentEvents && recentEvents.length > 0
      ? Math.max(...recentEvents.map((event) => event.attendancePressure ?? 0))
      : null,
  });
}

export function buildPredictedCandidateForZone(
  input: PredictedCandidateInput,
): { candidate: RoutePredictedCandidate & { selectedRisk: number }; nearCorridor: boolean } | null {
  const assessment = assessPredictedZone(input);
  if (!assessment) return null;
  const { estimate, recentEvents, radiusKm, distanceToCorridorKm, detourMinutes, risk, nearCorridor } = assessment;
  const proximity = clamp(
    1 - distanceToCorridorKm / (PREDICTED_CORRIDOR_RADIUS_KM + radiusKm),
  );
  const pollutionPriority = clamp(
    risk * PREDICTED_PRIORITY_FACTOR + proximity * 8 - Math.min(18, detourMinutes * 0.6),
    0,
    100,
  );
  const volunteerSafety = input.volunteerSafetyByZone?.get(input.zone.id) ?? {
    status: "unknown" as const,
    suitability: null,
    confidence: 0,
    evidenceIds: [],
  };
  const additionality = resolvePredictedAdditionality(input, volunteerSafety, recentEvents);
  const contribution = contributionForAdditionality(pollutionPriority, additionality);
  const dominantRisk =
    estimate.wasteRisk >= estimate.cigaretteButtRisk ? "waste" : "cigaretteButts";
  const evidence = buildPredictedEvidence({ route: input, assessment, dominantRisk, contribution });
  return {
    nearCorridor,
    candidate: buildPredictedCandidate({
      route: input,
      assessment,
      dominantRisk,
      contribution,
      volunteerSafety,
      evidence,
    }),
  };
}
