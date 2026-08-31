import type {
  RouteGeometry,
  RouteStop,
} from "@/lib/route/route-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataStatus } from "@/lib/route/route-data-status";

export type { RouteGeometry, RouteStop } from "@/lib/route/route-contract";

export type RouteConstraints = {
  availableMinutes: number;
  volunteers: number;
  accessibility: "standard" | "accessible" | "strict";
  security: "standard" | "renforced";
  weather: "ok" | "rain" | "wind" | "heat" | "cold";
  impactVsDistance: number;
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
    impact: number;
    distance: number;
    constraints: number;
    global: number;
  };
  tradeoffs: string[];
  proactiveAssistant: {
    actNow: string;
    criticalNearby: string;
    mostUsefulAction: string;
    predictedDirtyZones: string[];
    eventAnticipation: string[];
    hotspots: Array<{
      zoneLabel: string;
      predictedDirtScore: number;
      recentActions: number;
      recentSpots: number;
      eventPressure: number;
      distanceKm: number | null;
      reason: string;
    }>;
  };
};
