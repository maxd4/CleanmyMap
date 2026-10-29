import { useState } from "react";
import type { ActionDeclarationUserMetadata } from "./use-action-declaration-submission";
import { useActionDeclarationFormLifecycle } from "./use-action-declaration-form-lifecycle";
import { useActionDeclarationFormMedia } from "./use-action-declaration-form-media";
import { useActionDeclarationFormExecution } from "./use-action-declaration-form-execution";
import { resolveActionDeclarationGeometryState } from "./action-declaration-form-geometry";
import { buildActionDeclarationFormResult } from "./use-action-declaration-form-result";

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
  const media = useActionDeclarationFormMedia();
  const { photoAssets, visionEstimate, photoPreparationPending } = media;

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
    photoPreparationPending,
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
