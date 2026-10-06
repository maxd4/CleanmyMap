import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import { estimateParisPressureRisk } from "@/lib/geo/paris-pressure-risk";
import type { ParisPressureRiskContext } from "@/lib/geo/paris-pressure-risk-contract";
import type { MunicipalCleaningServiceabilitySnapshot } from "@/lib/geo/municipal-cleaning-serviceability-contract";
import type { VolunteerSafetyAssessment } from "@/lib/geo/volunteer-additionality-contract";
import { calculateRouteAdditionality, serviceabilityByZone } from "./route-additionality";
import { routeDistanceKm } from "./route-planner";
import { URBAN_PRESSURE_MODEL_SOURCE } from "./route-target-contract";
import type { RoutePredictedCandidate, RouteRiskFocus } from "./route-target-contract";
import type {
  CorridorPoint,
  RoutePredictionCorridor,
  RoutePredictionSummary,
} from "./route-predicted-targets-types";
import {
  buildPredictedCandidateForZone,
  type PredictedCandidateInput,
} from "./route-predicted-targets-candidate";

const PREDICTED_DEDUPLICATION_RADIUS_KM = 0.35;

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
    const isNearExisting = candidates.some(
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
