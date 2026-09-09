import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type {
  RouteGeometry,
  RouteGeometryLeg,
  RouteGeometryStep,
} from "./route-contract";
import {
  routeDistanceKm,
  travelMinutesForDistance,
  type PlannedRouteStop,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "./route-planner";
import type {
  RouteEventPressureContribution,
  RouteEventSignalContext,
} from "./route-event-pressure";
import type {
  RouteEventCenteredContext,
} from "./route-event-centered";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { ParisPressureAtPoint } from "@/lib/geo/paris-pressure-lookup";
import type { ParisPressureSnapshot } from "@/lib/geo/paris-pressure-contract";
import type {
  RoutePredictionSummary,
  RouteTargetEvidence,
  RouteRiskFocus,
} from "./route-predicted-targets";
import type { VolunteerAdditionalityResult } from "@/lib/geo/volunteer-additionality-contract";
import type { RoutePickupPreference } from "./route-pickup-preference";
import {
  buildCleanupWorkload,
  type CleanupWorkload,
} from "./route-cleanup-workload";

export type RouteTraceExclusionReason =
  | "not_admissible"
  | "unsafe_trained_only"
  | "unsafe_no_pickup"
  | "unsafe_missing_categories"
  | "unsafe_unknown_categories"
  | "travel_budget"
  | "source_unavailable";

export type RouteTraceCandidateSummary = {
  loaded: number;
  admissible: number;
  excluded: number;
  excludedByReason: Partial<Record<RouteTraceExclusionReason, number>>;
};

export type RouteTraceSelectedStop = {
  step: number;
  id: string;
  criteriaUsed: ["priority_score", "incremental_travel_cost", "return_travel_cost"];
  normalizedScoreComponents: {
    priority: number;
    travel: number;
  };
  combinedScore: number;
  pollutionPriority?: number;
  volunteerAdditionality?: number | null;
  finalPlannerContribution?: number;
  volunteerAdditionalityConfidence?: number | null;
  additionalityWeight?: number;
  additionality?: VolunteerAdditionalityResult;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
  returnDistanceKm: number;
  returnTravelMinutes: number;
  loopDistanceKm: number;
  loopTravelMinutes: number;
  budgetAfterReturnMinutes: number;
  budgetBeforeMinutes: number;
  budgetAfterMinutes: number;
  reason: string;
  eventContributions: RouteEventPressureContribution[];
  eventScoreContribution: number;
  parisPressure?: ParisPressureAtPoint | null;
  targetFamily?: "observed" | "predicted";
  evidence?: RouteTargetEvidence;
  cleanupWorkload: CleanupWorkload;
};

export type RouteTraceSegment = {
  from: "origin" | string;
  to: "origin" | string;
  distanceKm: number | null;
  durationMinutes: number | null;
  measured: boolean;
  streetSteps: RouteGeometryStep[];
};

export type RouteFinalRoutingReconciliation = {
  stopsBefore: number;
  stopsAfter: number;
  excludedCandidateIds: string[];
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  finalGeometryMode: RouteGeometry["mode"];
  degraded: boolean;
  warning: string | null;
};

export type RouteMultiRouteTrace = {
  groupCount: number;
  volunteers: number;
  groups: Array<{
    groupIndex: number;
    volunteerCount: number;
    candidateIds: string[];
    reservedCandidateIds: string[];
    distanceKm: number;
    durationMinutes: number;
    targetCount: number;
    routeMode: RouteGeometry["mode"];
    withinBudget: boolean;
  }>;
  metrics: {
    coverageGain: number;
    sharedTargetRatio: number;
    sharedDistanceKm: number | null;
    sharedDistanceRatio: number | null;
    balanceDistance: number;
    balanceDuration: number;
    balanceTargetCount: number;
    balanceVolunteerCount: number;
    networkDistanceMeasured: boolean;
  };
  constraints: string[];
};

export type RouteRecommendationTrace = {
  isLoop: true;
  engineVersion: string;
  planningMode: RoutePlanningMode;
  parameters: {
    travelBudgetMinutes: number;
    maxStops: number;
    priorityVsTravel: number;
    pickupPreference: RoutePickupPreference;
    effectiveRiskFocus: RouteRiskFocus;
    volunteers?: number;
    groupCount?: number;
  };
  origin: RoutePlannerOrigin;
  candidates: RouteTraceCandidateSummary;
  selectedStops: RouteTraceSelectedStop[];
  ordering: {
    stopIds: string[];
    criteria: [
      "combined_score_desc",
      "priority_desc",
      "incremental_travel_asc",
      "id_lexicographic",
    ];
  };
  budget: {
    requestedMinutes: number;
    consumedMinutes: number;
    remainingMinutes: number;
  };
  loop: {
    isLoop: true;
    origin: RoutePlannerOrigin;
    returnDistanceKm: number;
    returnMinutes: number;
    budgetRemainingMinutes: number;
  };
  distance: {
    totalKm: number;
    segmentsTotalKm: number | null;
  };
  duration: {
    networkMinutes: number | null;
    estimatedMinutes: number | null;
    serviceMinutes: null;
    totalMinutes: number | null;
  };
  routing: {
    provider: RouteGeometry["provider"];
    profile: RouteGeometry["profile"];
    mode: RouteGeometry["mode"];
    estimated: boolean;
    parameters: {
      walkingSpeedKmPerHour: 4.5;
      coordinateCount: number;
      budgetPrefixApplied: boolean;
    };
    opaqueProviderDecisions: string[];
    degradations: string[];
  };
  segments: RouteTraceSegment[];
  warnings: string[];
  approximations: string[];
  fallbacks: string[];
  eventSignal: {
    completedEventsConsidered: number;
    geolocatedCompletedEvents: number;
    eventsWithoutCoordinates: number;
    sourceAvailable: boolean;
    recentWindowDays: number;
    signalHorizonDays: number;
    spatialRadiusKm: number;
    maxScoreBoost: number;
  };
  eventCentered: RouteEventCenteredContext | null;
  spatialPrior: {
    snapshotId: string;
    schemaVersion: ParisPressureSnapshot["schemaVersion"];
    geographicLevel: ParisPressureSnapshot["geographicLevel"];
    sourceStatus: Record<string, ParisPressureSnapshot["sources"][number]["status"]>;
    note: string;
  } | null;
  prediction?: RoutePredictionSummary | null;
  finalRoutingReconciliation: RouteFinalRoutingReconciliation;
  multiRoute: RouteMultiRouteTrace | null;
};

export type BuildRouteRecommendationTraceInput = {
  engineVersion: string;
  planningMode?: RoutePlanningMode;
  origin: RoutePlannerOrigin;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  pickupPreference?: RoutePickupPreference;
  effectiveRiskFocus?: RouteRiskFocus;
  candidateSummary: RouteTraceCandidateSummary;
  plannerResult: RoutePlannerResult;
  selectedStops: PlannedRouteStop[];
  routeGeometry: RouteGeometry;
  consumedTravelMinutes: number;
  budgetPrefixApplied: boolean;
  sourceHealth: UnifiedSourceHealth;
  eventSignalContext?: RouteEventSignalContext;
  eventCenteredContext?: RouteEventCenteredContext | null;
  spatialPrior?: RouteRecommendationTrace["spatialPrior"];
  predictionSummary?: RoutePredictionSummary | null;
  finalRoutingReconciliation?: RouteFinalRoutingReconciliation;
  volunteers?: number;
  groupCount?: number;
  multiRoute?: RouteMultiRouteTrace | null;
};

const EMPTY_EVENT_SIGNAL_CONTEXT: RouteEventSignalContext = {
  candidatePressureById: new Map(),
  completedEventsConsidered: 0,
  geolocatedCompletedEvents: 0,
  eventsWithoutCoordinates: 0,
  futureEventSignals: [],
  sourceAvailable: true,
  warnings: [],
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

function routeLegForIndex(
  legs: RouteGeometryLeg[],
  index: number,
): RouteGeometryLeg | undefined {
  const leg = legs[index];
  return leg?.toStopIndex === index + 1 ? leg : undefined;
}

function buildSegments(
  origin: RoutePlannerOrigin,
  selectedStops: PlannedRouteStop[],
  geometry: RouteGeometry,
): RouteTraceSegment[] {
  const outboundSegments = selectedStops.map((stop, index) => {
    const leg = routeLegForIndex(geometry.legs, index);
    if (leg) {
      return {
        from: index === 0 ? "origin" : selectedStops[index - 1]!.candidate.id,
        to: stop.candidate.id,
        distanceKm: leg.distanceKm,
        durationMinutes: leg.estimatedMinutes,
        measured: geometry.mode === "network",
        streetSteps: geometry.mode === "network" ? leg.steps ?? [] : [],
      };
    }

    if (geometry.mode === "network") {
      return {
        from: index === 0 ? "origin" : selectedStops[index - 1]!.candidate.id,
        to: stop.candidate.id,
        distanceKm: null,
        durationMinutes: null,
        measured: false,
        streetSteps: [],
      };
    }

    const from =
      index === 0 ? origin : selectedStops[index - 1]!.candidate;
    const distanceKm = routeDistanceKm(from, stop.candidate);
    return {
      from: index === 0 ? "origin" : selectedStops[index - 1]!.candidate.id,
      to: stop.candidate.id,
      distanceKm: round(distanceKm),
      durationMinutes: round(travelMinutesForDistance(distanceKm)),
      measured: false,
      streetSteps: [],
    };
  });

  if (selectedStops.length === 0) return outboundSegments;

  const lastStop = selectedStops.at(-1)!.candidate;
  const returnLeg =
    routeLegForIndex(geometry.legs, selectedStops.length) ??
    geometry.returnLeg ??
    undefined;
  if (returnLeg) {
    outboundSegments.push({
      from: lastStop.id,
      to: "origin",
      distanceKm: returnLeg.distanceKm,
      durationMinutes: returnLeg.estimatedMinutes,
      measured: geometry.mode === "network",
      streetSteps: geometry.mode === "network" ? returnLeg.steps ?? [] : [],
    });
    return outboundSegments;
  }

  if (geometry.mode === "network") {
    outboundSegments.push({
      from: lastStop.id,
      to: "origin",
      distanceKm: null,
      durationMinutes: null,
      measured: false,
      streetSteps: [],
    });
    return outboundSegments;
  }

  const returnDistanceKm = routeDistanceKm(lastStop, origin);
  outboundSegments.push({
    from: lastStop.id,
    to: "origin",
    distanceKm: round(returnDistanceKm),
    durationMinutes: round(travelMinutesForDistance(returnDistanceKm)),
    measured: false,
    streetSteps: [],
  });
  return outboundSegments;
}

function selectionForStop(
  stop: PlannedRouteStop,
  step: number,
  plannerResult: RoutePlannerResult,
  eventSignalContext: RouteEventSignalContext,
): RouteTraceSelectedStop {
  const selection = plannerResult.audit?.selections.find(
    (item) => item.candidateId === stop.candidate.id && item.step === step,
  );
  if (!selection) {
    throw new Error(
      `Route planner did not provide selection evidence for ${stop.candidate.id}`,
    );
  }
  return {
    step,
    id: stop.candidate.id,
    criteriaUsed: ["priority_score", "incremental_travel_cost", "return_travel_cost"],
    normalizedScoreComponents: {
      priority: selection.normalizedPriority,
      travel: selection.normalizedTravel,
    },
    combinedScore: selection.combinedScore,
    pollutionPriority: selection.pollutionPriority ?? stop.candidate.pollutionPriority ?? stop.candidate.score,
    volunteerAdditionality: selection.volunteerAdditionality ?? stop.candidate.volunteerAdditionality ?? null,
    finalPlannerContribution: selection.finalPlannerContribution ?? stop.candidate.finalPlannerContribution ?? stop.candidate.score,
    volunteerAdditionalityConfidence: stop.candidate.volunteerAdditionalityConfidence ?? null,
    additionalityWeight: stop.candidate.additionalityWeight ?? 0,
    additionality: stop.candidate.additionality,
    incrementalDistanceKm: selection.incrementalDistanceKm,
    incrementalTravelMinutes: selection.incrementalTravelMinutes,
    cumulativeTravelMinutes: selection.cumulativeTravelMinutes,
    returnDistanceKm: selection.returnDistanceKm,
    returnTravelMinutes: selection.returnTravelMinutes,
    loopDistanceKm: selection.loopDistanceKm,
    loopTravelMinutes: selection.loopTravelMinutes,
    budgetAfterReturnMinutes: selection.budgetAfterReturnMinutes,
    budgetBeforeMinutes: selection.budgetBeforeMinutes,
    budgetAfterMinutes: selection.budgetAfterMinutes,
    reason: selection.selectionReason,
    eventContributions:
      eventSignalContext.candidatePressureById.get(stop.candidate.id)
        ?.contributions ?? [],
    eventScoreContribution:
      typeof (stop.candidate as { eventScoreContribution?: unknown })
        .eventScoreContribution === "number"
        ? (stop.candidate as unknown as { eventScoreContribution: number })
            .eventScoreContribution
        : eventSignalContext.candidatePressureById.get(stop.candidate.id)
              ?.scoreBoost ?? 0,
    parisPressure:
      ((stop.candidate as { parisPressure?: ParisPressureAtPoint | null })
        .parisPressure ?? null),
    targetFamily: stop.candidate.evidence?.family,
    evidence: stop.candidate.evidence,
    cleanupWorkload: buildCleanupWorkload(stop.candidate),
  };
}

export function buildRouteRecommendationTrace(
  input: BuildRouteRecommendationTraceInput,
): RouteRecommendationTrace {
  const eventSignalContext =
    input.eventSignalContext ?? EMPTY_EVENT_SIGNAL_CONTEXT;
  const orderingCriteria = input.plannerResult.audit?.orderingCriteria ?? [
    "combined_score_desc",
    "priority_desc",
    "incremental_travel_asc",
    "id_lexicographic",
  ];
  const selectedStops = input.selectedStops.map((stop, index) =>
    selectionForStop(
      stop,
      index + 1,
      input.plannerResult,
      eventSignalContext,
    ),
  );
  const fallbacks: string[] = [];
  const approximations: string[] = [];
  const warnings = [
    ...input.sourceHealth.warnings,
    ...eventSignalContext.warnings,
  ];
  const eventSignalUnavailable = !eventSignalContext.sourceAvailable;
  const finalRoutingReconciliation =
    input.finalRoutingReconciliation ?? {
      stopsBefore: input.selectedStops.length,
      stopsAfter: input.selectedStops.length,
      excludedCandidateIds: [],
      providerCalls: input.routeGeometry.mode === "network" ? 1 : 0,
      firstProviderMode: input.routeGeometry.mode,
      finalGeometryMode: input.routeGeometry.mode,
      degraded: false,
      warning: null,
    };

  if (input.origin.source === "approximate_saved_area") {
    approximations.push("origine = centre approximatif de la zone enregistrée");
  }
  if (input.routeGeometry.mode === "fallback") {
    fallbacks.push("fallback_route_geometry");
    approximations.push("distance et durée de déplacement estimées à 4,5 km/h");
  }
  if (input.budgetPrefixApplied) {
    fallbacks.push("budget_compatible_prefix");
    warnings.push("La route initiale a été réduite au préfixe compatible avec le budget.");
  }
  if (finalRoutingReconciliation.degraded) {
    fallbacks.push("final_routing_reconciliation_degraded");
    if (finalRoutingReconciliation.warning) {
      warnings.push(finalRoutingReconciliation.warning);
    }
  }
  if (input.routeGeometry.mode === "network") {
    warnings.push(
      "Le choix précis du tracé routier et les mesures de ses segments sont fournis par le fournisseur externe.",
    );
  }
  if (eventSignalContext.eventsWithoutCoordinates > 0) {
    warnings.push(
      `${eventSignalContext.eventsWithoutCoordinates} événement(s) terminé(s) sans coordonnées n’ont pas influencé la proximité.`,
    );
  }

  const segments = buildSegments(
    input.origin,
    input.selectedStops,
    input.routeGeometry,
  );
  const consumedMinutes = Math.max(0, input.consumedTravelMinutes);
  const knownSegmentDistances = segments.map(({ distanceKm }) => distanceKm);
  const segmentsTotalKm = knownSegmentDistances.every(
    (distanceKm): distanceKm is number => distanceKm !== null,
  )
    ? round(knownSegmentDistances.reduce((total, distanceKm) => total + distanceKm, 0))
    : null;

  if (eventSignalUnavailable) {
    fallbacks.push("event_signal_unavailable");
  }

  return {
    engineVersion: input.engineVersion,
    isLoop: true,
    planningMode: input.planningMode ?? { type: "free" },
    parameters: {
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxStops: input.maxStops,
      priorityVsTravel: input.priorityVsTravel,
      pickupPreference: input.pickupPreference ?? "balanced",
      effectiveRiskFocus:
        input.effectiveRiskFocus ?? input.predictionSummary?.riskFocus ?? "all",
      ...(input.volunteers !== undefined ? { volunteers: input.volunteers } : {}),
      ...(input.groupCount !== undefined ? { groupCount: input.groupCount } : {}),
    },
    origin: { ...input.origin },
    candidates: input.candidateSummary,
    selectedStops,
    ordering: {
      stopIds: input.selectedStops.map(({ candidate }) => candidate.id),
      criteria: orderingCriteria,
    },
    budget: {
      requestedMinutes: input.travelBudgetMinutes,
      consumedMinutes,
      remainingMinutes: Math.max(0, input.travelBudgetMinutes - consumedMinutes),
    },
    loop: {
      isLoop: true,
      origin: { ...input.origin },
      returnDistanceKm: input.routeGeometry.returnLeg?.distanceKm ?? 0,
      returnMinutes: input.routeGeometry.returnLeg?.estimatedMinutes ?? 0,
      budgetRemainingMinutes: Math.max(
        0,
        input.travelBudgetMinutes - consumedMinutes,
      ),
    },
    distance: {
      totalKm: input.routeGeometry.distanceKm,
      segmentsTotalKm,
    },
    duration: {
      networkMinutes:
        input.routeGeometry.mode === "network"
          ? input.routeGeometry.durationMinutes
          : null,
      estimatedMinutes:
        input.routeGeometry.mode === "fallback"
          ? input.routeGeometry.durationMinutes
          : null,
      serviceMinutes: null,
      totalMinutes: consumedMinutes,
    },
    routing: {
      provider: input.routeGeometry.provider,
      profile: input.routeGeometry.profile,
      mode: input.routeGeometry.mode,
      estimated: input.routeGeometry.estimated,
      parameters: {
        walkingSpeedKmPerHour: 4.5,
        coordinateCount: input.routeGeometry.coordinates.length,
        budgetPrefixApplied: input.budgetPrefixApplied,
      },
      opaqueProviderDecisions:
        input.routeGeometry.mode === "network"
          ? [
              "choix du tracé routier et mesures réseau déterminés par le fournisseur externe",
            ]
          : [],
      degradations: [...fallbacks],
    },
    segments,
    warnings: [...new Set(warnings)],
    approximations,
    fallbacks,
    eventSignal: {
      completedEventsConsidered: eventSignalContext.completedEventsConsidered,
      geolocatedCompletedEvents: eventSignalContext.geolocatedCompletedEvents,
      eventsWithoutCoordinates: eventSignalContext.eventsWithoutCoordinates,
      sourceAvailable: eventSignalContext.sourceAvailable,
      recentWindowDays: 16,
      signalHorizonDays: 56,
      spatialRadiusKm: 2,
      maxScoreBoost: 20,
    },
    eventCentered: input.eventCenteredContext ?? null,
    spatialPrior: input.spatialPrior ?? null,
    prediction: input.predictionSummary ?? null,
    finalRoutingReconciliation,
    multiRoute: input.multiRoute ?? null,
  };
}
