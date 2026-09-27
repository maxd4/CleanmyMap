import { GpxImportError, parseGpxFile } from "@/lib/actions/geometry/gpx";
import type {
  ActionDrawing,
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
  async function handleGpxImport(file: File | null) {
    if (!file) return;
    try {
      const parsed = await parseGpxFile(file);
      if (parsed.metadata.inferredTopology !== form.routeTopology) {
        setGpxError(
          parsed.metadata.inferredTopology === "loop"
            ? "Ce GPX est fermé. Sélectionnez Boucle avant de l’importer."
            : "Ce GPX est ouvert. Sélectionnez Départ → arrivée avant de l’importer.",
        );
        return;
      }
      if (
        (manualDrawing && manualDrawingSource !== "gpx_import") ||
        form.gpxImport
      ) {
        const confirmed = window.confirm(
          "Remplacer le tracé actuel par ce tracé GPX ?",
        );
        if (!confirmed) return;
      }
      setManualDrawingState(parsed.drawing);
      setManualDrawingSource("gpx_import");
      setGpxError(null);
      updateForm(
        { gpxImport: parsed.metadata },
        { drawing: parsed.drawing, source: "gpx_import" },
      );
    } catch (error: unknown) {
      setGpxError(
        error instanceof GpxImportError
          ? error.message
          : "Impossible de lire ce fichier GPX.",
      );
    }
  }

  function removeGpxImport() {
    if (manualDrawingSource === "gpx_import") {
      setManualDrawingState(null);
      setManualDrawingSource(null);
    }
    setGpxError(null);
    updateForm({ gpxImport: null }, null);
  }

  return { handleGpxImport, removeGpxImport };
}
