import { NextResponse } from "next/server";
import {
  buildHotspots,
  buildProactiveAssistant,
  defaultRouteAssistantPayload,
} from "@/lib/route/recommendation-assistant";
import {
  resolveRouteDataLayers,
} from "@/lib/route/route-data-status";
import {
  applyOriginRouteGeometryLegs,
  type RouteStop,
} from "@/lib/route/route-contract";
import { ROUTE_PLANNER_ENGINE_VERSION } from "@/lib/route/route-planner";
import type { RoutePlannerOrigin } from "@/lib/route/route-planner";
import type {
  RouteMultiRouteMetrics,
  RouteRecommendationResponse,
} from "@/lib/route/route-response-contract";
import {
  buildRouteRecommendationTrace,
  type RouteMultiRouteTrace,
  type RouteTraceCandidateSummary,
} from "@/lib/route/route-trace";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import type { RouteEventPressureContext, RouteCandidateData } from "./route.candidates";
import type { RoutePlanningResult } from "./route.planning";

function buildStops(
  plannedStops: RoutePlanningResult["plannedStops"],
): RouteStop[] {
  return plannedStops.map(
    ({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
      id: candidate.id,
      label: candidate.label,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      segmentKm: Number(incrementalDistanceKm.toFixed(2)),
      estimatedMinutes: Math.max(0, Math.round(incrementalTravelMinutes)),
      priorityReason: candidate.reason,
      score: Number(candidate.score.toFixed(2)),
      evidence: candidate.evidence,
    }),
  );
}

function buildTraceCandidateSummary(
  candidateData: RouteCandidateData,
  plannerResult: RoutePlanningResult["plannerResult"],
): RouteTraceCandidateSummary {
  const actionableCandidates = candidateData.actionableCandidates ?? candidateData.candidates;
  const excludedByReason: Record<string, number> = {
    not_admissible: Math.max(0, candidateData.contracts.length - actionableCandidates.length),
    unsafe_trained_only: 0,
    unsafe_no_pickup: 0,
    unsafe_missing_categories: 0,
    unsafe_unknown_categories: 0,
    travel_budget: plannerResult.diagnostics.excludedByTravelBudget,
  };
  for (const candidate of actionableCandidates) {
    const reason = candidate.safety.specializationReason;
    if (reason) {
      const key = `unsafe_${reason}`;
      excludedByReason[key] = (excludedByReason[key] ?? 0) + 1;
    }
  }
  if (candidateData.sourceHealth.partial) excludedByReason.source_unavailable = 1;
  return {
    loaded: candidateData.contracts.length,
    admissible: candidateData.candidates.length,
    excluded: Object.entries(excludedByReason).reduce(
      (total, [reason, count]) => total + (reason === "source_unavailable" ? 0 : count),
      0,
    ),
    excludedByReason,
  };
}

function buildMultiRouteTrace(
  groupRoutes: NonNullable<RoutePlanningResult["groupRoutes"]>,
  metrics: RouteMultiRouteMetrics,
): RouteMultiRouteTrace {
  return {
    groupCount: metrics.groupCount,
    volunteers: metrics.volunteers,
    groups: groupRoutes.map((group) => ({
      groupIndex: group.groupIndex,
      volunteerCount: group.volunteerCount,
      candidateIds: [...group.candidateIds],
      reservedCandidateIds: [...group.reservedCandidateIds],
      distanceKm: group.travelDistanceKm,
      durationMinutes: group.travelMinutes,
      targetCount: group.targetCount,
      routeMode: group.routeGeometry.mode,
      withinBudget: group.withinBudget,
    })),
    metrics: {
      coverageGain: metrics.coverageGain,
      sharedTargetRatio: metrics.sharedTargetRatio,
      sharedDistanceKm: metrics.sharedDistanceKm,
      sharedDistanceRatio: metrics.sharedDistanceRatio,
      balanceDistance: metrics.balanceDistance,
      balanceDuration: metrics.balanceDuration,
      balanceTargetCount: metrics.balanceTargetCount,
      balanceVolunteerCount: metrics.balanceVolunteerCount,
      networkDistanceMeasured: metrics.networkDistanceMeasured,
    },
    constraints: [
      "Chaque groupe conserve une origine commune et une boucle fermée.",
      "Un stop ne peut être attribué qu'à un seul groupe par défaut.",
      "La sécurité et le budget individuel priment sur la diversité des groupes.",
    ],
  };
}

const EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT = {
  candidatePressureById: new Map(),
  completedEventsConsidered: 0,
  geolocatedCompletedEvents: 0,
  eventsWithoutCoordinates: 0,
  futureEventSignals: [],
  sourceAvailable: false,
  warnings: ["Le signal événementiel est indisponible pour ce calcul."],
};

export function buildRouteRecommendationResponse(input: {
  origin: RoutePlannerOrigin;
  locationPreference: { arrondissement?: number | null } | null;
  eventPressureContext: RouteEventPressureContext;
  candidateData: RouteCandidateData;
  planning: RoutePlanningResult;
  planningMode?: RoutePlanningMode;
  maxStops: number;
  travelBudgetMinutes: number;
  priorityVsTravel: number;
  volunteers: number;
  groupCount: number;
}): NextResponse {
  const {
    origin,
    locationPreference,
    eventPressureContext,
    candidateData,
    planning,
    planningMode = { type: "free" },
    maxStops,
    travelBudgetMinutes,
    priorityVsTravel,
    volunteers,
    groupCount,
  } = input;
  const { plannedStops, routeGeometry, plannerResult } = planning;
  const groupRoutes = planning.groupRoutes ?? [];
  const multiRoute: RouteMultiRouteMetrics = planning.multiRouteMetrics ?? {
    groupCount,
    volunteers,
    totalDistanceKm: routeGeometry.distanceKm,
    totalDurationMinutes: routeGeometry.durationMinutes,
    coverageGain: planning.groupPartition.metrics.coverageGain,
    sharedTargetRatio: planning.groupPartition.metrics.sharedTargetRatio,
    sharedDistanceKm: null,
    sharedDistanceRatio: null,
    balanceDistance: planning.groupPartition.metrics.balanceDistance,
    balanceDuration: planning.groupPartition.metrics.balanceDuration,
    balanceTargetCount: planning.groupPartition.metrics.balanceTargetCount,
    balanceVolunteerCount: 0,
    fallbackGroupCount: routeGeometry.mode === "fallback" ? 1 : 0,
    networkDistanceMeasured: false,
  };
  const multiRouteTrace = groupRoutes.length > 1
    ? buildMultiRouteTrace(groupRoutes, multiRoute)
    : null;
  const { candidates, contracts, dataStatus, isTruncated, sourceHealth } =
    candidateData;
  const predictionSummary = {
    ...planning.predictionSummary,
    selected: plannedStops.filter(({ candidate }) => candidate.family === "predicted")
      .length,
    selectedCandidateIds: plannedStops
      .filter(({ candidate }) => candidate.family === "predicted")
      .map(({ candidate }) => candidate.id),
  };
  const trace = buildRouteRecommendationTrace({
    engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    planningMode,
    origin,
    travelBudgetMinutes,
    maxStops,
    priorityVsTravel,
    candidateSummary: buildTraceCandidateSummary(candidateData, plannerResult),
    plannerResult,
    selectedStops: groupCount === 1 ? plannedStops : [],
    routeGeometry,
    consumedTravelMinutes: Math.max(multiRoute.totalDurationMinutes, 0),
    budgetPrefixApplied: planning.budgetPrefixApplied,
    sourceHealth,
    eventSignalContext: candidateData.routeEventSignalContext ?? EMPTY_ROUTE_EVENT_SIGNAL_CONTEXT,
    eventCenteredContext: planning.eventCenteredContext,
    predictionSummary,
    finalRoutingReconciliation: planning.finalRoutingReconciliation,
    volunteers,
    groupCount,
    multiRoute: multiRouteTrace,
  });
  const dataLayers = resolveRouteDataLayers({
    observed: { candidateCount: candidates.length, isTruncated, sourceHealth },
    prediction: {
      status: predictionSummary.status,
      selectedCount: predictionSummary.selected,
    },
    selectedCount: plannedStops.length,
    routeGeometryMode: routeGeometry.mode,
  });
  const returnDistanceKm = routeGeometry.returnLeg?.distanceKm ?? 0;
  const returnMinutes = routeGeometry.returnLeg?.estimatedMinutes ?? 0;
  const budgetRemainingMinutes = Math.max(
    0,
    travelBudgetMinutes - Math.max(0, routeGeometry.durationMinutes),
  );
  const loop = {
    isLoop: true as const,
    origin,
    returnDistanceKm,
    returnMinutes,
    budgetRemainingMinutes,
  };

  if (plannedStops.length === 0) {
    const responsePayload = {
      isLoop: true as const,
      status: dataLayers.recommendation,
      planningMode,
      dataStatus,
      dataLayers,
      isTruncated,
      sourceHealth,
      origin,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes,
      volunteers,
      groupCount,
      loop,
      withinBudget: true,
      serviceMinutesEstimate: null,
      totalMinutesEstimate: null,
      diagnostics: {
        loaded: contracts.length,
        eligible: candidates.length,
        excluded: Math.max(0, contracts.length - candidates.length),
        selected: 0,
        sourcePartial: sourceHealth.partial,
        truncated: isTruncated,
        ...plannerResult.diagnostics,
      },
      generatedAt: new Date().toISOString(),
      engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
      stops: [],
      prediction: predictionSummary,
      trace,
      routeGeometry,
      scoreBreakdown: { priority: 0, distance: 0 },
      tradeoffs: [
        "Aucun point géolocalisé disponible dans la source consultée.",
      ],
      proactiveAssistant: {
        ...defaultRouteAssistantPayload(),
      },
      groups: planning.groupPartition.groups,
      partition: {
        metrics: planning.groupPartition.metrics,
        audit: planning.groupPartition.audit,
      },
      groupRoutes,
      multiRoute,
    } satisfies RouteRecommendationResponse;

    return NextResponse.json(responsePayload);
  }

  const stops = groupRoutes.length > 1
    ? groupRoutes.flatMap(({ stops: groupStops }) => groupStops)
    : applyOriginRouteGeometryLegs(buildStops(plannedStops), routeGeometry);
  const totalDistance = multiRoute.totalDistanceKm;
  const travelMinutes = Math.max(0, multiRoute.totalDurationMinutes);
  const averagePriority =
    plannedStops.reduce((acc, { candidate }) => acc + candidate.score, 0) /
    plannedStops.length;
  const distanceScore = Math.max(0, 100 - totalDistance * 5);
  const hotspots = buildHotspots({
    candidates,
    pressureByArrondissement: eventPressureContext.pressureByArrondissement,
    userArrondissement: locationPreference?.arrondissement ?? null,
  });
  const proactiveAssistant = buildProactiveAssistant({
    stops: plannedStops.map(({ candidate }) => ({
      label: candidate.label,
      score: candidate.score,
    })),
    hotspots,
    eventSignals: eventPressureContext.eventSignals,
  });

  const responsePayload = {
    isLoop: true as const,
    status: dataLayers.recommendation,
    planningMode,
    dataStatus,
    dataLayers,
    isTruncated,
    sourceHealth,
    origin,
    travelDistanceKm: totalDistance,
    travelMinutes,
    travelBudgetMinutes,
    volunteers,
    groupCount,
    loop,
    withinBudget: groupRoutes.length > 1
      ? groupRoutes.every(({ withinBudget }) => withinBudget)
      : travelMinutes <= travelBudgetMinutes,
    serviceMinutesEstimate: null,
    totalMinutesEstimate: null,
    diagnostics: {
      loaded: contracts.length,
      eligible: candidates.length,
      excluded: Math.max(0, contracts.length - candidates.length),
      selected: plannedStops.length,
      sourcePartial: sourceHealth.partial,
      truncated: isTruncated,
      ...plannerResult.diagnostics,
    },
    generatedAt: new Date().toISOString(),
    engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
    stops,
    prediction: predictionSummary,
    trace,
    routeGeometry,
    scoreBreakdown: {
      priority: Number(averagePriority.toFixed(1)),
      distance: Number(distanceScore.toFixed(1)),
    },
    tradeoffs: [
      `Pondération opérationnelle: ${priorityVsTravel}% priorité / ${100 - priorityVsTravel}% déplacement.`,
    ],
    proactiveAssistant,
    groups: planning.groupPartition.groups,
    partition: {
      metrics: planning.groupPartition.metrics,
      audit: planning.groupPartition.audit,
    },
    groupRoutes,
    multiRoute,
  } satisfies RouteRecommendationResponse;

  return NextResponse.json(responsePayload);
}
