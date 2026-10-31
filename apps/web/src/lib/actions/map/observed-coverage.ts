import type { ActionGeometrySource } from "@/lib/actions/types";

export type ObservedCoverageGeometry = {
  type: "MultiLineString";
  coordinates: [number, number][][];
  traceCount: number;
  sources?: Extract<ActionGeometrySource, "gps_tracking" | "gpx_import">[];
};

function parseCoordinatePair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const longitude = value[0];
  const latitude = value[1];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }
  return [longitude, latitude];
}

function isObservedSource(
  value: unknown,
): value is Extract<ActionGeometrySource, "gps_tracking" | "gpx_import"> {
  return value === "gps_tracking" || value === "gpx_import";
}

function isCoordinatePair(value: [number, number] | null): value is [number, number] {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseObservedSources(
  value: unknown,
  traceCount: number,
): ObservedCoverageGeometry["sources"] {
  if (!Array.isArray(value)) return undefined;
  const sources: unknown[] = value;
  if (!sources.every(isObservedSource)) {
    return undefined;
  }
  if (sources.length === 0 || (sources.length !== 1 && sources.length !== traceCount)) {
    return undefined;
  }

  const uniqueSources = [...new Set(sources)];
  return uniqueSources;
}

/** Validates the public observed-coverage shape without inventing or joining lines. */
export function parseObservedCoverageGeometry(raw: unknown): ObservedCoverageGeometry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = raw as {
    type?: unknown;
    coordinates?: unknown;
    traceCount?: unknown;
    sources?: unknown;
  };
  if (candidate.type !== "MultiLineString" || !Array.isArray(candidate.coordinates)) return null;

  const coordinates: [number, number][][] = [];
  for (const line of candidate.coordinates) {
    if (!Array.isArray(line) || line.length < 2) return null;
    const parsedLine = line.map(parseCoordinatePair);
    if (!parsedLine.every(isCoordinatePair)) return null;
    coordinates.push(parsedLine);
  }
  if (coordinates.length === 0) return null;

  const sources = parseObservedSources(candidate.sources, coordinates.length);
  return {
    type: "MultiLineString",
    coordinates,
    traceCount: coordinates.length,
    ...(sources && sources.length > 0 ? { sources } : {}),
  };
}

/** Resolves the same observed-coverage source for the map and its exports. */
export function resolveObservedCoverageGeometry(input: {
  preparationData?: unknown;
  primaryGeoJson?: string | null;
}): ObservedCoverageGeometry | null {
  const preparationData = input.preparationData;
  if (isRecord(preparationData)) {
    const stored = parseObservedCoverageGeometry(
      preparationData.observedCoverage,
    );
    if (stored) return stored;
  }

  if (!input.primaryGeoJson) return null;
  try {
    return parseObservedCoverageGeometry(JSON.parse(input.primaryGeoJson) as unknown);
  } catch {
    return null;
  }
}
