import type { useActionDeclarationFormLifecycle } from "./use-action-declaration-form-lifecycle";
import type { useActionDeclarationFormMedia } from "./use-action-declaration-form-media";
import type { useActionDeclarationFormExecution } from "./use-action-declaration-form-execution";
import type { resolveActionDeclarationGeometryState } from "./action-declaration-form-geometry";

type ActionDeclarationLifecycle = ReturnType<typeof useActionDeclarationFormLifecycle>;
type ActionDeclarationMedia = ReturnType<typeof useActionDeclarationFormMedia>;
type ActionDeclarationGeometry = ReturnType<typeof resolveActionDeclarationGeometryState>;
type ActionDeclarationExecution = ReturnType<typeof useActionDeclarationFormExecution>;

export function buildActionDeclarationFormResult({
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
  const { photoAssets, visionEstimate, visionStatus, photoError, photoPreparationPending, handlePhotoUpload, handlePhotoReplace, removePhoto, clearPhotos } = media;
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
    photoError,
    photoPreparationPending,
    submissionState: submission.submissionState,
    errorMessage: submission.errorMessage,
    createdId: submission.createdId,
    recordedAction: submission.recordedAction,
    retentionLoop: submission.retentionLoop,
    loadedActionPhase: hydration.loadedActionPhase,
    isHydratingAction: hydration.isHydratingAction,
    hydrationError: hydration.hydrationError,
    validationIssues: submission.validationIssues,
    validationStatus: submission.validationStatus,
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
    handlePhotoReplace,
    removePhoto,
    clearPhotos,
    handleGpxImport: updates.handleGpxImport,
    removeGpxImport: updates.removeGpxImport,
    updateField: updates.updateField,
    updateFields: updates.updateFields,
    handleResumeDraft: draft.handleResumeDraft,
    handleIgnoreDraft: draft.handleIgnoreDraft,
    validateBeforeConfirmation: submission.validateBeforeConfirmation,
    handleConfirmSubmit: submission.handleConfirmSubmit,
    actionMediaUpload: submission.actionMediaUpload,
    retryActionMediaUploads: submission.retryActionMediaUploads,
  };
}
