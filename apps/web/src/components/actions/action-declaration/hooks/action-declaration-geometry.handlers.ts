import { createGpxFileIdentity, GpxImportError, parseGpxFiles } from "@/lib/actions/geometry/gpx";
import type {
  ActionDrawing,
  ActionGpxImportFile,
  ActionGpxImportMetadata,
  ActionGeometrySource,
} from "@/lib/actions/types";
import type { ActionDeclarationDraftGeometry } from "../draft-storage";
import type { FormState } from "../model";

type UpdateForm = (
  updates: Partial<FormState>,
  draftGeometry?: ActionDeclarationDraftGeometry,
) => void;

type ActionDeclarationGeometryHandlersParams = {
  form: FormState;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  setManualDrawingState: (drawing: ActionDrawing | null) => void;
  setManualDrawingSource: (source: ActionGeometrySource | null) => void;
  setGpxError: (message: string | null) => void;
  updateForm: UpdateForm;
};

export function createActionDeclarationGeometryHandlers({
  form,
  manualDrawing,
  manualDrawingSource,
  setManualDrawingState,
  setManualDrawingSource,
  setGpxError,
  updateForm,
}: ActionDeclarationGeometryHandlersParams) {
  function rebuildMetadata(files: ActionGpxImportFile[], intent: ActionGpxImportMetadata["intent"] = form.gpxImport?.intent ?? "planned") {
    const effectiveIntent = files.some((file) => file.provenance === "planned") ? "planned" : intent;
    const segments = files.flatMap((file) => file.segments);
    const first = segments[0];
    return {
      source: "gpx_import" as const,
      observedDistanceKm: Number(segments.reduce((total, segment) => total + segment.distanceKm, 0).toFixed(3)),
      pointCount: segments.reduce((total, segment) => total + segment.pointCount, 0),
      inferredTopology: first?.topology ?? form.routeTopology,
      segmentTopologies: segments.map((segment) => segment.topology),
      segmentDistancesKm: segments.map((segment) => segment.distanceKm),
      segmentPointCounts: segments.map((segment) => segment.pointCount),
      segmentCount: segments.length,
      traceCount: new Set(segments.map((segment) => `${segment.fileId ?? segment.fileName}:${segment.traceIndex}`)).size,
      provenance: files.every((file) => file.provenance === "planned") ? "planned" as const : "unknown" as const,
      intent: effectiveIntent,
      gpxImportProvenance: files.some((file) => file.provenance === "planned") ? "planned" as const : "unknown" as const,
      files,
      fileName: files.length === 1 ? files[0]?.fileName : undefined,
    } satisfies ActionGpxImportMetadata;
  }

  async function handleGpxImport(filesInput: FileList | readonly File[] | null) {
    const files = filesInput ? Array.from(filesInput) : [];
    if (files.length === 0) return;
    try {
      const parsedFiles = await parseGpxFiles(files);
      const candidates: ActionGpxImportFile[] = parsedFiles.map((result) => {
        if (!result.ok) return { fileId: createGpxFileIdentity(), fileName: result.fileName, provenance: "unknown", segments: [], error: result.error };
        const candidate = result.parsed.metadata.files?.[0];
        const topologyMismatch = result.parsed.segments.some((segment) => {
          const topology = result.parsed.metadata.segmentTopologies?.[result.parsed.segments.indexOf(segment)];
          return topology !== form.routeTopology;
        });
        if (topologyMismatch) {
          return {
            fileId: candidate?.fileId ?? createGpxFileIdentity(),
            fileName: result.fileName,
            provenance: result.parsed.provenance,
            segments: [],
            error: form.routeTopology === "loop"
              ? "Ce fichier contient un segment ouvert : sélectionnez Boucle uniquement pour des traces fermées."
              : "Ce fichier contient un segment fermé : sélectionnez Départ → arrivée uniquement pour des traces ouvertes.",
          };
        }
        return candidate ?? { fileId: createGpxFileIdentity(), fileName: result.fileName, provenance: result.parsed.provenance, segments: [] };
      });
      const validIncoming = candidates.some((candidate) => candidate.segments.length > 0);
      if (!validIncoming && candidates.every((candidate) => candidate.error)) {
        setGpxError("Aucun fichier GPX exploitable n’a été ajouté. Les erreurs sont conservées dans la liste.");
      }
      if ((manualDrawing && manualDrawingSource !== "gpx_import") || form.gpxImport) {
        const confirmed = window.confirm(
          "Ajouter ces traces GPX aux candidates locales existantes ?",
        );
        if (!confirmed) return;
      }
      const existingFiles = form.gpxImport?.files ?? [];
      const allFiles = [...existingFiles, ...candidates];
      const metadata = rebuildMetadata(allFiles);
      const firstSegment = allFiles.flatMap((file) => file.segments)[0];
      const drawing: ActionDrawing | null = firstSegment
        ? { kind: "polyline", coordinates: firstSegment.coordinates }
        : manualDrawing;
      setManualDrawingState(drawing);
      setManualDrawingSource("gpx_import");
      setGpxError(candidates.some((candidate) => candidate.error) ? "Certains fichiers GPX n’ont pas été ajoutés : consultez leurs erreurs." : null);
      updateForm(
        { gpxImport: metadata, geometryMethod: "gpx_import" },
        drawing ? { drawing, source: "gpx_import" } : null,
      );
    } catch (error: unknown) {
      setGpxError(
        error instanceof GpxImportError
          ? error.message
          : "Impossible de lire ce fichier GPX.",
      );
    }
  }

  function removeGpxImport(fileIdOrFingerprint?: string) {
    if (fileIdOrFingerprint && form.gpxImport?.files) {
      const removesFile = form.gpxImport.files.some((file) =>
        file.fileId === fileIdOrFingerprint || (!file.fileId && file.fileName === fileIdOrFingerprint),
      );
      const files = form.gpxImport.files
        .filter((file) => !removesFile || (file.fileId === fileIdOrFingerprint || (!file.fileId && file.fileName === fileIdOrFingerprint)) === false)
        .map((file) => ({
          ...file,
          segments: removesFile
            ? file.segments
            : file.segments.filter((segment) => segment.sourceFingerprint !== fileIdOrFingerprint),
        }))
        .filter((file) => file.error ? true : file.segments.length > 0);
      const nextMetadata = files.length > 0 ? rebuildMetadata(files) : null;
      const firstSegment = files.flatMap((file) => file.segments)[0];
      const nextDrawing = firstSegment ? { kind: "polyline" as const, coordinates: firstSegment.coordinates } : null;
      setManualDrawingState(nextDrawing);
      setManualDrawingSource(nextDrawing ? "gpx_import" : null);
      setGpxError(null);
      updateForm({ gpxImport: nextMetadata, geometryMethod: nextDrawing ? "gpx_import" : form.operationalRoute ? "generator" : "automatic" }, nextDrawing ? { drawing: nextDrawing, source: "gpx_import" } : null);
      return;
    }
    if (manualDrawingSource === "gpx_import") {
      setManualDrawingState(null);
      setManualDrawingSource(null);
    }
    setGpxError(null);
    updateForm({ gpxImport: null, geometryMethod: form.operationalRoute ? "generator" : "automatic" }, null);
  }

  function setGpxIntent(intent: "planned" | "observed") {
    if (!form.gpxImport) return;
    if (intent === "observed" && form.gpxImport.files?.some((file) => file.provenance === "planned")) {
      setGpxError("Un fichier GPX marqué planned ne peut pas être requalifié en trace de terrain.");
      return;
    }
    setGpxError(null);
    updateForm({ gpxImport: { ...form.gpxImport, intent } });
  }

  return { handleGpxImport, removeGpxImport, setGpxIntent };
}
