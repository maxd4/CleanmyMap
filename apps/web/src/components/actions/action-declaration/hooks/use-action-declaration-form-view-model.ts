import { type FormEvent, useState } from "react";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { createInitialFormState } from "../payload";
import {
  ActionDeclarationFormOverlays,
  ActionDeclarationFormSurface,
} from "../action-declaration-form-content";
import { useActionDeclarationFormPresentation } from "./use-action-declaration-form-presentation";
import { formatDraftDate } from "../ui/action-declaration-form.summary";
import type { ActionDeclarationFormProps } from "../action-declaration-form.types";
import type { useActionDeclarationForm } from "./use-action-declaration-form";

type ActionDeclarationFormState = ReturnType<typeof useActionDeclarationForm>;

function buildActionDeclarationSectionProps(
  props: ActionDeclarationFormProps,
  state: ActionDeclarationFormState,
  presentation: ReturnType<typeof useActionDeclarationFormPresentation>,
) {
  const {
    form,
    manualDrawing,
    manualDrawingSource,
    photoAssets,
    visionEstimate,
    visionStatus,
    photoError,
    submissionState,
    validationStatus,
    errorMessage,
    validationIssues,
    hasAttemptedSubmit,
    smartAssist,
    updateField,
    updateFields,
  } = state;
  const identity = { form, updateField, updateFields, userMetadata: props.userMetadata, recordType: form.recordType, hasAttemptedSubmit };
  const harvest = {
    form,
    updateField,
    updateFields,
    recordType: form.recordType,
    photoAssets,
    visionEstimate,
    visionStatus,
    estimatedWasteKgInterval: smartAssist.estimatedWasteKgInterval,
    onPhotoUpload: state.handlePhotoUpload,
    onPhotoReplace: state.handlePhotoReplace,
    onRemovePhoto: state.removePhoto,
    onClearPhotos: state.clearPhotos,
    photoError,
  };
  const location = {
    form,
    updateField,
    updateFields,
    manualDrawing,
    manualDrawingSource: manualDrawingSource ?? null,
    setManualDrawing: state.setManualDrawing,
    routePreviewDrawing: state.effectiveRoutePreviewDrawing,
    routePreviewSource: state.effectiveRoutePreviewSource,
    gpxImport: state.gpxImport ?? null,
    gpxError: state.gpxError,
    onImportGpx: state.handleGpxImport,
    onRemoveGpx: state.removeGpxImport,
    onResetManualDrawing: () => state.setManualDrawing(null),
    gpsStatus: smartAssist.gpsStatus,
    gpsMessage: smartAssist.gpsMessage,
    onAutofillGps: smartAssist.autofillGps,
    recordType: form.recordType,
  };
  return {
    form,
    identity,
    harvest,
    location,
    showPreparationSummary: presentation.showPreparationSummary,
    hasAttemptedSubmit,
    validationIssues,
    submissionState,
    validationStatus,
    errorMessage,
  };
}

export function useActionDeclarationFormViewModel(
  props: ActionDeclarationFormProps,
  state: ActionDeclarationFormState,
) {
  const [isExportPickerOpen, setIsExportPickerOpen] = useState(false);
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const { form, validationIssues, hasAttemptedSubmit, loadedActionPhase, submissionState } = state;
  const presentation = useActionDeclarationFormPresentation({
    validationIssues,
    hasAttemptedSubmit,
    initialActionId: props.initialActionId,
    loadedActionPhase,
  });
  const draftRecoveryBlocked = !props.initialActionId && state.draftStorageReadError;
  const isCompletionBlocked = !props.isAuthenticated || draftRecoveryBlocked;
  const sections = buildActionDeclarationSectionProps(props, state, presentation);

  function onSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!props.isAuthenticated) {
      setShowRestrictionDialog(true);
      return;
    }
    if (draftRecoveryBlocked) {
      state.validateBeforeConfirmation();
      return;
    }
    if (state.validateBeforeConfirmation()) state.setShowConfirmation(true);
  }

  const canShowGroupInvite =
    form.recordType === "action" && form.groupJoinEnabled && loadedActionPhase !== "post_action_complete";

  return {
    isHydratingAction: state.isHydratingAction,
    hydrationError: state.hydrationError,
    overlays: {
      form,
      payload: state.payload,
      userMetadata: props.userMetadata,
      showConfirmation: state.showConfirmation,
      onModify: () => state.setShowConfirmation(false),
      onConfirm: () => {
        if (!props.isAuthenticated) {
          state.setShowConfirmation(false);
          setShowRestrictionDialog(true);
          return;
        }
        void /* fire-and-forget -- the confirmation overlay owns submission state and errors. */ state.handleConfirmSubmit();
      },
      isSubmitting: submissionState === "pending",
      isExportPickerOpen,
      onCloseExport: () => setIsExportPickerOpen(false),
      actorName: state.resolvedDefaultActorName,
      showRestrictionDialog,
      onCloseRestriction: () => setShowRestrictionDialog(false),
      signInHref: props.signInHref,
      signUpHref: props.signUpHref,
    } satisfies React.ComponentProps<typeof ActionDeclarationFormOverlays>,
    surface: {
      actClasses: getBlockClasses("act"),
      showDraftBanner: state.showDraftBanner,
      draftStorageReadError: state.draftStorageReadError,
      isCompletionBlocked,
      formattedPendingDraftSavedAt: formatDraftDate(state.pendingDraftSavedAt),
      onResumeDraft: state.handleResumeDraft,
      onIgnoreDraft: state.handleIgnoreDraft,
      onRetryDraftLoad: state.retryDraftLoad,
      onSubmit,
      sections: {
        ...sections,
        submissionState,
        onOpenExport: () => setIsExportPickerOpen(true),
      },
      feedback: {
        submissionState,
        createdId: state.createdId,
        errorMessage: state.errorMessage,
        hasAttemptedSubmit,
        validationIssues,
        retentionLoop: state.retentionLoop,
        recordedAction: state.recordedAction,
        showGroupInvite: canShowGroupInvite,
        groupJoinHref: state.createdId && canShowGroupInvite
          ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(state.createdId)}`
          : null,
        actionMediaUpload: state.actionMediaUpload,
        onRetryActionMedia: () => { void /* fire-and-forget -- the feedback control owns upload retry state and errors. */ state.retryActionMediaUploads(); },
      },
      onReset: () => {
        state.setForm(createInitialFormState(state.resolvedDefaultActorName, props.initialRecordType ?? "action"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    } satisfies React.ComponentProps<typeof ActionDeclarationFormSurface>,
  };
}
