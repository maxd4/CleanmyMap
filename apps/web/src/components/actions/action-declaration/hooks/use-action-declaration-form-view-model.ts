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
    submissionState,
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
    recordType: form.recordType,
    photoAssets,
    visionEstimate,
    visionStatus,
    heuristicEstimatedWasteKg: smartAssist.heuristicEstimatedWasteKg,
    estimatedWasteKg: smartAssist.estimatedWasteKg,
    estimatedWasteKgInterval: smartAssist.estimatedWasteKgInterval,
    estimatedWasteKgConfidence: smartAssist.estimatedWasteKgConfidence,
    wasteSuggestionSource: smartAssist.wasteSuggestionSource,
    onPhotoUpload: state.handlePhotoUpload,
    onClearPhotos: state.clearPhotos,
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
    details: { summaries: presentation.summaries, disclosures: presentation.disclosures },
    showPreparationSummary: presentation.showPreparationSummary,
    hasAttemptedSubmit,
    validationIssues,
    submissionState,
  };
}

export function useActionDeclarationFormViewModel(
  props: ActionDeclarationFormProps,
  state: ActionDeclarationFormState,
) {
  const [isExportPickerOpen, setIsExportPickerOpen] = useState(false);
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const { form, photoAssets, visionEstimate, manualDrawing, validationIssues, hasAttemptedSubmit, loadedActionPhase, submissionState } = state;
  const presentation = useActionDeclarationFormPresentation({
    form,
    photoAssets,
    visionEstimate,
    manualDrawing,
    validationIssues,
    hasAttemptedSubmit,
    initialActionId: props.initialActionId,
    loadedActionPhase,
  });
  const isCompletionBlocked = !props.isAuthenticated;
  const sections = buildActionDeclarationSectionProps(props, state, presentation);

  function onSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isCompletionBlocked) {
      setShowRestrictionDialog(true);
      return;
    }
    state.setShowConfirmation(true);
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
      onConfirm: state.handleConfirmSubmit,
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
      isCompletionBlocked,
      formattedPendingDraftSavedAt: formatDraftDate(state.pendingDraftSavedAt),
      onResumeDraft: state.handleResumeDraft,
      onIgnoreDraft: state.handleIgnoreDraft,
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
      },
      onReset: () => {
        state.setForm(createInitialFormState(state.resolvedDefaultActorName, props.initialRecordType ?? "action"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    } satisfies React.ComponentProps<typeof ActionDeclarationFormSurface>,
  };
}
