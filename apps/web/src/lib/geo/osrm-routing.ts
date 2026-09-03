import { logFailure, logWarning } from "@/lib/logging/failure-log";
import type {
  RouteGeometry,
  RouteGeometryLeg,
  RouteGeometryStep,
  RouteNetworkGeometryProvider,
  RouteGeometryProfile,
} from "@/lib/route/route-contract";

export const OSRM_PROVIDER = "osrm" as const;
export const OSRM_PROFILE = "foot" as const;
export const OSRM_BASE_URL = "https://router.project-osrm.org";
export const OSRM_MAX_COORDINATES = 100;

export type RoutingTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type RoutePolylineOptions = {
  transport?: RoutingTransport;
  timeoutMs?: number;
  baseUrl?: string;
  profileSegment?: string;
  provider?: RouteNetworkGeometryProvider;
  profile?: Exclude<RouteGeometryProfile, null>;
  headers?: HeadersInit;
  steps?: boolean;
};

type OsrmLeg = {
  distance?: unknown;
  duration?: unknown;
  steps?: unknown;
};

type OsrmStep = {
  distance?: unknown;
  duration?: unknown;
  name?: unknown;
  maneuver?: {
    type?: unknown;
    modifier?: unknown;
  };
};

type OsrmRoute = {
  distance?: unknown;
  duration?: unknown;
  geometry?: {
    coordinates?: unknown;
  };
  legs?: unknown;
};

