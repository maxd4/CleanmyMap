import { useEffect, useRef, useState } from "react";
import type { ActionDeclarationUserMetadata } from "./use-action-declaration-submission";
import { useActionDeclarationFormLifecycle } from "./use-action-declaration-form-lifecycle";
import { useActionDeclarationFormMedia } from "./use-action-declaration-form-media";
import { useActionDeclarationFormExecution } from "./use-action-declaration-form-execution";
import { resolveActionDeclarationGeometryState } from "./action-declaration-form-geometry";
import { buildActionDeclarationFormResult } from "./use-action-declaration-form-result";
import { createInitialFormState } from "../payload";

type ActionDeclarationExecutionStateParams = {
  lifecycle: ReturnType<typeof useActionDeclarationFormLifecycle>;
  media: ReturnType<typeof useActionDeclarationFormMedia>;
  geometry: ReturnType<typeof resolveActionDeclarationGeometryState>;
  declarationMode: "complete";
  isAuthenticated: boolean;
  initialActionId: string | null;
  linkedEventId?: string;
  userMetadata: ActionDeclarationUserMetadata;
  isCleanPlaceMode: boolean;
  onBusinessDataChange: () => void;
};

function useActionDeclarationFormExecutionState(
  params: ActionDeclarationExecutionStateParams,
) {
  const { lifecycle, media } = params;
  return useActionDeclarationFormExecution({
    form: lifecycle.form,
    setForm: lifecycle.setForm,
    declarationMode: params.declarationMode,
    isAuthenticated: params.isAuthenticated,
    draftStorageReadError: lifecycle.draft.draftStorageReadError,
    initialActionId: params.initialActionId,
    linkedEventId: params.linkedEventId,
    userMetadata: params.userMetadata,
    manualDrawingEnabled: lifecycle.manualDrawingEnabled,
    manualDrawing: lifecycle.manualDrawing,
    manualDrawingSource: lifecycle.manualDrawingSource,
    photoAssets: media.photoAssets,
    photoPreparationPending: media.photoPreparationPending,
    visionEstimate: media.visionEstimate,
    geometry: params.geometry,
    isCleanPlaceMode: params.isCleanPlaceMode,
    loadedActionPhase: lifecycle.hydration.loadedActionPhase,
    setLoadedActionPhase: lifecycle.hydration.setLoadedActionPhase,
    setHasAttemptedSubmit: lifecycle.setHasAttemptedSubmit,
    clearDraft: lifecycle.draft.clearDraft,
    creationRequestId: lifecycle.draft.creationRequestId,
    persistedDrawing: lifecycle.persistedDrawing,
    setPersistedDrawing: lifecycle.setPersistedDrawing,
    setPersistedDrawingSource: lifecycle.setPersistedDrawingSource,
    setManualDrawingState: lifecycle.setManualDrawingState,
    setManualDrawingSource: lifecycle.setManualDrawingSource,
    setGpxError: lifecycle.setGpxError,
    onBusinessDataChange: params.onBusinessDataChange,
    saveDraftIfAllowed: lifecycle.draft.saveDraftIfAllowed,
  });
}

function buildResetForm(params: {
  setForm: (state: ReturnType<typeof createInitialFormState>) => void;
  resolvedDefaultActorName: string;
  initialRecordType: "action";
  setManualDrawingState: (value: null) => void;
  setManualDrawingSource: (value: null) => void;
  setPersistedDrawing: (value: null) => void;
  setPersistedDrawingSource: (value: null) => void;
  setGpxError: (value: null) => void;
  clearPhotos: () => void;
  resetSubmission: () => void;
}) {
  return () => {
    params.setForm(createInitialFormState(params.resolvedDefaultActorName, params.initialRecordType));
    params.setManualDrawingState(null);
    params.setManualDrawingSource(null);
    params.setPersistedDrawing(null);
    params.setPersistedDrawingSource(null);
    params.setGpxError(null);
    params.clearPhotos();
    params.resetSubmission();
  };
}

function resolveFormGeometry(
  lifecycle: ReturnType<typeof useActionDeclarationFormLifecycle>,
) {
  return resolveActionDeclarationGeometryState({
    form: lifecycle.form,
    manualDrawing: lifecycle.manualDrawing,
    manualDrawingSource: lifecycle.manualDrawingSource,
    persistedDrawing: lifecycle.persistedDrawing,
    persistedDrawingSource: lifecycle.persistedDrawingSource,
  });
}

function useSubmissionValidationInvalidation(
  validationInvalidationRef: React.MutableRefObject<() => void>,
  execution: { submission: { invalidateValidation: () => void } },
) {
  useEffect(() => {
    validationInvalidationRef.current = execution.submission.invalidateValidation;
  }, [execution.submission.invalidateValidation, validationInvalidationRef]);
}

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
  const validationInvalidationRef = useRef<() => void>(() => undefined);
  const invalidateValidation = () => validationInvalidationRef.current();
  const lifecycle = useActionDeclarationFormLifecycle({
    defaultActorName,
    actorNameOptions,
    userId: userMetadata.userId,
    initialActionId,
    initialRecordType,
    onBusinessDataChange: invalidateValidation,
  });
  const {
    form,
    setForm,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource,
    setGpxError,
    resolvedDefaultActorName,
  } = lifecycle;
  const isCleanPlaceMode = form.recordType === "clean_place";
  const media = useActionDeclarationFormMedia({ onPhotoMutation: invalidateValidation });

  const geometry = resolveFormGeometry(lifecycle);
  const execution = useActionDeclarationFormExecutionState({
    lifecycle,
    media,
    geometry,
    declarationMode,
    isAuthenticated,
    initialActionId,
    linkedEventId,
    userMetadata,
    isCleanPlaceMode,
    onBusinessDataChange: invalidateValidation,
  });
  useSubmissionValidationInvalidation(validationInvalidationRef, execution);

  const resetForm = buildResetForm({
    setForm,
    resolvedDefaultActorName,
    initialRecordType,
    setManualDrawingState,
    setManualDrawingSource,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setGpxError,
    clearPhotos: media.clearPhotos,
    resetSubmission: execution.submission.resetSubmission,
  });
  return buildActionDeclarationFormResult({ lifecycle, media, geometry, execution, isCleanPlaceMode, resetForm });
}
