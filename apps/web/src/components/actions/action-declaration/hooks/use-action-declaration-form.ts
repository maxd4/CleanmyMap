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

type ActionDeclarationLifecycle = ReturnType<typeof useActionDeclarationFormLifecycle>;
type ActionDeclarationMedia = ReturnType<typeof useActionDeclarationFormMedia>;
type ActionDeclarationGeometry = ReturnType<typeof resolveActionDeclarationGeometryState>;
type ActionDeclarationExecution = ReturnType<typeof useActionDeclarationFormExecution>;

function buildActionDeclarationFormResult({
  lifecycle,
  media,
  geometry,
  execution,
  isCleanPlaceMode,
}: {
  lifecycle: ActionDeclarationLifecycle;
  media: ActionDeclarationMedia;
  geometry: ActionDeclarationGeometry;
  execution: ActionDeclarationExecution;
  isCleanPlaceMode: boolean;
}) {
  const { form, setForm, manualDrawing, manualDrawingSource, gpxError, hasAttemptedSubmit, setManualDrawing, hydration, draft, resolvedDefaultActorName } = lifecycle;
  const { photoAssets, visionEstimate, visionStatus, handlePhotoUpload, clearPhotos } = media;
  const { submission, updates } = execution;

  return {
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
    showDraftBanner: Boolean(draft.pendingDraft && !draft.isDraftResumed),
    draftStorageReadError: draft.draftStorageReadError,
    retryDraftLoad: draft.retryDraftLoad,
    isCleanPlaceMode,
    payload: execution.payload,
    dataQuality: execution.dataQuality,
    effectiveRoutePreviewDrawing: geometry.effectiveRoutePreviewDrawing,
    effectiveRoutePreviewSource: geometry.activeFinalGeometry?.source ?? null,
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
    actionMediaUpload: submission.actionMediaUpload,
    retryActionMediaUploads: submission.retryActionMediaUploads,
  };
}

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
    setHasAttemptedSubmit,
    hydration,
    draft,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setGpxError,
  } = lifecycle;
  const isCleanPlaceMode = form.recordType === "clean_place";
  const media = useActionDeclarationFormMedia({ locationLabel: form.locationLabel, placeType: form.placeType, volunteersCount: form.volunteersCount, durationMinutes: form.durationMinutes });
  const { photoAssets, visionEstimate } = media;

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
    draftStorageReadError: draft.draftStorageReadError,
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
    creationRequestId: draft.creationRequestId,
    persistedDrawing,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setGpxError,
    saveDraftIfAllowed: draft.saveDraftIfAllowed,
  });
  return buildActionDeclarationFormResult({ lifecycle, media, geometry, execution, isCleanPlaceMode });
}
