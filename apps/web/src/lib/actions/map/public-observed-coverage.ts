import type { ActionGeometrySource, ActionPreparationData } from "@/lib/actions/types";
import { getPublicOperationalRouteSegments } from "@/lib/route/route-operational";

const PUBLIC_ROUTE_GEOMETRY_MODES = new Set(["network", "fallback"]);
const PUBLIC_ROUTE_GEOMETRY_PROVIDERS = new Set(["osrm", "fossgis-osrm", "none"]);

function parseCoverageCoordinates(raw: unknown): [number, number][][] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const coordinates = raw
    .filter((line): line is unknown[] => Array.isArray(line))
    .map((line) => line
      .filter((point): point is [number, number] =>
        Array.isArray(point) && point.length >= 2 &&
        typeof point[0] === "number" && Number.isFinite(point[0]) &&
        typeof point[1] === "number" && Number.isFinite(point[1]),
      )
      .map(([longitude, latitude]) => [longitude, latitude] as [number, number]))
    .filter((line) => line.length >= 2);
  return coordinates.length > 0 ? coordinates : undefined;
}

function parseCoverageSources(raw: unknown): ActionGeometrySource[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sources = raw.filter(
    (source): source is ActionGeometrySource =>
      source === "gpx_import" || source === "gps_tracking",
  );
  return sources.length > 0 ? sources : undefined;
}

function readCoverageCandidate(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const candidate = ("observed_coverage" in input
    ? input.observed_coverage
    : raw) as Record<string, unknown>;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
  return candidate.type === "MultiLineString" ? candidate : undefined;
}

function parsePublicObservedCoverage(
  raw: unknown,
): ActionPreparationData | undefined {
  const candidate = readCoverageCandidate(raw);
  if (!candidate) return undefined;

  const coordinates = parseCoverageCoordinates(candidate.coordinates);
  if (!coordinates) return undefined;
  const sources = parseCoverageSources(candidate.sources);
  return {
    observedCoverage: {
      type: "MultiLineString",
      coordinates,
      traceCount: Math.max(0, Math.trunc(Number(candidate.traceCount) || coordinates.length)),
      individualDistancesKm: Array.isArray(candidate.individualDistancesKm)
        ? candidate.individualDistancesKm.filter(
            (distance): distance is number => typeof distance === "number" && Number.isFinite(distance),
          )
        : [],
      ...(sources && sources.length > 0 ? { sources } : {}),
      coverageDistanceKm: null,
      coverageVersion: typeof candidate.coverageVersion === "string"
        ? candidate.coverageVersion
        : "observed-traces-v1",
    },
  };
}

function finiteNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Public map contracts expose only the bounded cartographic preparation allowlist. */
export function sanitizePublicObservedPreparationData(
  raw: unknown,
): ActionPreparationData | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  const observedCoverage = parsePublicObservedCoverage(input.observedCoverage)?.observedCoverage;
  if (observedCoverage) output.observedCoverage = observedCoverage;

  for (const key of [
    "routeTargetDistanceKm",
    "routeNetworkDistanceKm",
    "routeObservedDistanceKm",
  ] as const) {
    const value = finiteNonNegativeNumber(input[key]);
    if (value !== undefined) output[key] = value;
  }

  if (typeof input.routeGeometryMode === "string" && PUBLIC_ROUTE_GEOMETRY_MODES.has(input.routeGeometryMode)) {
    output.routeGeometryMode = input.routeGeometryMode;
  }
  if (typeof input.routeGeometryProvider === "string" && PUBLIC_ROUTE_GEOMETRY_PROVIDERS.has(input.routeGeometryProvider)) {
    output.routeGeometryProvider = input.routeGeometryProvider;
  }

  const operationalRoute = getPublicOperationalRouteSegments(
    input.operationalRoute as Parameters<typeof getPublicOperationalRouteSegments>[0],
  );
  if (operationalRoute.length > 0) {
    output.operationalRoute = { routes: operationalRoute };
  }

  return Object.keys(output).length > 0 ? output as ActionPreparationData : undefined;
}

export function parsePublicObservedPreparationData(raw: unknown): ActionPreparationData | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const preparation = input.public_preparation_data ?? input.publicPreparationData ?? input;
  const projected = sanitizePublicObservedPreparationData(preparation) ?? {};
  const observedCoverage = parsePublicObservedCoverage(input.observed_coverage)?.observedCoverage;
  if (observedCoverage) projected.observedCoverage = observedCoverage;
  return Object.keys(projected).length > 0 ? projected : undefined;
}
