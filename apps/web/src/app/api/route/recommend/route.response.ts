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
    }),
  );
}

export function buildRouteRecommendationResponse(input: {
  origin: RoutePlannerOrigin;
  locationPreference: { arrondissement?: number | null } | null;
  eventPressureContext: RouteEventPressureContext;
  candidateData: RouteCandidateData;
  planning: RoutePlanningResult;
  travelBudgetMinutes: number;
  priorityVsTravel: number;
}): NextResponse {
  const {
    origin,
    locationPreference,
    eventPressureContext,
    candidateData,
    planning,
    travelBudgetMinutes,
    priorityVsTravel,
  } = input;
  const { plannedStops, routeGeometry, plannerResult } = planning;
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
  const dataLayers = resolveRouteDataLayers({
    observed: { candidateCount: candidates.length, isTruncated, sourceHealth },
    prediction: {
      status: predictionSummary.status,
      selectedCount: predictionSummary.selected,
    },
    selectedCount: plannedStops.length,
    routeGeometryMode: routeGeometry.mode,
  });

  if (plannedStops.length === 0) {
    return NextResponse.json({
      status: dataLayers.recommendation,
      dataStatus,
      dataLayers,
      isTruncated,
      sourceHealth,
      origin,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes,
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
      routeGeometry,
      scoreBreakdown: { priority: 0, distance: 0 },
      tradeoffs: [
        "Aucun point géolocalisé disponible dans la source consultée.",
      ],
      proactiveAssistant: {
        ...defaultRouteAssistantPayload(),
      },
    });
  }

  const stops = applyOriginRouteGeometryLegs(
    buildStops(plannedStops),
    routeGeometry,
  );
  const totalDistance = routeGeometry.distanceKm;
  const travelMinutes = Math.min(
    Math.max(0, routeGeometry.durationMinutes),
    travelBudgetMinutes,
  );
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

  return NextResponse.json({
    status: dataLayers.recommendation,
    dataStatus,
    isTruncated,
    sourceHealth,
    origin,
    travelDistanceKm: totalDistance,
    travelMinutes,
    travelBudgetMinutes,
    withinBudget: travelMinutes <= travelBudgetMinutes,
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
    routeGeometry,
    scoreBreakdown: {
      priority: Number(averagePriority.toFixed(1)),
      distance: Number(distanceScore.toFixed(1)),
    },
    tradeoffs: [
      `Pondération opérationnelle: ${priorityVsTravel}% priorité / ${100 - priorityVsTravel}% déplacement.`,
    ],
    proactiveAssistant,
  });
}
