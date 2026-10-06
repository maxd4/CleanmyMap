import type { ActionDrawing, ActionGeometrySource } from "@/lib/actions/types";
import type { ActionDeclarationDraftGeometry } from "../draft-storage";
import type { FormState } from "../model";
import { createActionDeclarationGeometryHandlers } from "./action-declaration-geometry.handlers";
import {
  getRouteTopologyConflictMessage,
  prepareActionDeclarationFormUpdate,
} from "./action-declaration-form-geometry";

type ActionDeclarationFormUpdatesParams = {
  form: FormState;
  setForm: (form: FormState) => void;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  persistedDrawing: ActionDrawing | null;
  setPersistedDrawing: (drawing: ActionDrawing | null) => void;
  setPersistedDrawingSource: (source: ActionGeometrySource | null) => void;
  setManualDrawingState: (drawing: ActionDrawing | null) => void;
  setManualDrawingSource: (source: ActionGeometrySource | null) => void;
  setGpxError: (message: string | null) => void;
  setHasAttemptedSubmit: (attempted: boolean) => void;
  saveDraftIfAllowed: (
    form: FormState,
    draftGeometry?: ActionDeclarationDraftGeometry,
    shouldSave?: boolean,
  ) => void;
  shouldSaveDraft: boolean;
  trackFormStart: () => void;
};

export function useActionDeclarationFormUpdates({
  form,
  setForm,
  manualDrawing,
  manualDrawingSource,
  persistedDrawing,
  setPersistedDrawing,
  setPersistedDrawingSource,
  setManualDrawingState,
  setManualDrawingSource,
  setGpxError,
  setHasAttemptedSubmit,
  saveDraftIfAllowed,
  shouldSaveDraft,
  trackFormStart,
}: ActionDeclarationFormUpdatesParams) {
  function updateForm(
    updates: Partial<FormState>,
    draftGeometry?: ActionDeclarationDraftGeometry,
  ) {
    const routeTopologyConflict = getRouteTopologyConflictMessage(form, updates);
    if (routeTopologyConflict) {
      setGpxError(routeTopologyConflict);
      return;
    }
    const { nextForm, clearsPersistedDrawing } = prepareActionDeclarationFormUpdate(form, updates);
    if (persistedDrawing && clearsPersistedDrawing) {
      setPersistedDrawing(null);
      setPersistedDrawingSource(null);
    }
    const activeDraftGeometry = draftGeometry === undefined
      ? nextForm.gpxImport && manualDrawingSource === "gpx_import" && manualDrawing
        ? { drawing: manualDrawing, source: "gpx_import" as const }
        : null
      : draftGeometry;
    saveDraftIfAllowed(nextForm, activeDraftGeometry, shouldSaveDraft);
    if (updates.recordType !== undefined) {
      setHasAttemptedSubmit(false);
    }
    setForm(nextForm);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    trackFormStart();
    updateForm({ [key]: value } as Partial<FormState>);
  }

  function updateFields(updates: Partial<FormState>) {
    trackFormStart();
    updateForm(updates);
  }

  const { handleGpxImport, removeGpxImport } = createActionDeclarationGeometryHandlers({
    form,
    manualDrawing,
    manualDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setGpxError,
    updateForm,
  });

  return { updateField, updateFields, handleGpxImport, removeGpxImport };
}
