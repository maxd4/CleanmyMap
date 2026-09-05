import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type {
  RouteDataLayers,
  RouteDataStatus,
  RouteRecommendationStatus,
} from "./route-data-status";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RouteGeometry, RouteStop } from "./route-contract";

/** Shared HTTP input contract for the route recommendation boundary. */
export type RouteRecommendationRequest = {
  origin?: RouteRecommendationOrigin;
  travelBudgetMinutes?: number;
  maxStops?: number;
  priorityVsTravel?: number;
  priorityVsDistance?: number;
};

export type RouteOptions = {
  priorityVsTravel: number;
  travelBudgetMinutes: number;
  maxStops: number;
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
  status: RouteRecommendationStatus;
  dataStatus: RouteDataStatus;
  dataLayers: RouteDataLayers;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
  origin: RouteResponseOrigin;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
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

export type RouteResponse = RouteRecommendationResponse;

export type {
  RouteGeometry,
  RouteStop,
} from "./route-contract";
