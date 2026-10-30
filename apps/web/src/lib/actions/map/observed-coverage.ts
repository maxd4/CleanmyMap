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

function parseObservedSources(value: unknown): ObservedCoverageGeometry["sources"] {
  if (!Array.isArray(value)) return undefined;
  const sources = value.filter(
    (source): source is Extract<ActionGeometrySource, "gps_tracking" | "gpx_import"> =>
      source === "gps_tracking" || source === "gpx_import",
  );
  return [...new Set(sources)];
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

  const coordinates = candidate.coordinates.flatMap((line): [number, number][][] => {
    if (!Array.isArray(line)) return [];
    const parsedLine = line.flatMap((point) => {
      const parsed = parseCoordinatePair(point);
      return parsed ? [parsed] : [];
    });
    return parsedLine.length >= 2 && parsedLine.length === line.length ? [parsedLine] : [];
  });
  if (coordinates.length === 0) return null;

  const declaredTraceCount = typeof candidate.traceCount === "number" && Number.isInteger(candidate.traceCount)
    ? candidate.traceCount
    : 0;
  const sources = parseObservedSources(candidate.sources);
  return {
    type: "MultiLineString",
    coordinates,
    traceCount: declaredTraceCount >= coordinates.length ? declaredTraceCount : coordinates.length,
    ...(sources && sources.length > 0 ? { sources } : {}),
  };
}

/** Resolves the same observed-coverage source for the map and its exports. */
export function resolveObservedCoverageGeometry(input: {
  preparationData?: unknown;
  primaryGeoJson?: string | null;
}): ObservedCoverageGeometry | null {
  const preparationData = input.preparationData;
  if (preparationData && typeof preparationData === "object" && !Array.isArray(preparationData)) {
    const stored = parseObservedCoverageGeometry(
      (preparationData as { observedCoverage?: unknown }).observedCoverage,
    );
    if (stored) return stored;
  }

  if (!input.primaryGeoJson) return null;
  try {
    return parseObservedCoverageGeometry(JSON.parse(input.primaryGeoJson));
  } catch {
    return null;
  }
}
