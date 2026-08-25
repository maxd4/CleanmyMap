export type RouteGeometryMode = "network" | "fallback";

export type RouteGeometryProvider = "osrm" | "none";

export type RouteGeometryProfile = "foot" | null;

export type RouteGeometryLeg = {
  fromStopIndex: number;
  toStopIndex: number;
  distanceKm: number;
  estimatedMinutes: number;
};

export type RouteGeometry = {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  legs: RouteGeometryLeg[];
  provider: RouteGeometryProvider;
  profile: RouteGeometryProfile;
  mode: RouteGeometryMode;
  estimated: boolean;
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

/** Applies provider legs without ever changing the stop count or order. */
export function applyRouteGeometryLegs(
  stops: RouteStop[],
  geometry: RouteGeometry,
): RouteStop[] {
  if (
    geometry.mode !== "network" ||
    geometry.legs.length !== Math.max(0, stops.length - 1)
  ) {
    return stops;
  }

  return stops.map((stop, index) => {
    if (index === 0) {
      return stop;
    }
    const leg = geometry.legs[index - 1];
    if (!leg || leg.toStopIndex !== index) {
      return stop;
    }
    return {
      ...stop,
      segmentKm: leg.distanceKm,
      estimatedMinutes: leg.estimatedMinutes,
    };
  });
}
