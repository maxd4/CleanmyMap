import { logFailure, logWarning } from "@/lib/logging/failure-log";
import type {
  RouteGeometry,
  RouteGeometryLeg,
  RouteNetworkGeometryProvider,
  RouteGeometryProfile,
} from "@/lib/route/route-contract";
import { areCoordinatesClose } from "@/lib/geo/coordinate-comparison";

const OSRM_PROVIDER = "osrm" as const;
const OSRM_PROFILE = "foot" as const;
const OSRM_BASE_URL = "https://router.project-osrm.org";
const OSRM_MAX_COORDINATES = 100;

type RoutingTransport = (
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
};

type OsrmLeg = {
  distance?: unknown;
  duration?: unknown;
  steps?: unknown;
};

type OsrmStep = {
  name?: unknown;
  distance?: unknown;
  duration?: unknown;
  maneuver?: { type?: unknown; modifier?: unknown };
  geometry?: {
    coordinates?: unknown;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOsrmResponse(value: unknown): value is OsrmResponse {
  return isRecord(value);
}

function isOsrmRoute(value: unknown): value is OsrmRoute {
  return isRecord(value);
}

function isOsrmLeg(value: unknown): value is OsrmLeg {
  return isRecord(value);
}

function isOsrmStep(value: unknown): value is OsrmStep {
  return isRecord(value);
}

function isOsrmLegArray(value: unknown): value is OsrmLeg[] {
  return Array.isArray(value) && value.every(isOsrmLeg);
}

function isOsrmStepArray(value: unknown): value is OsrmStep[] {
  return Array.isArray(value) && value.every(isOsrmStep);
}

function isOsrmRouteArray(value: unknown): value is OsrmRoute[] {
  return Array.isArray(value) && value.every(isOsrmRoute);
}

function isMeasuredStep(
  value: OsrmStep,
): value is OsrmStep & { distance: number; duration: number } {
  return isFiniteNumber(value.distance) && value.distance >= 0 && isFiniteNumber(value.duration) && value.duration >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isCoordinate(value: unknown): value is [number, number] {
  if (!isUnknownArray(value) || value.length !== 2) {
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
  if (!isUnknownArray(coordinates)) {
    return null;
  }

  const normalized: [number, number][] = [];
  for (const point of coordinates) {
    if (!isUnknownArray(point) || point.length !== 2) {
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

function isClosedCoordinates(coordinates: [number, number][]): boolean {
  return coordinates.length >= 2 && areCoordinatesClose(coordinates[0], coordinates.at(-1), 1e-6);
}

export function buildOsrmRouteUrl(
  coordinates: [number, number][],
  options: Pick<RoutePolylineOptions, "baseUrl" | "profileSegment"> = {},
): string {
  const coordString = coordinates
    .map((point) => `${point[1].toFixed(6)},${point[0].toFixed(6)}`)
    .join(";");
  let baseUrl = options.baseUrl ?? OSRM_BASE_URL;
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const profileSegment = options.profileSegment ?? OSRM_PROFILE;
  return `${baseUrl}/route/v1/${profileSegment}/${coordString}?geometries=geojson&overview=full&steps=true`;
}

export function createFallbackRouteGeometry(
  coordinates: [number, number][],
): RouteGeometry {
  const normalizedCoordinates = coordinates.filter(isCoordinate);
  const legs: RouteGeometryLeg[] = normalizedCoordinates.flatMap((point, index) => {
    const previous = normalizedCoordinates[index - 1];
    if (!previous) return [];
    const distance = distanceKm(previous, point);
    return [{
      fromStopIndex: index - 1,
      toStopIndex: index,
      distanceKm: Number(distance.toFixed(2)),
      estimatedMinutes: Math.max(0, Math.round((distance / 4.5) * 60)),
    }];
  });
  const distance = legs.reduce((total, leg) => total + leg.distanceKm, 0);
  const duration = legs.reduce((total, leg) => total + leg.estimatedMinutes, 0);
  const isLoop = isClosedCoordinates(normalizedCoordinates);

  return {
    isLoop,
    origin: normalizedCoordinates[0] ?? null,
    returnLeg: isLoop ? legs.at(-1) ?? null : null,
    coordinates: normalizedCoordinates,
    distanceKm: Number(distance.toFixed(2)),
    durationMinutes: Math.max(0, Math.round(duration)),
    legs,
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function parseNetworkRoute(
  payload: OsrmResponse,
  requestedCoordinates: [number, number][],
  expectedStopCount: number,
  provider: RouteNetworkGeometryProvider,
  profile: Exclude<RouteGeometryProfile, null>,
): RouteGeometry | null {
  if (payload.code !== "Ok" || !Array.isArray(payload.routes)) {
    return null;
  }

  const routes = isOsrmRouteArray(payload.routes) ? payload.routes : [];
  const route = routes[0];
  if (!route) {
    return null;
  }

  const normalizedCoordinates = normalizeCoordinates(route.geometry?.coordinates);
  if (
    !normalizedCoordinates ||
    !isFiniteNumber(route.distance) ||
    route.distance < 0 ||
    !isFiniteNumber(route.duration) ||
    route.duration < 0
  ) {
    return null;
  }

  const isLoop = isClosedCoordinates(requestedCoordinates);
  const hasCompleteLegs =
    Array.isArray(route.legs) && route.legs.length === expectedStopCount - 1;
  // A closed route must expose every leg so the return cost remains explicit.
  // An incomplete provider payload is therefore degraded to the deterministic
  // closed fallback instead of being presented as a measured loop.
  if (isLoop && !hasCompleteLegs) return null;

  const coordinates = normalizedCoordinates.map((coordinate, index) => {
    if (index === 0) return requestedCoordinates[0] ?? coordinate;
    if (index === normalizedCoordinates.length - 1 && isLoop) {
      return requestedCoordinates.at(-1) ?? coordinate;
    }
    return coordinate;
  });

  let legs: RouteGeometryLeg[] = [];
  if (hasCompleteLegs) {
    const parsedLegs: RouteGeometryLeg[] = [];
    const rawLegs = isOsrmLegArray(route.legs) ? route.legs : [];
    for (const [index, rawLeg] of rawLegs.entries()) {
      if (!isFiniteNumber(rawLeg.distance) || !isFiniteNumber(rawLeg.duration)) {
        parsedLegs.length = 0;
        break;
      }
      const rawSteps = isOsrmStepArray(rawLeg.steps)
        ? rawLeg.steps
        : undefined;
      const steps = rawSteps
        ?.filter(isMeasuredStep)
        .map((step) => {
          const distance = step.distance;
          const duration = step.duration;
          const maneuverType = typeof step.maneuver?.type === "string" ? step.maneuver.type : null;
          const maneuverModifier = typeof step.maneuver?.modifier === "string" ? step.maneuver.modifier : null;
          const geometry = normalizeCoordinates(step.geometry?.coordinates);
          return {
            name: typeof step.name === "string" && step.name.length > 0 ? step.name : null,
            distanceKm: Number((distance / 1000).toFixed(2)),
            durationMinutes: Math.max(0, Math.round(duration / 60)),
            maneuver: maneuverType && maneuverModifier
              ? `${maneuverType} ${maneuverModifier}`
              : maneuverType ?? maneuverModifier,
            ...(geometry ? { geometry } : {}),
          };
        });
      parsedLegs.push({
        fromStopIndex: index,
        toStopIndex: index + 1,
        distanceKm: Number((rawLeg.distance / 1000).toFixed(2)),
        estimatedMinutes: Math.max(0, Math.round(rawLeg.duration / 60)),
        ...(steps ? { steps } : {}),
      });
    }
    legs = parsedLegs;
    if (isLoop && legs.length !== expectedStopCount - 1) return null;
  }

  return {
    isLoop,
    origin: coordinates[0] ?? null,
    returnLeg: isLoop ? parsedReturnLeg(legs) : null,
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

function parsedReturnLeg(legs: RouteGeometryLeg[]): RouteGeometryLeg | null {
  return legs.at(-1) ?? null;
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
    const payload: unknown = await response.json();
    if (!isOsrmResponse(payload)) return null;
    return parseNetworkRoute(
      payload,
      coordinates,
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
