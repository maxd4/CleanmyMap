import { useState } from "react";
import type { ActionDeclarationUserMetadata } from "./use-action-declaration-submission";
import { useActionDeclarationFormLifecycle } from "./use-action-declaration-form-lifecycle";
import { useActionDeclarationFormMedia } from "./use-action-declaration-form-media";
import { useActionDeclarationFormExecution } from "./use-action-declaration-form-execution";
import { resolveActionDeclarationGeometryState } from "./action-declaration-form-geometry";

type UseActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  userMetadata: ActionDeclarationUserMetadata;
  initialActionId?: string | null;
  linkedEventId?: string;
  initialRecordType?: "action";
};

export function useActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  userMetadata,
  initialActionId = null,
  linkedEventId,
  initialRecordType = "action",
}: UseActionDeclarationFormProps) {
  const [declarationMode] = useState<"complete">("complete");
  const lifecycle = useActionDeclarationFormLifecycle({ defaultActorName, actorNameOptions, userId: userMetadata.userId, initialActionId, initialRecordType });
  const {
    form,
    setForm,
    manualDrawingEnabled,
    manualDrawing,
    manualDrawingSource,
    persistedDrawing,
    persistedDrawingSource,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setManualDrawing,
    gpxError,
    setGpxError,
    hasAttemptedSubmit,
    setHasAttemptedSubmit,
    hydration,
    draft,
    resolvedDefaultActorName,
  } = lifecycle;
  const isCleanPlaceMode = form.recordType === "clean_place";
  const media = useActionDeclarationFormMedia({ locationLabel: form.locationLabel, placeType: form.placeType, volunteersCount: form.volunteersCount, durationMinutes: form.durationMinutes });
  const { photoAssets, visionEstimate, visionStatus, handlePhotoUpload, clearPhotos } = media;

  const geometry = resolveActionDeclarationGeometryState({
    form,
    manualDrawing,
    manualDrawingSource,
    persistedDrawing,
    persistedDrawingSource,
  });
  // Network reconstruction is server-only; the browser never routes or calls
  // a public routing provider for an action draft.
  const execution = useActionDeclarationFormExecution({
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
    loadedActionPhase: hydration.loadedActionPhase,
    setLoadedActionPhase: hydration.setLoadedActionPhase,
    setHasAttemptedSubmit,
    clearDraft: draft.clearDraft,
    persistedDrawing,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setGpxError,
    saveDraftIfAllowed: draft.saveDraftIfAllowed,
  });
  const { submission, updates } = execution;

  return {
    // State
    form,
    setForm,
    resolvedDefaultActorName,
    manualDrawing,
    manualDrawingSource,
    gpxImport: form.gpxImport,
    gpxError,
    setManualDrawing,
    photoAssets,
    visionEstimate,
    visionStatus,
    submissionState: submission.submissionState,
    errorMessage: submission.errorMessage,
    createdId: submission.createdId,
    recordedAction: submission.recordedAction,
    retentionLoop: submission.retentionLoop,
    loadedActionPhase: hydration.loadedActionPhase,
    isHydratingAction: hydration.isHydratingAction,
    hydrationError: hydration.hydrationError,
    validationIssues: submission.validationIssues,
    hasAttemptedSubmit,
    showConfirmation: submission.showConfirmation,
    setShowConfirmation: submission.setShowConfirmation,
    pendingDraftSavedAt: draft.pendingDraft?.savedAt ?? null,
    showDraftBanner: Boolean(draft.pendingDraft),
    isCleanPlaceMode,

    // Computed & payload
    payload: execution.payload,
    dataQuality: execution.dataQuality,
    effectiveRoutePreviewDrawing: geometry.effectiveRoutePreviewDrawing,
    effectiveRoutePreviewSource: geometry.activeFinalGeometry?.source ?? null,

    // Smart Assist state
    smartAssist: execution.smartAssist,

    handlePhotoUpload,
    clearPhotos,
    handleGpxImport: updates.handleGpxImport,
    removeGpxImport: updates.removeGpxImport,
    updateField: updates.updateField,
    updateFields: updates.updateFields,
    handleResumeDraft: draft.handleResumeDraft,
    handleIgnoreDraft: draft.handleIgnoreDraft,
    handleConfirmSubmit: submission.handleConfirmSubmit,
  };
}
