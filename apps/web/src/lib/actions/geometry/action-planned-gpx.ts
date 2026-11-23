import { createGpxFileIdentity, parseGpxFiles, type GpxFileParseResult } from "./gpx";
import type { ActionGpxImportFile, ActionGpxImportMetadata, ActionRouteTopology } from "../types";

export async function parsePlannedGpxFiles(
  input: FileList | readonly File[],
  topology: ActionRouteTopology,
): Promise<{ metadata: ActionGpxImportMetadata; errors: string[] }> {
  const results: GpxFileParseResult[] = await parseGpxFiles(Array.from(input));
  const files: ActionGpxImportFile[] = results.map((result) => {
    if (!result.ok) return { fileId: createGpxFileIdentity(), fileName: result.fileName, provenance: "unknown", segments: [], error: result.error };
    const candidate = result.parsed.metadata.files?.[0];
    const segments = candidate?.segments ?? [];
    const mismatch = segments.some((segment) => segment.topology !== topology);
    if (mismatch) return {
      fileId: candidate?.fileId ?? createGpxFileIdentity(), fileName: result.fileName,
      provenance: result.parsed.provenance, segments: [],
      error: topology === "loop" ? "Le parcours prévu doit être une boucle." : "Le parcours prévu doit relier un départ à une arrivée.",
    };
    return candidate ?? { fileId: createGpxFileIdentity(), fileName: result.fileName, provenance: result.parsed.provenance, segments: [] };
  });
  const segments = files.flatMap((file) => file.segments);
  const first = segments[0];
  const importedPlanned = files.some((file) => file.provenance === "planned");
  const metadata: ActionGpxImportMetadata = {
    source: "gpx_import",
    observedDistanceKm: Number(segments.reduce((sum, segment) => sum + segment.distanceKm, 0).toFixed(3)),
    pointCount: segments.reduce((sum, segment) => sum + segment.pointCount, 0),
    inferredTopology: first?.topology ?? topology,
    segmentTopologies: segments.map(({ topology: value }) => value),
    segmentDistancesKm: segments.map(({ distanceKm }) => distanceKm),
    segmentPointCounts: segments.map(({ pointCount }) => pointCount),
    segmentCount: segments.length,
    traceCount: new Set(segments.map((segment) => `${segment.fileId ?? segment.fileName}:${segment.traceIndex}`)).size,
    provenance: importedPlanned ? "planned" : "unknown",
    gpxImportProvenance: importedPlanned ? "planned" : "unknown",
    intent: "planned",
    files,
  };
  return { metadata, errors: files.flatMap((file) => file.error ? [`${file.fileName} : ${file.error}`] : []) };
}
