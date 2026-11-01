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

function finalGeometryTotals(context: OperationalContext): {
  distanceKm: number;
  durationMinutes: number;
} {
  if (context.groupRoutes.length === 0) {
    return {
      distanceKm: context.multiRoute.totalDistanceKm,
      durationMinutes: context.multiRoute.totalDurationMinutes,
    };
  }
  return context.groupRoutes.reduce(
    (totals, group) => ({
      distanceKm: totals.distanceKm + Math.max(0, group.routeGeometry.distanceKm),
      durationMinutes: totals.durationMinutes + Math.max(0, group.routeGeometry.durationMinutes),
    }),
    { distanceKm: 0, durationMinutes: 0 },
  );
}

function guidedGroupsWithinBudget(
  input: RouteRecommendationResponseInput,
  context: OperationalContext,
): boolean | null {
  if (input.planningMode?.type !== "territorial-guided") return null;
  return context.groupRoutes.length > 0 && context.groupRoutes.every((group) =>
    group.withinBudget && group.guidedRouting?.budget.withinBudget === true,
  );
}

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
  const routeTopology = input.routeTopology ?? (planning.routeGeometry.isLoop ? "loop" : "open");
  const arrival = input.arrival
    ? { ...input.arrival, source: input.arrival.source }
    : planning.routeGeometry.isLoop
      ? { ...input.origin, source: "planner" as const }
      : planning.routeGeometry.coordinates.at(-1)
        ? {
            latitude: planning.routeGeometry.coordinates.at(-1)![0],
            longitude: planning.routeGeometry.coordinates.at(-1)![1],
            source: "planner" as const,
          }
        : null;
  const loop = {
    isLoop: routeTopology === "loop",
    origin: input.origin,
    returnDistanceKm: routeTopology === "loop" ? planning.routeGeometry.returnLeg?.distanceKm ?? 0 : 0,
    returnMinutes: routeTopology === "loop" ? planning.routeGeometry.returnLeg?.estimatedMinutes ?? 0 : 0,
    budgetRemainingMinutes: Math.max(
      0,
      input.travelBudgetMinutes - Math.max(0, planning.routeGeometry.durationMinutes),
    ),
  };
  return {
    isLoop: routeTopology === "loop",
    routeTopology,
    status: proofs.dataLayers.recommendation,
    planningMode: input.planningMode ?? { type: "free" },
    dataStatus: candidateData.dataStatus,
    dataLayers: proofs.dataLayers,
    isTruncated: candidateData.isTruncated,
    sourceHealth: candidateData.sourceHealth,
    origin: input.origin,
    arrival,
    travelDistanceKm,
    travelMinutes,
    travelBudgetMinutes: input.travelBudgetMinutes,
    ...(input.guidedBudget ? { guidedBudget: input.guidedBudget } : {}),
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
    meetingPoint: context.groupRoutes.length === 1
      ? context.groupRoutes[0]?.meetingPoint ?? null
      : null,
    meetingOpportunities: context.groupRoutes.length === 1
      ? context.groupRoutes[0]?.meetingOpportunities ?? []
      : [],
    meetingOpportunityTrace: context.groupRoutes.length === 1
      ? context.groupRoutes[0]?.meetingOpportunityTrace
      : undefined,
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
  const { distanceKm: totalDistance, durationMinutes: finalTravelMinutes } = finalGeometryTotals(context);
  const travelMinutes = Math.max(0, finalTravelMinutes);
  const hasScientificStops = planning.plannedStops.length > 0;
  const averagePriority = hasScientificStops
    ? planning.plannedStops.reduce((acc, { candidate }) => acc + candidate.score, 0) /
      planning.plannedStops.length
    : 0;
  const hotspots = hasScientificStops
    ? buildHotspots({
        candidates: candidateData.candidates,
        pressureByArrondissement: input.eventPressureContext.pressureByArrondissement,
        userArrondissement: input.locationPreference?.arrondissement ?? null,
      })
    : [];
  const proactiveAssistant = hasScientificStops
    ? buildProactiveAssistant({
        stops: planning.plannedStops.map(({ candidate }) => ({
          label: candidate.label,
          score: candidate.score,
        })),
        hotspots,
        eventSignals: input.eventPressureContext.eventSignals,
      })
    : { ...defaultRouteAssistantPayload() };
  const guidedWithinBudget = guidedGroupsWithinBudget(input, context);
  const guidedWarnings = [...new Set(
    context.groupRoutes
      .map(({ guidedRouting }) => guidedRouting?.warning)
      .filter((warning): warning is string => Boolean(warning)),
  )];
  const tradeoffs = hasScientificStops
    ? [
        `Pondération opérationnelle: ${input.priorityVsTravel}% priorité / ${100 - input.priorityVsTravel}% déplacement.`,
        ...guidedWarnings,
      ]
    : ["Parcours guidé planifié sans signalement admissible.", ...guidedWarnings];
  return buildCommonPayload({
    input,
    context,
    proofs,
    withinBudget: guidedWithinBudget ?? (context.groupRoutes.length > 1
      ? context.groupRoutes.every(({ withinBudget }) => withinBudget)
      : context.operationalBudget.withinBudget ?? travelMinutes <= input.travelBudgetMinutes),
    travelDistanceKm: totalDistance,
    travelMinutes,
    stops: proofs.snapshotStops,
    scoreBreakdown: hasScientificStops
      ? {
          priority: Number(averagePriority.toFixed(1)),
          distance: Number(Math.max(0, 100 - totalDistance * 5).toFixed(1)),
        }
      : { priority: 0, distance: 0 },
    tradeoffs,
    proactiveAssistant,
  });
}
