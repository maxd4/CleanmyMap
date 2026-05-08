export type RouteConstraints = {
  availableMinutes: number;
  volunteers: number;
  accessibility: "standard" | "accessible" | "strict";
  security: "standard" | "renforced";
  weather: "ok" | "rain" | "wind" | "heat" | "cold";
  impactVsDistance: number;
  maxStops: number;
};

export type RouteStop = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  segmentKm: number;
  estimatedMinutes: number;
  priorityReason: string;
  score: number;
};

export type RouteResponse = {
  stops: RouteStop[];
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
