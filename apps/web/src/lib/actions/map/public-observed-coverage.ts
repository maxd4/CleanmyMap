import type { ActionGeometrySource, ActionPreparationData, ActionSimulatedRouteCoverage } from "@/lib/actions/types";
import { getPublicOperationalRouteSegments } from "@/lib/route/route-operational";
import { isActionRouteVersioning } from "@/lib/route/route-active-version";

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

/** Simulated route coordinates are persisted in Leaflet order: [latitude, longitude]. */
function parseSimulatedCoordinates(raw: unknown): [number, number][][] | undefined {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) return undefined;
  const coordinates: [number, number][][] = [];
  for (const rawLine of raw) {
    if (!Array.isArray(rawLine) || rawLine.length < 2 || rawLine.length > 1000) return undefined;
    const line: [number, number][] = [];
    for (const rawPoint of rawLine) {
      if (!Array.isArray(rawPoint) || rawPoint.length !== 2) return undefined;
      const latitude = rawPoint[0];
      const longitude = rawPoint[1];
      if (
        typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
      ) return undefined;
      line.push([latitude, longitude]);
    }
    coordinates.push(line);
  }
  return coordinates;
}

function parseCoverageSources(raw: unknown): ActionGeometrySource[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sources = raw.filter(
    (source): source is ActionGeometrySource =>
      source === "gpx_import" || source === "gps_tracking",
  );
  return sources.length > 0 ? sources : undefined;
}

function parseSimulatedRouteCoverage(
  raw: unknown,
  coordinateOrder: "geojson" | "leaflet" = "geojson",
): ActionSimulatedRouteCoverage | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const candidate = raw as Record<string, unknown>;
  if (candidate.type !== "MultiLineString" || candidate.geometrySource !== "estimated_route" ||
      candidate.provenance !== "estimated" || candidate.status !== "hypothetical" ||
      candidate.speedKmPerHour !== 3 ||
      (candidate.coverageVersion !== "simulated-routes-v1" && candidate.coverageVersion !== "simulated-routes-v2")) return undefined;
  const coordinates = parseSimulatedCoordinates(candidate.coordinates)
    ?.map((line) => line.map(([longitude, latitude]) =>
      (coordinateOrder === "geojson"
        ? [latitude, longitude]
        : [longitude, latitude]) as [number, number],
    ));
  const groupCount = finiteInteger(candidate.groupCount, 1, 12);
  const durationMinutes = finitePositive(candidate.durationMinutes);
  const targetDistanceKm = finiteNonNegativeNumber(candidate.targetDistanceKm);
  const groupSizePolicy = candidate.groupSizePolicy === "explicit_exception"
    ? "explicit_exception"
    : candidate.groupSizePolicy === "preferred_5_to_8"
      ? "preferred_5_to_8"
      : undefined;
  const counts = Array.isArray(candidate.groupParticipantCounts)
    ? candidate.groupParticipantCounts.filter((count): count is number =>
        finiteInteger(count, groupSizePolicy === "explicit_exception" ? 1 : 5, 8) !== undefined,
      )
    : [];
  const individualSimulatedDistancesKm = Array.isArray(candidate.individualSimulatedDistancesKm)
    ? candidate.individualSimulatedDistancesKm.filter(
        (distance): distance is number => finiteNonNegativeNumber(distance) !== undefined,
      )
    : undefined;
  const totalSimulatedDistanceKm = finiteNonNegativeNumber(candidate.totalSimulatedDistanceKm);
  const isCurrentVersion = candidate.coverageVersion === "simulated-routes-v2";
  if (!coordinates || groupCount === undefined || durationMinutes === undefined ||
      targetDistanceKm === undefined || counts.length !== groupCount || coordinates.length !== groupCount ||
      coordinates.some((line) => line.length < 2) ||
      (isCurrentVersion && (groupSizePolicy === undefined || individualSimulatedDistancesKm?.length !== groupCount ||
        totalSimulatedDistanceKm === undefined))) return undefined;
  return {
    type: "MultiLineString",
    coordinates,
    groupCount,
    ...(groupSizePolicy ? { groupSizePolicy } : {}),
    groupParticipantCounts: counts,
    durationMinutes,
    targetDistanceKm,
    ...(individualSimulatedDistancesKm ? { individualSimulatedDistancesKm } : {}),
    ...(totalSimulatedDistanceKm === undefined ? {} : { totalSimulatedDistanceKm }),
    ...(isCurrentVersion ? { uniqueNetworkDistanceKm: null, observedDistanceKm: null } : {}),
    speedKmPerHour: 3,
    geometrySource: "estimated_route",
    provenance: "estimated",
    status: "hypothetical",
    coverageVersion: candidate.coverageVersion,
  };
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

function finitePositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum ? value : undefined;
}

function copyPublicRouteNumbers(input: Record<string, unknown>, output: Record<string, unknown>): void {
  for (const key of ["routeTargetDistanceKm", "routeNetworkDistanceKm", "routeObservedDistanceKm"] as const) {
    const value = finiteNonNegativeNumber(input[key]);
    if (value !== undefined) output[key] = value;
  }
}

function copyPublicRouteMetadata(input: Record<string, unknown>, output: Record<string, unknown>): void {
  if (typeof input.geometryMethod === "string" && ["automatic", "generator", "manual", "gpx_import", "location_only"].includes(input.geometryMethod)) output.geometryMethod = input.geometryMethod;
  if (input.gpxImportProvenance === "planned" || input.gpxImportProvenance === "unknown") output.gpxImportProvenance = input.gpxImportProvenance;
  copyPublicRouteNumbers(input, output);
  if (typeof input.routeGeometryMode === "string" && PUBLIC_ROUTE_GEOMETRY_MODES.has(input.routeGeometryMode)) output.routeGeometryMode = input.routeGeometryMode;
  if (typeof input.routeGeometryProvider === "string" && PUBLIC_ROUTE_GEOMETRY_PROVIDERS.has(input.routeGeometryProvider)) output.routeGeometryProvider = input.routeGeometryProvider;
  const reference = input.referenceAreaProvenance;
  if (reference && typeof reference === "object" && !Array.isArray(reference)) {
    const value = reference as Record<string, unknown>;
    if (value.kind === "official_park" && value.source === "ville_de_paris" &&
        value.license === "ODbL" && typeof value.attribution === "string" &&
        typeof value.sourceUrl === "string") {
      output.referenceAreaProvenance = {
        kind: "official_park",
        source: "ville_de_paris",
        attribution: value.attribution,
        license: "ODbL",
        sourceUrl: value.sourceUrl,
      };
    }
  }
}

function copyPublicOperationalRoute(input: Record<string, unknown>, output: Record<string, unknown>): void {
  const operationalRoute = getPublicOperationalRouteSegments(input.operationalRoute as Parameters<typeof getPublicOperationalRouteSegments>[0]);
  if (operationalRoute.length > 0) output.operationalRoute = { routes: operationalRoute };
}

function copyServerRouteProvenance(input: Record<string, unknown>, output: Record<string, unknown>): void {
  const versioning = input.routeVersioning;
  if (
    isActionRouteVersioning(versioning) &&
    versioning.active.provenance === "server_verified" &&
    versioning.active.operationalRoute.routes.length > 0
  ) {
    output.routeGeometryProvenance = "server_verified";
  }
}

/** Public map contracts expose only the bounded cartographic preparation allowlist. */
export function sanitizePublicObservedPreparationData(
  raw: unknown,
  coordinateOrder: "geojson" | "leaflet" = "leaflet",
): ActionPreparationData | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  const observedCoverage = parsePublicObservedCoverage(input.observedCoverage)?.observedCoverage;
  if (observedCoverage) output.observedCoverage = observedCoverage;
  const simulatedCoverage = parseSimulatedRouteCoverage(input.simulatedRouteCoverage, coordinateOrder);
  if (simulatedCoverage) output.simulatedRouteCoverage = simulatedCoverage;
  copyPublicRouteMetadata(input, output);
  copyPublicOperationalRoute(input, output);
  copyServerRouteProvenance(input, output);

  return Object.keys(output).length > 0 ? output as ActionPreparationData : undefined;
}

export function parsePublicObservedPreparationData(raw: unknown): ActionPreparationData | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const input = raw as Record<string, unknown>;
  const preparation = input.public_preparation_data ?? input.publicPreparationData ?? input;
  const projected = sanitizePublicObservedPreparationData(preparation, "geojson") ?? {};
  const observedCoverage = parsePublicObservedCoverage(input.observed_coverage)?.observedCoverage;
  if (observedCoverage) projected.observedCoverage = observedCoverage;
  return Object.keys(projected).length > 0 ? projected : undefined;
}
