import { createGpxFileIdentity, GpxImportError, parseGpxFiles } from "@/lib/actions/geometry/gpx";
import type {
  ActionDrawing,
  ActionGpxImportFile,
  ActionGpxImportMetadata,
  ActionGpxImportRemovalTarget,
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

function ensureUniqueFileIdentities(existingFiles: ActionGpxImportFile[], incomingFiles: ActionGpxImportFile[]) {
  const usedFileIds = new Set(existingFiles.flatMap((file) => file.fileId ? [file.fileId] : []));
  return incomingFiles.map((file) => {
    let fileId = file.fileId;
    while (!fileId || usedFileIds.has(fileId)) fileId = createGpxFileIdentity();
    usedFileIds.add(fileId);
    return { ...file, fileId, segments: file.segments.map((segment) => ({ ...segment, fileId })) };
  });
}

function rebuildGpxMetadata(files: ActionGpxImportFile[], routeTopology: FormState["routeTopology"], intent: ActionGpxImportMetadata["intent"] = "planned") {
  const effectiveIntent = files.some((file) => file.provenance === "planned") ? "planned" : intent;
  const segments = files.flatMap((file) => file.segments);
  const first = segments[0];
  return {
    source: "gpx_import" as const,
    observedDistanceKm: Number(segments.reduce((total, segment) => total + segment.distanceKm, 0).toFixed(3)),
    pointCount: segments.reduce((total, segment) => total + segment.pointCount, 0),
    inferredTopology: first?.topology ?? routeTopology,
    segmentTopologies: segments.map((segment) => segment.topology),
    segmentDistancesKm: segments.map((segment) => segment.distanceKm),
    segmentPointCounts: segments.map((segment) => segment.pointCount),
    segmentCount: segments.length,
    traceCount: new Set(files.flatMap((file) => file.segments.map((segment) => `${file.fileId ?? segment.fileId ?? file.fileName}:${segment.traceIndex}`))).size,
    provenance: files.every((file) => file.provenance === "planned") ? "planned" as const : "unknown" as const,
    intent: effectiveIntent,
    gpxImportProvenance: files.some((file) => file.provenance === "planned") ? "planned" as const : "unknown" as const,
    files,
    fileName: files.length === 1 ? files[0]?.fileName : undefined,
  } satisfies ActionGpxImportMetadata;
}

export function createActionDeclarationGeometryHandlers({
  form,
  manualDrawing,
  manualDrawingSource,
  setManualDrawingState,
  setManualDrawingSource,
  setGpxError,
  updateForm,
}: ActionDeclarationGeometryHandlersParams) {
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
      const allFiles = [...existingFiles, ...ensureUniqueFileIdentities(existingFiles, candidates)];
      const metadata = rebuildGpxMetadata(allFiles, form.routeTopology, form.gpxImport?.intent ?? "planned");
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

  function removeGpxImport(target?: ActionGpxImportRemovalTarget | string) {
    if (target && form.gpxImport?.files) {
      const filesBeforeRemoval = form.gpxImport.files;
      const legacyFileIndex = typeof target === "string"
        ? filesBeforeRemoval.findIndex((file) => file.fileId === target || (!file.fileId && file.fileName === target))
        : -1;
      const normalizedTarget: ActionGpxImportRemovalTarget | null = typeof target === "string"
        ? legacyFileIndex >= 0
          ? { kind: "file", fileId: filesBeforeRemoval[legacyFileIndex]?.fileId, fileIndex: legacyFileIndex }
          : { kind: "segment", fileIndex: -1, sourceFingerprint: target }
        : target;
      const matchesFile = (file: ActionGpxImportFile, fileIndex: number) => Boolean(
        normalizedTarget &&
        (normalizedTarget.fileId ? file.fileId === normalizedTarget.fileId : fileIndex === normalizedTarget.fileIndex),
      );
      const removesFile = normalizedTarget?.kind === "file";
      const files = filesBeforeRemoval
        .map((file, fileIndex) => {
          if (removesFile && matchesFile(file, fileIndex)) return null;
          if (normalizedTarget?.kind !== "segment") return file;
          const removeEveryMatchingSegment = typeof target === "string" && normalizedTarget.fileIndex < 0;
          if (!removeEveryMatchingSegment && !matchesFile(file, fileIndex)) return file;
          return {
            ...file,
            segments: file.segments.filter((segment) => segment.sourceFingerprint !== normalizedTarget.sourceFingerprint),
          };
        })
        .filter((file): file is ActionGpxImportFile => Boolean(file))
        .filter((file) => file.error ? true : file.segments.length > 0);
      const nextMetadata = files.length > 0 ? rebuildGpxMetadata(files, form.routeTopology, form.gpxImport?.intent ?? "planned") : null;
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
