import { applyOriginRouteGeometryLegs, type RouteStop } from "@/lib/route/route-contract";
import { buildRoutePlannerSnapshot, buildVerifiedRouteCalibrationContext } from "@/lib/route/route-calibration";
import { createRoutePlannerProof } from "@/lib/route/route-planner-proof";
import { resolveRouteDataLayers } from "@/lib/route/route-data-status";
import { ROUTE_PLANNER_ENGINE_VERSION } from "@/lib/route/route-planner";
import type {
  OperationalContext,
  ProofContext,
  RouteRecommendationResponseInput,
} from "./route.response.builders";

function buildPlannerSnapshotGroups(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
) {
  const { planning } = input;
  return (context.groupRoutes.length > 0
    ? context.groupRoutes.map((group) => ({
        groupIndex: group.groupIndex,
        volunteerCount: group.volunteerCount,
        candidateIds: [...group.candidateIds],
        reservedCandidateIds: [...group.reservedCandidateIds],
        targetCount: group.targetCount,
        travelDistanceKm: group.travelDistanceKm,
        travelMinutes: group.travelMinutes,
        travelBudgetMinutes: group.travelBudgetMinutes,
        withinBudget: group.withinBudget,
        routeGeometry: group.routeGeometry,
        operationalBudget: group.operationalBudget ?? null,
      }))
    : planning.groupPartition.groups.map((group) => ({
        groupIndex: group.groupIndex,
        volunteerCount: group.volunteerCount,
        candidateIds: [...group.candidateIds],
        reservedCandidateIds: [],
        targetCount: group.targetCount,
        travelDistanceKm: group.estimatedDistanceKm,
        travelMinutes: group.estimatedDurationMinutes,
        travelBudgetMinutes: input.travelBudgetMinutes,
        withinBudget: group.estimatedDurationMinutes <= input.travelBudgetMinutes,
        routeGeometry: planning.routeGeometry,
        operationalBudget: null,
      })));
}

export function buildRouteSnapshotStops(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
): RouteStop[] {
  return context.groupRoutes.length > 1
    ? context.groupRoutes.flatMap(({ stops }) => stops)
    : applyOriginRouteGeometryLegs(
        input.planning.plannedStops.map(({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
          id: candidate.id,
          label: candidate.label,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          segmentKm: Number(incrementalDistanceKm.toFixed(2)),
          estimatedMinutes: Math.max(0, Math.round(incrementalTravelMinutes)),
          priorityReason: candidate.reason,
          score: Number(candidate.score.toFixed(2)),
          evidence: candidate.evidence,
        })),
        input.planning.routeGeometry,
      );
}

export function buildRoutePlannerSnapshotForProof(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
  predictionSummary: ProofContext["predictionSummary"],
  dataLayers: ReturnType<typeof resolveRouteDataLayers>,
  snapshotStops: RouteStop[],
): ReturnType<typeof buildRoutePlannerSnapshot> {
  const { candidateData, planning } = input;
  return buildRoutePlannerSnapshot({
    generatedAt: context.generatedAt,
    engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    selectedCandidates: context.calibrationCandidates,
    selectedStops: snapshotStops,
    origin: input.origin,
    planningMode: input.planningMode ?? { type: "free" },
    travelBudgetMinutes: input.travelBudgetMinutes,
    maxStops: input.maxStops,
    priorityVsTravel: input.priorityVsTravel,
    pickupPreference: input.pickupPreference,
    effectiveRiskFocus: planning.effectiveRiskFocus,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    routeGeometry: planning.routeGeometry,
    travelDistanceKm: input.groupCount === 1 ? planning.routeGeometry.distanceKm : context.multiRoute.totalDistanceKm,
    travelMinutes: input.groupCount === 1 ? planning.routeGeometry.durationMinutes : context.multiRoute.totalDurationMinutes,
    returnDistanceKm: planning.routeGeometry.returnLeg?.distanceKm ?? 0,
    returnMinutes: planning.routeGeometry.returnLeg?.estimatedMinutes ?? 0,
    groups: buildPlannerSnapshotGroups(input, context),
    dataStatus: candidateData.dataStatus,
    dataLayers,
    sourceHealth: candidateData.sourceHealth,
    prediction: predictionSummary,
    durationModelVersion: context.operationalBudget.durationModelVersion,
    weatherContext: input.weatherContext,
  });
}

export function buildVerifiedProofCalibrationContext(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
  plannerSnapshot: ReturnType<typeof buildRoutePlannerSnapshot>,
  plannerProof: ReturnType<typeof createRoutePlannerProof>,
): ProofContext["calibrationContext"] {
  return buildVerifiedRouteCalibrationContext({
    generatedAt: context.generatedAt,
    routeEngineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    volunteersExpected: input.volunteers,
    groupCount: input.groupCount,
    candidates: context.calibrationCandidates,
    plannerSnapshot,
    plannerSnapshotIntegrity: {
      status: "server_verified",
      proofVersion: plannerProof.proofVersion,
      snapshotHash: plannerProof.snapshotHash,
      verifiedAt: context.generatedAt,
    },
  });
}
