import type {
  ActionDrawing,
  ActionGpxImportFile,
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

  const files: ActionGpxImportFile[] = !Array.isArray(value.files)
    ? []
    : value.files.flatMap((file): ActionGpxImportFile[] => {
        if (!isRecord(file) || typeof file.fileName !== "string" || (file.provenance !== "planned" && file.provenance !== "unknown") || !Array.isArray(file.segments)) return [];
        const fileId = typeof file.fileId === "string" && file.fileId.length > 0 ? file.fileId : undefined;
        const segments = file.segments.flatMap((segment): ActionGpxImportFile["segments"] => {
          if (!isRecord(segment) || typeof segment.fileName !== "string" || typeof segment.traceIndex !== "number" || typeof segment.segmentIndex !== "number" || !Array.isArray(segment.coordinates) || typeof segment.distanceKm !== "number" || typeof segment.pointCount !== "number" || (segment.topology !== "loop" && segment.topology !== "point_to_point") || typeof segment.sourceFingerprint !== "string") return [];
          const coordinates = segment.coordinates.flatMap((point): [number, number][] => {
            const parsed = parseDrawingPoint(point);
            return parsed ? [parsed] : [];
          });
          return coordinates.length === segment.coordinates.length && coordinates.length >= 2
            ? [{ ...(typeof segment.fileId === "string" && segment.fileId.length > 0 ? { fileId: segment.fileId } : fileId ? { fileId } : {}), fileName: segment.fileName, traceIndex: segment.traceIndex, segmentIndex: segment.segmentIndex, coordinates, distanceKm: segment.distanceKm, pointCount: segment.pointCount, topology: segment.topology, sourceFingerprint: segment.sourceFingerprint }]
            : [];
        });
        return [{ ...(fileId ? { fileId } : {}), fileName: file.fileName, provenance: file.provenance, segments, ...(typeof file.error === "string" ? { error: file.error } : {}) }];
      });

  return {
    source: "gpx_import",
    observedDistanceKm: value.observedDistanceKm,
    pointCount: value.pointCount,
    inferredTopology: value.inferredTopology,
    ...(Array.isArray(value.segmentTopologies) ? { segmentTopologies: value.segmentTopologies.filter((topology): topology is "loop" | "point_to_point" => topology === "loop" || topology === "point_to_point") } : {}),
    ...(Array.isArray(value.segmentDistancesKm) ? { segmentDistancesKm: value.segmentDistancesKm.filter((distance): distance is number => typeof distance === "number" && Number.isFinite(distance) && distance >= 0) } : {}),
    ...(Array.isArray(value.segmentPointCounts) ? { segmentPointCounts: value.segmentPointCounts.filter((count): count is number => typeof count === "number" && Number.isInteger(count) && count >= 2) } : {}),
    ...(typeof value.segmentCount === "number" && Number.isInteger(value.segmentCount) && value.segmentCount >= 1 ? { segmentCount: value.segmentCount } : {}),
    ...(typeof value.traceCount === "number" && Number.isInteger(value.traceCount) && value.traceCount >= 1 ? { traceCount: value.traceCount } : {}),
    ...(value.provenance === "planned" || value.provenance === "unknown" ? { provenance: value.provenance } : {}),
    ...(value.intent === "planned" || value.intent === "observed" ? { intent: value.intent } : {}),
    ...(files.length > 0 ? { files } : {}),
    ...(typeof value.fileName === "string" ? { fileName: value.fileName } : {}),
  };
}

export function hasValidGpxPair(
  parsed: Record<string, unknown>,
  gpxImport: ActionGpxImportMetadata | null,
  manualDrawing: ActionDrawing | null,
): boolean {
  const representativePointCount = gpxImport?.files?.flatMap((file) => file.segments)[0]?.pointCount ?? gpxImport?.pointCount;
  return Boolean(
    gpxImport &&
      manualDrawing &&
      parsed.manualDrawingSource === "gpx_import" &&
      representativePointCount === manualDrawing.coordinates.length,
  );
}
