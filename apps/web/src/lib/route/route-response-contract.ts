import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type {
  RouteDataLayers,
  RouteDataStatus,
  RouteRecommendationStatus,
} from "./route-data-status";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RouteRecommendationTrace } from "./route-trace";
import type { RoutePlanningMode } from "./route-planning-mode";
import type {
  RouteGroupAssignment,
  RoutePartitionAudit,
  RoutePartitionMetrics,
} from "./route-group-partition";

/** Shared HTTP input contract for the route recommendation boundary. */
export type RouteRecommendationRequest = {
  origin?: RouteRecommendationOrigin;
  travelBudgetMinutes?: number;
  maxStops?: number;
  priorityVsTravel?: number;
  priorityVsDistance?: number;
  planningMode?: RoutePlanningMode;
  riskFocus?: "all" | "waste" | "cigaretteButts";
  volunteers?: number;
  groupCount?: number;
};

export type RouteOptions = {
  priorityVsTravel: number;
  travelBudgetMinutes: number;
  maxStops: number;
  volunteers: number;
  groupCount: number;
};

export type RouteResponseOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map" | "approximate_saved_area";
};

export type RouteRecommendationOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map";
};

export type RouteOriginMode = "browser" | "map";

export type RouteRecommendationResponse = {
  isLoop: true;
  planningMode: RoutePlanningMode;
  status: RouteRecommendationStatus;
  dataStatus: RouteDataStatus;
  dataLayers: RouteDataLayers;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
  origin: RouteResponseOrigin;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  volunteers: number;
  groupCount: number;
  loop: {
    isLoop: true;
    origin: RouteResponseOrigin;
    returnDistanceKm: number;
    returnMinutes: number;
    budgetRemainingMinutes: number;
  };
  withinBudget: boolean;
  serviceMinutesEstimate: null;
  totalMinutesEstimate: null;
  diagnostics: {
    loaded: number;
    eligible: number;
    excluded: number;
    selected: number;
    sourcePartial: boolean;
    truncated: boolean;
    excludedUnsafe: number;
    excludedByTravelBudget: number;
  };
  generatedAt: string;
  engineVersion: string;
  stops: RouteStop[];
  prediction: RoutePredictionSummary;
  trace: RouteRecommendationTrace;
  routeGeometry: RouteGeometry;
  scoreBreakdown: {
    priority: number;
    distance: number;
  };
  tradeoffs: string[];
  proactiveAssistant: {
    actNow: string;
    criticalNearby: string;
    mostUsefulAction: string;
    operationalSignalZones: string[];
    upcomingEvents: string[];
    hotspots: Array<{
      zoneLabel: string;
      operationalSignalScore: number;
      recentActions: number;
      recentSpots: number;
      eventPressure: number;
      distanceKm: number | null;
      reason: string;
    }>;
  };
  groups: RouteGroupAssignment[];
  groupRoutes: RouteGroupRoute[];
  multiRoute: RouteMultiRouteMetrics;
  partition: {
    metrics: RoutePartitionMetrics;
    audit: RoutePartitionAudit;
  };
};

export type RouteGroupRoute = RouteGroupAssignment & {
  reservedCandidateIds: string[];
  stops: RouteStop[];
  routeGeometry: RouteGeometry;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  withinBudget: boolean;
};

export type RouteMultiRouteMetrics = {
  groupCount: number;
  volunteers: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  coverageGain: number;
  sharedTargetRatio: number;
  sharedDistanceKm: number | null;
  sharedDistanceRatio: number | null;
  balanceDistance: number;
  balanceDuration: number;
  balanceTargetCount: number;
  balanceVolunteerCount: number;
  fallbackGroupCount: number;
  networkDistanceMeasured: boolean;
};

export type RouteResponse = RouteRecommendationResponse;

export type {
  RouteGeometry,
  RouteStop,
} from "./route-contract";
