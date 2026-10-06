import { useMemo, type Dispatch, type SetStateAction } from "react";
import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import { buildCreateActionPayload } from "../payload";
import { computeActionDataQuality } from "../utils/action-declaration-form.quality";
import type { FormState } from "../model";
import type { ActionDeclarationUserMetadata } from "./use-action-declaration-submission";
import type { LoadedActionPhase } from "../utils/action-declaration-hydration.model";
import { useActionDeclarationSmartAssist } from "./use-action-declaration-smart-assist";
import { useActionDeclarationSubmission } from "./use-action-declaration-submission";
import { useActionDeclarationFormUpdates } from "./use-action-declaration-form-updates";
import type { ActionDeclarationGeometryState } from "./action-declaration-form-geometry";

type ActionDeclarationFormExecutionParams = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  declarationMode: "complete";
  isAuthenticated: boolean;
  initialActionId: string | null;
  linkedEventId?: string;
  userMetadata: ActionDeclarationUserMetadata;
  manualDrawingEnabled: boolean;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  geometry: ActionDeclarationGeometryState;
  isCleanPlaceMode: boolean;
  loadedActionPhase: LoadedActionPhase;
  setLoadedActionPhase: Dispatch<SetStateAction<LoadedActionPhase>>;
  setHasAttemptedSubmit: Dispatch<SetStateAction<boolean>>;
  clearDraft: () => void;
  persistedDrawing: ActionDrawing | null;
  setPersistedDrawing: Dispatch<SetStateAction<ActionDrawing | null>>;
  setPersistedDrawingSource: Dispatch<SetStateAction<ActionGeometrySource | null>>;
  setManualDrawingState: Dispatch<SetStateAction<ActionDrawing | null>>;
  setManualDrawingSource: Dispatch<SetStateAction<ActionGeometrySource | null>>;
  setGpxError: (message: string | null) => void;
  saveDraftIfAllowed: Parameters<typeof useActionDeclarationFormUpdates>[0]["saveDraftIfAllowed"];
}

export function useActionDeclarationFormExecution({
  form,
  setForm,
  declarationMode,
  isAuthenticated,
  initialActionId,
  linkedEventId,
  userMetadata,
  manualDrawingEnabled,
  manualDrawing,
  manualDrawingSource,
  photoAssets,
  visionEstimate,
  geometry,
  isCleanPlaceMode,
  loadedActionPhase,
  setLoadedActionPhase,
  setHasAttemptedSubmit,
  clearDraft,
  persistedDrawing,
  setPersistedDrawing,
  setPersistedDrawingSource,
  setManualDrawingState,
  setManualDrawingSource,
  setGpxError,
  saveDraftIfAllowed,
}: ActionDeclarationFormExecutionParams) {
  const payload = useMemo(() => buildCreateActionPayload({
    form,
    declarationMode,
    isEntrepriseMode: false,
    effectiveManualDrawingEnabled: manualDrawingEnabled,
    drawingIsValid: geometry.drawingIsValid,
    manualDrawing,
    manualDrawingSource,
    routePreviewDrawing: geometry.effectiveRoutePreviewDrawing,
    routePreviewSource: geometry.activeFinalGeometry?.source,
    linkedEventId,
    photos: photoAssets,
    visionEstimate,
    userMetadata,
  }), [declarationMode, form, geometry, linkedEventId, manualDrawing, manualDrawingEnabled, manualDrawingSource, photoAssets, userMetadata, visionEstimate]);

  const dataQuality = useMemo(() => computeActionDataQuality({
    form,
    declarationMode,
    recordType: form.recordType,
    hasLocationProof: form.latitude.trim().length > 0 && form.longitude.trim().length > 0,
    hasDrawingProof: geometry.hasValidDrawing,
    photoAssets,
    visionEstimate,
  }), [declarationMode, form, geometry.hasValidDrawing, photoAssets, visionEstimate]);

  const smartAssist = useActionDeclarationSmartAssist({ form, setForm, visionEstimate });
  const submission = useActionDeclarationSubmission({
    form,
    declarationMode,
    isAuthenticated,
    initialActionId,
    loadedActionPhase,
    setLoadedActionPhase,
    setHasAttemptedSubmit,
    manualDrawingEnabled,
    manualDrawing,
    manualDrawingSource,
    drawingIsValid: geometry.manualDrawingValidation.isValid,
    effectiveRoutePreviewDrawing: geometry.effectiveRoutePreviewDrawing,
    routePreviewSource: geometry.activeFinalGeometry?.source,
    hasValidDrawing: geometry.hasValidDrawing,
    hasServerRouteInput: geometry.hasServerRouteInput,
    isCleanPlaceMode,
    payload,
    linkedEventId,
    photoAssets,
    visionEstimate,
    userMetadata,
    clearDraft,
  });
  const updates = useActionDeclarationFormUpdates({
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
    shouldSaveDraft: submission.submissionState !== "success",
    trackFormStart: submission.trackFormStart,
  });

  return { payload, dataQuality, smartAssist, submission, updates };
}
