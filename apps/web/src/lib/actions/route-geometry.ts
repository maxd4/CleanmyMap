import type { ActionDrawing } from "@/lib/actions/types";
import { buildPedestrianRoute } from "./geometry-core";
import { findMatchingGeometry } from "../geo/geometry-reference";
import { snapPolylineToStreetNetwork } from "../geo/osrm-routing";
import {
  buildTerritoryNominatimSearchUrl,
  isWithinTerritoryBounds,
  parseTerritoryCoordinates,
} from "../geo/territory";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

function metersToLatitudeDelta(meters: number): number {
  return meters / 111_320;
}

function metersToLongitudeDelta(meters: number, latitude: number): number {
  const radius = Math.max(0.1, Math.cos((latitude * Math.PI) / 180));
  return meters / (111_320 * radius);
}

function buildSquarePolygon(center: GeoPoint, radiusMeters: number): ActionDrawing {
  const latDelta = metersToLatitudeDelta(radiusMeters);
  const lngDelta = metersToLongitudeDelta(radiusMeters, center.latitude);
  return {
    kind: "polygon",
    coordinates: [
      [center.latitude - latDelta, center.longitude - lngDelta],
      [center.latitude - latDelta, center.longitude + lngDelta],
      [center.latitude + latDelta, center.longitude + lngDelta],
      [center.latitude + latDelta, center.longitude - lngDelta],
    ],
  };
}

function buildLinearTrace(center: GeoPoint, radiusMeters: number): ActionDrawing {
  const lngDelta = metersToLongitudeDelta(radiusMeters, center.latitude);
  return {
    kind: "polyline",
    coordinates: [
      [center.latitude, center.longitude - lngDelta],
      [center.latitude, center.longitude],
      [center.latitude, center.longitude + lngDelta],
    ],
  };
}

function isBoulevardLike(label: string): boolean {
  const lower = label.toLowerCase();
  return [
    "boulevard",
    "avenue",
    "place",
    "quai",
    "pont",
    "port",
  ].some((keyword) => lower.includes(keyword));
}

function isSmallStreetLike(label: string): boolean {
  const lower = label.toLowerCase();
  return [
    "rue",
    "allée",
    "allee",
    "villa",
    "ruelle",
    "impasse",
    "sentier",
  ].some((keyword) => lower.includes(keyword));
}

async function buildRouteDrawingFromArrivalLabels(params: {
  departureLabel: string;
  arrivalLabel: string;
  routeStyle: "direct" | "souple";
}): Promise<ActionDrawing | null> {
  const departure = await geocodeLabel(params.departureLabel);
  if (!departure) {
    return null;
  }

  const arrival = await geocodeLabel(params.arrivalLabel);
  if (!arrival) {
    return buildLinearTrace(departure, 500);
  }

  const routeDrawing = buildPedestrianRoute(departure, arrival, params.routeStyle);
  const snapped = await snapPolylineToStreetNetwork(routeDrawing.coordinates);
  if (snapped && snapped.length >= 2) {
    return {
      kind: "polyline",
      coordinates: snapped,
    };
  }
  return routeDrawing;
}

async function buildFallbackDrawingFromLabel(params: {
  locationLabel: string;
  departureLabel: string;
}): Promise<ActionDrawing | null> {
  const referenceDrawing = findMatchingGeometry(
    params.locationLabel || params.departureLabel,
  );
  if (referenceDrawing) {
    return referenceDrawing;
  }

  const departure = await geocodeLabel(params.departureLabel);
  if (!departure) {
    return null;
  }

  const labelForHeuristic = `${params.locationLabel} ${params.departureLabel}`.trim();
  if (isBoulevardLike(labelForHeuristic)) {
    return buildLinearTrace(departure, 500);
  }
  if (isSmallStreetLike(labelForHeuristic)) {
    return buildSquarePolygon(departure, 200);
  }
  return buildSquarePolygon(departure, 300);
}

async function geocodeLabel(label: string): Promise<GeoPoint | null> {
  const url = buildTerritoryNominatimSearchUrl(label);
  if (!url) {
    return null;
  }
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const coordinates = parseTerritoryCoordinates(data[0]);
    if (!coordinates) {
      return null;
    }
    if (
      !isWithinTerritoryBounds(
        coordinates.latitude,
        coordinates.longitude,
      )
    ) {
      return null;
    }
    return coordinates;
  } catch {
    return null;
  }
}

export async function deriveAutoDrawingFromLocation(params: {
  locationLabel: string;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
}): Promise<ActionDrawing | null> {
  const departureLabel = params.departureLocationLabel?.trim() || params.locationLabel.trim();
  const arrivalLabel = params.arrivalLocationLabel?.trim() || "";
  const routeStyle = params.routeStyle ?? "souple";

  if (params.locationLabel.trim().length === 0 && departureLabel.length === 0) {
    return null;
  }

  if (arrivalLabel.length > 0) {
    return buildRouteDrawingFromArrivalLabels({
      departureLabel,
      arrivalLabel,
      routeStyle,
    });
  }

  return buildFallbackDrawingFromLabel({
    locationLabel: params.locationLabel,
    departureLabel,
  });
}
