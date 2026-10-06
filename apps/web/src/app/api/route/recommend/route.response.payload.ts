import {
  buildHotspots,
  buildProactiveAssistant,
  defaultRouteAssistantPayload,
} from "@/lib/route/recommendation-assistant";
import { ROUTE_PLANNER_ENGINE_VERSION } from "@/lib/route/route-planner";
import {
  buildUnknownStreetCleaningCorridorHandoff,
} from "@/lib/route/street-cleaning-corridor";
import type { RouteStop } from "@/lib/route/route-contract";
import type { RouteRecommendationResponse } from "@/lib/route/route-response-contract";
import { ROUTE_ORGANIZATION_MARGIN_MINUTES } from "@/lib/route/route-operational-budget";
import {
  type OperationalContext,
  type ProofContext,
  type RouteRecommendationResponseInput,
} from "./route.response.builders";

type CommonPayloadInput = {
  input: RouteRecommendationResponseInput;
  context: OperationalContext;
  proofs: ProofContext;
  withinBudget: boolean;
  travelDistanceKm: number;
  travelMinutes: number;
  stops: RouteStop[];
  scoreBreakdown: RouteRecommendationResponse["scoreBreakdown"];
  tradeoffs: string[];
  proactiveAssistant: RouteRecommendationResponse["proactiveAssistant"];
};

function buildCommonPayload({
  input,
  context,
  proofs,
  withinBudget,
  travelDistanceKm,
  travelMinutes,
  stops,
  scoreBreakdown,
  tradeoffs,
  proactiveAssistant,
}: CommonPayloadInput): RouteRecommendationResponse {
  const { candidateData, planning } = input;
  const loop = {
    isLoop: true as const,
    origin: input.origin,
    returnDistanceKm: planning.routeGeometry.returnLeg?.distanceKm ?? 0,
    returnMinutes: planning.routeGeometry.returnLeg?.estimatedMinutes ?? 0,
    budgetRemainingMinutes: Math.max(
      0,
      input.travelBudgetMinutes - Math.max(0, planning.routeGeometry.durationMinutes),
    ),
  };
  return {
    isLoop: true,
    status: proofs.dataLayers.recommendation,
    planningMode: input.planningMode ?? { type: "free" },
    dataStatus: candidateData.dataStatus,
    dataLayers: proofs.dataLayers,
    isTruncated: candidateData.isTruncated,
    sourceHealth: candidateData.sourceHealth,
    origin: input.origin,
    travelDistanceKm,
    travelMinutes,
    travelBudgetMinutes: input.travelBudgetMinutes,
    volunteers: input.volunteers,
    groupCount: input.groupCount,
    constraintsApplied: { pickupPreference: input.pickupPreference },
    loop,
    withinBudget,
    serviceMinutesEstimate: context.operationalBudget.serviceMinutes,
    actionMinutesEstimate: context.operationalBudget.actionMinutes,
    eventBudgetMinutes: context.operationalBudget.eventBudgetMinutes ?? input.travelBudgetMinutes,
    actionBudgetMinutes: context.operationalBudget.actionBudgetMinutes ?? Math.max(0, input.travelBudgetMinutes - ROUTE_ORGANIZATION_MARGIN_MINUTES),
    organizationMarginMinutes: context.operationalBudget.organizationMarginMinutes,
    totalMinutesEstimate: context.operationalBudget.totalMinutes,
    operationalBudget: context.operationalBudget,
    diagnostics: {
      loaded: candidateData.contracts.length,
      eligible: candidateData.candidates.length,
      excluded: Math.max(0, candidateData.contracts.length - candidateData.candidates.length),
      selected: planning.plannedStops.length,
      sourcePartial: candidateData.sourceHealth.partial,
      truncated: candidateData.isTruncated,
      ...planning.plannerResult.diagnostics,
    },
    generatedAt: context.generatedAt,
    engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    calibrationContext: proofs.calibrationContext,
    plannerSnapshot: proofs.plannerSnapshot,
    plannerProof: proofs.plannerProof,
    ...(input.weatherContext ? { weatherContext: input.weatherContext } : {}),
    streetCleaningCorridors: input.planning.streetCleaningCorridors ?? buildUnknownStreetCleaningCorridorHandoff(),
    stops,
    prediction: proofs.predictionSummary,
    trace: proofs.trace,
    routeGeometry: planning.routeGeometry,
    scoreBreakdown,
    tradeoffs,
    proactiveAssistant,
    groups: planning.groupPartition.groups,
    partition: {
      metrics: planning.groupPartition.metrics,
      audit: planning.groupPartition.audit,
    },
    groupRoutes: context.groupRoutes,
    multiRoute: context.multiRoute,
  };
}

export function buildEmptyRouteResponsePayload(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
  proofs: ProofContext,
): RouteRecommendationResponse {
  return buildCommonPayload({
    input,
    context,
    proofs,
    withinBudget: true,
    travelDistanceKm: 0,
    travelMinutes: 0,
    stops: [],
    scoreBreakdown: { priority: 0, distance: 0 },
    tradeoffs: ["Aucun point géolocalisé disponible dans la source consultée."],
    proactiveAssistant: { ...defaultRouteAssistantPayload() },
  });
}

export function buildResultRouteResponsePayload(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
  proofs: ProofContext,
): RouteRecommendationResponse {
  const { candidateData, planning } = input;
  const totalDistance = context.multiRoute.totalDistanceKm;
  const travelMinutes = Math.max(0, context.multiRoute.totalDurationMinutes);
  const averagePriority = planning.plannedStops.reduce(
    (acc, { candidate }) => acc + candidate.score,
    0,
  ) / planning.plannedStops.length;
  const hotspots = buildHotspots({
    candidates: candidateData.candidates,
    pressureByArrondissement: input.eventPressureContext.pressureByArrondissement,
    userArrondissement: input.locationPreference?.arrondissement ?? null,
  });
  const proactiveAssistant = buildProactiveAssistant({
    stops: planning.plannedStops.map(({ candidate }) => ({
      label: candidate.label,
      score: candidate.score,
    })),
    hotspots,
    eventSignals: input.eventPressureContext.eventSignals,
  });
  return buildCommonPayload({
    input,
    context,
    proofs,
    withinBudget: context.groupRoutes.length > 1
      ? context.groupRoutes.every(({ withinBudget }) => withinBudget)
      : context.operationalBudget.withinBudget ?? travelMinutes <= input.travelBudgetMinutes,
    travelDistanceKm: totalDistance,
    travelMinutes,
    stops: proofs.snapshotStops,
    scoreBreakdown: {
      priority: Number(averagePriority.toFixed(1)),
      distance: Number(Math.max(0, 100 - totalDistance * 5).toFixed(1)),
    },
    tradeoffs: [
      `Pondération opérationnelle: ${input.priorityVsTravel}% priorité / ${100 - input.priorityVsTravel}% déplacement.`,
    ],
    proactiveAssistant,
  });
}
