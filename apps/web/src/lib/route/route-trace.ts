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
  criteriaUsed: ["priority_score", "incremental_travel_cost"];
  normalizedScoreComponents: {
    priority: number;
    travel: number;
  };
  combinedScore: number;
  incrementalDistanceKm: number;
  incrementalTravelMinutes: number;
  cumulativeTravelMinutes: number;
  budgetBeforeMinutes: number;
  budgetAfterMinutes: number;
  reason: string;
};

export type RouteTraceSegment = {
  from: "origin" | string;
  to: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  measured: boolean;
  streetSteps: RouteGeometryStep[];
};

export type RouteRecommendationTrace = {
  engineVersion: string;
  parameters: {
    travelBudgetMinutes: number;
    maxStops: number;
    priorityVsTravel: number;
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
};

export type BuildRouteRecommendationTraceInput = {
  engineVersion: string;
  origin: RoutePlannerOrigin;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  candidateSummary: RouteTraceCandidateSummary;
  plannerResult: RoutePlannerResult;
  selectedStops: PlannedRouteStop[];
  routeGeometry: RouteGeometry;
  consumedTravelMinutes: number;
  budgetPrefixApplied: boolean;
  sourceHealth: UnifiedSourceHealth;
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
  return selectedStops.map((stop, index) => {
    const leg =
      geometry.mode === "network"
        ? routeLegForIndex(geometry.legs, index)
        : undefined;
    if (leg) {
      return {
        from: index === 0 ? "origin" : selectedStops[index - 1]!.candidate.id,
        to: stop.candidate.id,
        distanceKm: leg.distanceKm,
        durationMinutes: leg.estimatedMinutes,
        measured: true,
        streetSteps: leg.steps ?? [],
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
}

function selectionForStop(
  stop: PlannedRouteStop,
  step: number,
  plannerResult: RoutePlannerResult,
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
    criteriaUsed: ["priority_score", "incremental_travel_cost"],
    normalizedScoreComponents: {
      priority: selection.normalizedPriority,
      travel: selection.normalizedTravel,
    },
    combinedScore: selection.combinedScore,
    incrementalDistanceKm: selection.incrementalDistanceKm,
    incrementalTravelMinutes: selection.incrementalTravelMinutes,
    cumulativeTravelMinutes: selection.cumulativeTravelMinutes,
    budgetBeforeMinutes: selection.budgetBeforeMinutes,
    budgetAfterMinutes: selection.budgetAfterMinutes,
    reason: selection.selectionReason,
  };
}

export function buildRouteRecommendationTrace(
  input: BuildRouteRecommendationTraceInput,
): RouteRecommendationTrace {
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
    ),
  );
  const fallbacks: string[] = [];
  const approximations: string[] = [];
  const warnings = [...input.sourceHealth.warnings];

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
  if (input.routeGeometry.mode === "network") {
    warnings.push(
      "Le choix précis du tracé routier et les mesures de ses segments sont fournis par le fournisseur externe.",
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

  return {
    engineVersion: input.engineVersion,
    parameters: {
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxStops: input.maxStops,
      priorityVsTravel: input.priorityVsTravel,
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
  };
}
