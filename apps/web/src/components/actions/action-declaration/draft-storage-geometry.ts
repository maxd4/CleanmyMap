import type {
  ActionDrawing,
  ActionGpxImportMetadata,
  ActionLocationCoordinates,
} from "@/lib/actions/types";

function isFiniteInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseCoordinates(value: unknown): ActionLocationCoordinates | null {
  if (!isRecord(value)) return null;
  if (!isFiniteInRange(value.latitude, -90, 90)) return null;
  if (!isFiniteInRange(value.longitude, -180, 180)) return null;
  return { latitude: value.latitude, longitude: value.longitude };
}

function parseDrawingPoint(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  if (!isFiniteInRange(value[0], -90, 90)) return null;
  if (!isFiniteInRange(value[1], -180, 180)) return null;
  return [value[0], value[1]];
}

export function parseDrawing(value: unknown): ActionDrawing | null {
  if (!isRecord(value)) return null;
  if (value.kind !== "polyline" && value.kind !== "polygon") return null;
  if (!Array.isArray(value.coordinates)) return null;

  const coordinates: [number, number][] = [];
  for (const point of value.coordinates) {
    const parsedPoint = parseDrawingPoint(point);
    if (!parsedPoint) return null;
    coordinates.push(parsedPoint);
  }

  const minimumPoints = value.kind === "polygon" ? 3 : 2;
  return coordinates.length >= minimumPoints
    ? { kind: value.kind, coordinates }
    : null;
}

export function parseGpxImport(value: unknown): ActionGpxImportMetadata | null {
  if (!isRecord(value) || value.source !== "gpx_import") return null;
  if (!isFiniteInRange(value.observedDistanceKm, 0, Number.POSITIVE_INFINITY)) return null;
  if (typeof value.pointCount !== "number" || !Number.isInteger(value.pointCount) || value.pointCount < 2) {
    return null;
  }
  if (value.inferredTopology !== "loop" && value.inferredTopology !== "point_to_point") return null;

  return {
    source: "gpx_import",
    observedDistanceKm: value.observedDistanceKm,
    pointCount: value.pointCount,
    inferredTopology: value.inferredTopology,
    ...(typeof value.fileName === "string" ? { fileName: value.fileName } : {}),
  };
}

export function hasValidGpxPair(
  parsed: Record<string, unknown>,
  gpxImport: ActionGpxImportMetadata | null,
  manualDrawing: ActionDrawing | null,
): boolean {
  return Boolean(
    gpxImport &&
      manualDrawing &&
      parsed.manualDrawingSource === "gpx_import" &&
      gpxImport.pointCount === manualDrawing.coordinates.length,
  );
}
