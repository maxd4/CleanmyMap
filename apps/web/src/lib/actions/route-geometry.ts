import type { ActionDrawing } from "@/lib/actions/types";
import { findMatchingGeometry } from "../geo/geometry-reference";

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

async function geocodeLabel(label: string): Promise<GeoPoint | null> {
  const query = encodeURIComponent(label.trim());
  if (!query) {
    return null;
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${query}&limit=1`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
    }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) {
      return null;
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  } catch {
    return null;
  }
}

async function snapRoute(coordinates: [number, number][]): Promise<[number, number][] | null> {
  if (coordinates.length < 2) {
    return null;
  }
  const coordString = coordinates
    .map((point) => `${point[1].toFixed(6)},${point[0].toFixed(6)}`)
    .join(";");
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${coordString}?geometries=geojson&overview=full`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates: [number, number][] } }>;
    };
    if (data.code !== "Ok" || !data.routes?.length) {
      return null;
    }
    return data.routes[0].geometry?.coordinates.map((point) => [
      Number(point[1].toFixed(6)),
      Number(point[0].toFixed(6)),
    ]) ?? null;
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
    const departure = await geocodeLabel(departureLabel);
    if (!departure) {
      return null;
    }
    const arrival = await geocodeLabel(arrivalLabel);
    if (arrival) {
      const routePoints: [number, number][] =
        routeStyle === "direct"
          ? [
              [departure.latitude, departure.longitude],
              [arrival.latitude, arrival.longitude],
            ]
          : buildFlexibleRoutePoints(departure, arrival);
      const snapped = await snapRoute(routePoints);
      if (snapped && snapped.length >= 2) {
        return {
          kind: "polyline",
          coordinates: snapped,
        };
      }
      return {
        kind: "polyline",
        coordinates: [
          [departure.latitude, departure.longitude],
          [arrival.latitude, arrival.longitude],
        ],
      };
    }
    return buildLinearTrace(departure, 500);
  }

  const referenceDrawing = findMatchingGeometry(params.locationLabel || departureLabel);
  if (referenceDrawing) {
    return referenceDrawing;
  }

  const departure = await geocodeLabel(departureLabel);
  if (!departure) {
    return null;
  }

  const labelForHeuristic = `${params.locationLabel} ${departureLabel}`.trim();
  if (isBoulevardLike(labelForHeuristic)) {
    return buildLinearTrace(departure, 500);
  }
  if (isSmallStreetLike(labelForHeuristic)) {
    return buildSquarePolygon(departure, 200);
  }
  return buildSquarePolygon(departure, 300);
}

function buildFlexibleRoutePoints(start: GeoPoint, end: GeoPoint): [number, number][] {
  const midLatitude = (start.latitude + end.latitude) / 2;
  const midLongitude = (start.longitude + end.longitude) / 2;
  const deltaLat = end.latitude - start.latitude;
  const deltaLng = end.longitude - start.longitude;
  const distance = Math.max(Math.abs(deltaLat), Math.abs(deltaLng));
  const offset = Math.min(0.0012, Math.max(0.0002, distance * 0.18));
  const perpendicularLat = -deltaLng * offset;
  const perpendicularLng = deltaLat * offset;
  const detourPoint: [number, number] = [
    Number((midLatitude + perpendicularLat).toFixed(6)),
    Number((midLongitude + perpendicularLng).toFixed(6)),
  ];
  return [
    [start.latitude, start.longitude],
    detourPoint,
    [end.latitude, end.longitude],
  ];
}
