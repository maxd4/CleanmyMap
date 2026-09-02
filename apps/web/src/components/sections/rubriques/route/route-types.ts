import type {
  RouteGeometry,
  RouteStop,
} from "@/lib/route/route-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataStatus } from "@/lib/route/route-data-status";

export type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";

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

export type RouteResponse = {
  status: "ok";
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
  diagnostics: {
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
