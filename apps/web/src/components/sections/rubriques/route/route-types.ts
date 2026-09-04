import type {
  RouteGeometry,
  RouteStop,
} from "@/lib/route/route-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type {
  RouteDataStatus,
  RouteRecommendationStatus,
} from "@/lib/route/route-data-status";
import type { RouteRecommendationTrace } from "@/lib/route/route-trace";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import type {
  RoutePredictionSummary,
  RouteRiskFocus,
} from "@/lib/route/route-predicted-targets";

export type { RoutePlanningMode } from "@/lib/route/route-planning-mode";

export type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";

export type RouteOptions = {
  priorityVsTravel: number;
  travelBudgetMinutes: number;
  maxStops: number;
  riskFocus?: RouteRiskFocus;
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

export type RouteResponse = {
  planningMode: RoutePlanningMode;
  status: RouteRecommendationStatus;
  dataStatus: RouteDataStatus;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
  origin: RouteResponseOrigin;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  withinBudget: boolean;
  serviceMinutesEstimate: null;
  totalMinutesEstimate: null;
  trace: RouteRecommendationTrace;
  /** Present on responses produced by the current API; optional for legacy cached payloads. */
  prediction?: RoutePredictionSummary;
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
};
