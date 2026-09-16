import "server-only";

export { ActionRouteReconstructionError } from "./route-reconstruction-error";
import { ActionRouteReconstructionError } from "./route-reconstruction-error";

import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionLocationCoordinates,
  ActionRouteTopology,
} from "@/lib/actions/types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
  buildTerritoryNominatimSearchUrl,
  isWithinTerritoryBounds,
  parseTerritoryCoordinates,
} from "@/lib/geo/territory";
import { findMatchingGeometry } from "@/lib/geo/geometry-reference";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import type { RouteGeometry } from "@/lib/route/route-contract";
import { resolveRouteTargetDistance } from "../route-target-distance";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

const GEOCODING_TIMEOUT_MS = 4_000;
const GEOCODING_CACHE_TTL_MS = 5 * 60_000;
const geocodingCache = new Map<string, { expiresAt: number; value: GeoPoint | null }>();
const geocodingInFlight = new Map<string, Promise<GeoPoint | null>>();

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

function toGeoPoint(value: ActionLocationCoordinates | null | undefined): GeoPoint | null {
  const origin = toOrigin(value?.latitude, value?.longitude);
  return origin ? { latitude: origin[0], longitude: origin[1] } : null;
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

export function buildLoopWaypoints(
  origin: [number, number],
  midpoint?: [number, number] | null,
  targetDistanceKm = 1,
): [number, number][] {
  return midpoint
    ? [origin, midpoint, origin]
    : buildClosedLoopWaypoints(origin, targetDistanceKm);
}

async function geocodeLabel(label: string): Promise<GeoPoint | null> {
  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return null;
  const cached = geocodingCache.get(normalizedLabel);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const inFlight = geocodingInFlight.get(normalizedLabel);
  if (inFlight) return inFlight;

  const url = buildTerritoryNominatimSearchUrl(normalizedLabel);
  if (!url) return null;
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json() as Array<{ lat?: string; lon?: string }>;
      const coordinates = parseTerritoryCoordinates(data[0]);
      if (!coordinates || !isWithinTerritoryBounds(coordinates.latitude, coordinates.longitude)) {
        return null;
      }
      return coordinates;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  geocodingInFlight.set(normalizedLabel, request);
  const value = await request;
  geocodingInFlight.delete(normalizedLabel);
  geocodingCache.set(normalizedLabel, {
    expiresAt: Date.now() + GEOCODING_CACHE_TTL_MS,
    value,
  });
  return value;
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
  midpointLocationLabel?: string | null;
  midpointCoordinates?: ActionLocationCoordinates | null;
  arrivalLocationLabel?: string | null;
  arrivalCoordinates?: ActionLocationCoordinates | null;
  topology?: ActionRouteTopology | null;
  durationMinutes: number | null | undefined;
  routeTargetDistanceKm?: number | null;
  routeTargetDistanceSource?: "derived" | "manual" | null;
}): Promise<ReconstructedActionRoute | null> {
  const topology = resolveActionRouteTopology({
    topology: params.topology,
    arrivalLocationLabel: params.arrivalLocationLabel,
  });
  const departureLabel = params.departureLocationLabel?.trim() || params.locationLabel.trim();
  const existingOrigin = toOrigin(params.latitude, params.longitude);
  const geocodedOrigin = existingOrigin ? null : await geocodeLabel(departureLabel);

  if (topology === "point_to_point" && !params.arrivalLocationLabel?.trim()) {
    throw new ActionRouteReconstructionError({
      arrivalLocationLabel: [
        "Une arrivée est obligatoire pour un parcours départ → arrivée.",
      ],
    });
  }

  if (topology === "point_to_point" && !existingOrigin && !geocodedOrigin) {
    throw new ActionRouteReconstructionError({
      departureLocationLabel: [
        "Le départ ne peut pas être localisé. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  // Keep the reference geometry fallback explicit and separate from routing.
  if (!existingOrigin && !geocodedOrigin) {
    if (topology === "point_to_point") {
      throw new ActionRouteReconstructionError({
        departureLocationLabel: [
          "Le départ ne peut pas être localisé. Vérifiez l’adresse indiquée.",
        ],
      });
    }
    return referenceRoute(params.locationLabel, departureLabel);
  }

  const resolvedOrigin = existingOrigin
    ? { latitude: existingOrigin[0], longitude: existingOrigin[1] }
    : geocodedOrigin;
  if (!resolvedOrigin) return referenceRoute(params.locationLabel, departureLabel);

  const originPair: [number, number] = [resolvedOrigin.latitude, resolvedOrigin.longitude];
  const targetDistanceKm = resolveRouteTargetDistance({
    durationMinutes: params.durationMinutes,
    routeTargetDistanceKm: params.routeTargetDistanceKm,
    routeTargetDistanceSource: params.routeTargetDistanceSource,
  }).distanceKm;
  const midpointLabel = params.midpointLocationLabel?.trim();
  const knownMidpoint = toGeoPoint(params.midpointCoordinates);
  const geocodedMidpoint = knownMidpoint ?? (midpointLabel ? await geocodeLabel(midpointLabel) : null);
  if (midpointLabel && !geocodedMidpoint) {
    throw new ActionRouteReconstructionError({
      midRouteLocationLabel: [
        "Le mi-parcours ne peut pas être localisé. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  const knownArrival = toGeoPoint(params.arrivalCoordinates);
  const geocodedArrival = topology === "point_to_point"
    ? knownArrival ?? await geocodeLabel(params.arrivalLocationLabel!.trim())
    : null;
  if (topology === "point_to_point" && !geocodedArrival) {
    throw new ActionRouteReconstructionError({
      arrivalLocationLabel: [
        "L’arrivée ne peut pas être localisée. Vérifiez l’adresse indiquée.",
      ],
    });
  }

  const midpointPair = geocodedMidpoint
    ? [geocodedMidpoint.latitude, geocodedMidpoint.longitude] as [number, number]
    : null;
  const arrivalPair = geocodedArrival
    ? [geocodedArrival.latitude, geocodedArrival.longitude] as [number, number]
    : null;
  const waypoints = topology === "point_to_point"
    ? [originPair, ...(midpointPair ? [midpointPair] : []), arrivalPair!]
    : buildLoopWaypoints(originPair, midpointPair, targetDistanceKm);
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
