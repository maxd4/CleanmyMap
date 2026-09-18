export type RouteGeometryMode = "network" | "fallback";

export type RouteGeometryProvider = "osrm" | "fossgis-osrm" | "none";

export type RouteNetworkGeometryProvider = Exclude<
  RouteGeometryProvider,
  "none"
>;

export type RouteGeometryProfile = "foot" | null;

export type RouteGeometryStep = {
  name: string | null;
  distanceKm: number;
  durationMinutes: number;
  maneuver: string | null;
  /** Provider-supplied opaque reference when one exists; never inferred as an OSM id. */
  segmentReference?: string | null;
  /** The network step geometry, when the provider returns it. */
  geometry?: [number, number][];
};

export type RouteGeometryLeg = {
  fromStopIndex: number;
  toStopIndex: number;
  distanceKm: number;
  estimatedMinutes: number;
  steps?: RouteGeometryStep[];
};

export type RouteGeometry = {
  /** Whether the route returns to its origin. */
  isLoop: boolean;
  /** Coordinates are latitude/longitude and identify the route origin. */
  origin: [number, number] | null;
  /** The final leg back to `origin`, when this is a loop. */
  returnLeg: RouteGeometryLeg | null;
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  legs: RouteGeometryLeg[];
  provider: RouteGeometryProvider;
  profile: RouteGeometryProfile;
  mode: RouteGeometryMode;
  estimated: boolean;
};

import type { RouteTargetEvidence } from "./route-target-contract";

export type RouteStop = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  segmentKm: number;
  estimatedMinutes: number;
  priorityReason: string;
  score: number;
  evidence?: RouteTargetEvidence;
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

/** Applies legs for a route whose first coordinate is the real origin. */
export function applyOriginRouteGeometryLegs(
  stops: RouteStop[],
  geometry: RouteGeometry,
): RouteStop[] {
  if (
    geometry.mode !== "network" ||
    geometry.legs.length !== stops.length + 1
  ) {
    return stops;
  }

  return stops.map((stop, index) => {
    const leg = geometry.legs[index];
    if (!leg || leg.toStopIndex !== index + 1) {
      return stop;
    }
    return {
      ...stop,
      segmentKm: leg.distanceKm,
      estimatedMinutes: leg.estimatedMinutes,
    };
  });
}