type OsrmResponse = {
  code?: unknown;
  routes?: unknown;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCoordinate(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  const latitude = value[0];
  const longitude = value[1];
  return (
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeCoordinates(
  coordinates: unknown,
): [number, number][] | null {
  if (!Array.isArray(coordinates)) {
    return null;
  }

  const normalized: [number, number][] = [];
  for (const point of coordinates) {
    if (!Array.isArray(point) || point.length !== 2) {
      return null;
    }

    const longitude = point[0];
    const latitude = point[1];
    if (
      !isFiniteNumber(longitude) ||
      !isFiniteNumber(latitude) ||
      !isCoordinate([latitude, longitude])
    ) {
      return null;
    }
    normalized.push([
      Number(latitude.toFixed(6)),
      Number(longitude.toFixed(6)),
    ]);
  }

  return normalized.length >= 2 ? normalized : null;
}

function distanceKm(
  from: [number, number],
  to: [number, number],
): number {
  const latitudeRadians = (from[0] * Math.PI) / 180;
  const latitudeDelta = ((to[0] - from[0]) * Math.PI) / 180;
  const longitudeDelta = ((to[1] - from[1]) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeRadians) *
      Math.cos((to[0] * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function fallbackDistanceKm(coordinates: [number, number][]): number {
  return coordinates.reduce((total, point, index) => {
    const previous = coordinates[index - 1];
    return previous ? total + distanceKm(previous, point) : total;
  }, 0);
}

export function buildOsrmRouteUrl(
  coordinates: [number, number][],
  options: Pick<RoutePolylineOptions, "baseUrl" | "profileSegment" | "steps"> = {},
): string {
  const coordString = coordinates
    .map((point) => `${point[1].toFixed(6)},${point[0].toFixed(6)}`)
    .join(";");
  const baseUrl = (options.baseUrl ?? OSRM_BASE_URL).replace(/\/+$/, "");
  const profileSegment = options.profileSegment ?? OSRM_PROFILE;
  return `${baseUrl}/route/v1/${profileSegment}/${coordString}?geometries=geojson&overview=full&steps=${options.steps === true ? "true" : "false"}`;
}

export function createFallbackRouteGeometry(
  coordinates: [number, number][],
): RouteGeometry {
  const normalizedCoordinates = coordinates.filter(isCoordinate);
  const distance = fallbackDistanceKm(normalizedCoordinates);
  const duration = distance > 0 ? (distance / 4.5) * 60 : 0;

  return {
    coordinates: normalizedCoordinates,
    distanceKm: Number(distance.toFixed(2)),
    durationMinutes: Math.max(0, Math.round(duration)),
    legs: [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function parseRouteSteps(value: unknown): RouteGeometryStep[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const steps: RouteGeometryStep[] = [];
  for (const rawStep of value as OsrmStep[]) {
    if (
      !rawStep ||
      !isFiniteNumber(rawStep.distance) ||
      rawStep.distance < 0 ||
      !isFiniteNumber(rawStep.duration) ||
      rawStep.duration < 0
    ) {
      return undefined;
    }

    const name =
      typeof rawStep.name === "string" && rawStep.name.trim().length > 0
        ? rawStep.name.trim()
        : null;
    const maneuverParts = [
      rawStep.maneuver?.type,
      rawStep.maneuver?.modifier,
    ].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    steps.push({
      name,
      distanceKm: Number((rawStep.distance / 1000).toFixed(2)),
      durationMinutes: Number((rawStep.duration / 60).toFixed(2)),
      maneuver: maneuverParts.length > 0 ? maneuverParts.join(" ") : null,
    });
  }

  return steps;
}

function parseNetworkRoute(
  payload: OsrmResponse,
  expectedStopCount: number,
  provider: RouteNetworkGeometryProvider,
  profile: Exclude<RouteGeometryProfile, null>,
): RouteGeometry | null {
  if (payload.code !== "Ok" || !Array.isArray(payload.routes)) {
    return null;
  }

  const route = payload.routes[0] as OsrmRoute | undefined;
  if (!route) {
    return null;
  }

  const coordinates = normalizeCoordinates(route.geometry?.coordinates);
  if (
    !coordinates ||
    !isFiniteNumber(route.distance) ||
    route.distance < 0 ||
    !isFiniteNumber(route.duration) ||
    route.duration < 0
  ) {
    return null;
  }

  let legs: RouteGeometryLeg[] = [];
  if (Array.isArray(route.legs) && route.legs.length === expectedStopCount - 1) {
    const parsedLegs: RouteGeometryLeg[] = [];
    for (const [index, rawLeg] of (route.legs as OsrmLeg[]).entries()) {
      if (!isFiniteNumber(rawLeg.distance) || !isFiniteNumber(rawLeg.duration)) {
        parsedLegs.length = 0;
        break;
      }
      const steps = parseRouteSteps(rawLeg.steps);
      parsedLegs.push({
        fromStopIndex: index,
        toStopIndex: index + 1,
        distanceKm: Number((rawLeg.distance / 1000).toFixed(2)),
        estimatedMinutes: Math.max(0, Math.round(rawLeg.duration / 60)),
        ...(steps ? { steps } : {}),
      });
    }
    legs = parsedLegs;
  }

  return {
    coordinates,
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMinutes: Math.max(0, Math.round(route.duration / 60)),
    legs,
    provider,
    profile,
    mode: "network",
    estimated: false,
  };
}

async function fetchOsrmRoute(
  coordinates: [number, number][],
  transport: RoutingTransport,
  timeoutMs: number,
  options: RoutePolylineOptions,
): Promise<RouteGeometry | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    const response = await transport(buildOsrmRouteUrl(coordinates, options), {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      logWarning("OSRM", "Routing API returned an error", {
        status: response.status,
      });
      return null;
    }
    const payload = (await response.json()) as OsrmResponse;
    return parseNetworkRoute(
      payload,
      coordinates.length,
      options.provider ?? OSRM_PROVIDER,
      options.profile ?? OSRM_PROFILE,
    );
  } catch (error) {
    logFailure("OSRM", "Routing failed", error, {
      pointCount: coordinates.length,
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function routePolylineThroughStreetNetwork(
  coordinates: [number, number][],
  options: RoutePolylineOptions = {},
): Promise<RouteGeometry> {
  if (coordinates.length < 2) {
    return createFallbackRouteGeometry(coordinates);
  }

  if (
    coordinates.length > OSRM_MAX_COORDINATES ||
    coordinates.some((point) => !isCoordinate(point))
  ) {
    logWarning("OSRM", "Routing input is outside the supported bounds", {
      pointCount: coordinates.length,
    });
    return createFallbackRouteGeometry(coordinates);
  }

  const networkResult = await fetchOsrmRoute(
    coordinates,
    options.transport ?? ((input, init) => fetch(input, init)),
    options.timeoutMs ?? 5000,
    options,
  );
  return (
    networkResult ??
    createFallbackRouteGeometry(coordinates)
  );
}

/** Compatibility API retained for route-geometry.ts and existing map tooling. */
export async function snapPolylineToStreetNetwork(
  coordinates: [number, number][],
): Promise<[number, number][] | null> {
  if (
    !coordinates ||
    coordinates.length < 2 ||
    coordinates.length > OSRM_MAX_COORDINATES
  ) {
    return coordinates;
  }

  const result = await routePolylineThroughStreetNetwork(coordinates);
  return result.mode === "network" ? result.coordinates : null;
}
