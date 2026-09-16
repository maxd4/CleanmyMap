import "server-only";

import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import {
  buildTerritoryNominatimSearchUrl,
  isWithinTerritoryBounds,
  parseTerritoryCoordinates,
} from "@/lib/geo/territory";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import type { RouteGeometry } from "@/lib/route/route-contract";
import { resolveRouteTargetDistanceKm } from "../route-target-distance";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type ReconstructedActionRoute = {
  drawing: ActionDrawing;
  geometrySource: Extract<ActionGeometrySource, "reference" | "routed" | "estimated_route">;
  routeGeometry: RouteGeometry | null;
  origin: [number, number];
};

function isCoordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) &&
    typeof value[1] === "number" && Number.isFinite(value[1]);
}

function toOrigin(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): [number, number] | null {
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) ||
    typeof longitude !== "number" || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return null;
  }
  return [latitude, longitude];
}

function metersToLatitudeDelta(meters: number): number {
  return meters / 111_320;
}

function metersToLongitudeDelta(meters: number, latitude: number): number {
  return meters / (111_320 * Math.max(0.1, Math.cos((latitude * Math.PI) / 180)));
}

/**
 * Creates a small bounded loop around the origin. Its target is only an input
 * to the planner: the measured distance is always the provider result.
 */
export function buildClosedLoopWaypoints(
  origin: [number, number],
  targetDistanceKm: number,
): [number, number][] {
  const [latitude, longitude] = origin;
  const sideMeters = Math.max(25, (Math.max(0, targetDistanceKm) * 1000) / 4);
  const latitudeDelta = metersToLatitudeDelta(sideMeters);
  const longitudeDelta = metersToLongitudeDelta(sideMeters, latitude);
  const round = (value: number) => Number(value.toFixed(6));
  const north: [number, number] = [round(latitude + latitudeDelta), longitude];
  const northEast: [number, number] = [
    round(latitude + latitudeDelta),
    round(longitude + longitudeDelta),
  ];
  const east: [number, number] = [latitude, round(longitude + longitudeDelta)];
  return [origin, north, northEast, east, origin];
}

async function geocodeLabel(label: string): Promise<GeoPoint | null> {
  const url = buildTerritoryNominatimSearchUrl(label);
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json() as Array<{ lat?: string; lon?: string }>;
    const coordinates = parseTerritoryCoordinates(data[0]);
    if (!coordinates || !isWithinTerritoryBounds(coordinates.latitude, coordinates.longitude)) {
      return null;
    }
    return coordinates;
  } catch {
    return null;
  }
}

function referenceRoute(
  locationLabel: string,
  departureLocationLabel: string,
): ReconstructedActionRoute | null {
  const referenceDrawing = findMatchingGeometry(
    departureLocationLabel || locationLabel,
  );
  if (!referenceDrawing || !referenceDrawing.coordinates[0]) return null;
  const first = referenceDrawing.coordinates[0];
  return {
    drawing: referenceDrawing,
    geometrySource: "reference",
    routeGeometry: null,
    origin: first,
  };
}

export async function reconstructActionRoute(params: {
  latitude?: number | null;
  longitude?: number | null;
  locationLabel: string;
  departureLocationLabel?: string | null;
  durationMinutes: number | null | undefined;
  routeTargetDistanceKm?: number | null;
}): Promise<ReconstructedActionRoute | null> {
  const departureLabel = params.departureLocationLabel?.trim() || params.locationLabel.trim();
  const existingOrigin = toOrigin(params.latitude, params.longitude);
  const geocodedOrigin = existingOrigin ? null : await geocodeLabel(departureLabel);

  // Keep the reference geometry fallback explicit and separate from routing.
  if (!existingOrigin && !geocodedOrigin) {
    return referenceRoute(params.locationLabel, departureLabel);
  }

  const resolvedOrigin = existingOrigin
    ? { latitude: existingOrigin[0], longitude: existingOrigin[1] }
    : geocodedOrigin;
  if (!resolvedOrigin) return referenceRoute(params.locationLabel, departureLabel);

  const originPair: [number, number] = [resolvedOrigin.latitude, resolvedOrigin.longitude];
  const waypoints = buildClosedLoopWaypoints(
    originPair,
    resolveRouteTargetDistanceKm({
      durationMinutes: params.durationMinutes,
      routeTargetDistanceKm: params.routeTargetDistanceKm,
    }),
  );
  const routeGeometry = await routePolylineThroughFossgisFoot(waypoints);
  if (!routeGeometry.coordinates.every(isCoordinatePair) || routeGeometry.coordinates.length < 2) {
    return null;
  }

  return {
    drawing: { kind: "polyline", coordinates: routeGeometry.coordinates },
    geometrySource: routeGeometry.mode === "network" ? "routed" : "estimated_route",
    routeGeometry,
    origin: originPair,
  };
}
