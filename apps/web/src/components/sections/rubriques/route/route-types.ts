import type {
  RouteGeometry,
  RouteStop,
} from "@/lib/route/route-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataStatus } from "@/lib/route/route-data-status";

export type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";

export type RouteOptions = {
  priorityVsDistance: number;
  maxStops: number;
};

export type RouteResponse = {
  status: "ok";
  dataStatus: RouteDataStatus;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
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
