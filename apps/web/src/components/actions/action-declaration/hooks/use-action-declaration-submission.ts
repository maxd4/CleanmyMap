import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import {
  createAction,
  fetchActionById,
  updateAction,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "@/lib/actions/types";
import { prepareCreateActionPayload } from "../payload";
import {
  getActionDeclarationSubmissionIssues,
  normalizeActionDeclarationFormBeforeSubmit,
} from "../utils/action-declaration-submission.model";
import type {
  FormState,
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "../model";
import type { LoadedActionPhase } from "../utils/action-declaration-hydration.model";

export type ActionDeclarationUserMetadata = {
  userId: string;
  handle?: string;
  username?: string;
  displayName?: string;
  email?: string;
};

type UseActionDeclarationSubmissionParams = {
  form: FormState;
  declarationMode: "complete";
  isAuthenticated: boolean;
  initialActionId?: string | null;
  loadedActionPhase: LoadedActionPhase;
  manualDrawingEnabled: boolean;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: ActionGeometrySource | null;
  drawingIsValid: boolean;
  effectiveRoutePreviewDrawing: ActionDrawing | null;
  routePreviewSource?: ActionGeometrySource | null;
  hasValidDrawing: boolean;
  hasServerRouteInput: boolean;
  isCleanPlaceMode: boolean;
  payload: CreateActionPayload;
  linkedEventId?: string;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  userMetadata: ActionDeclarationUserMetadata;
  clearDraft: () => void;
  setLoadedActionPhase: Dispatch<SetStateAction<LoadedActionPhase>>;
  setHasAttemptedSubmit: Dispatch<SetStateAction<boolean>>;
};

export function useActionDeclarationSubmission({
  form,
  declarationMode,
  isAuthenticated,
  initialActionId,
  loadedActionPhase,
  manualDrawingEnabled,
  manualDrawing,
  manualDrawingSource,
  drawingIsValid,
  effectiveRoutePreviewDrawing,
  routePreviewSource,
  hasValidDrawing,
  hasServerRouteInput,
  isCleanPlaceMode,
  payload,
  linkedEventId,
  photoAssets,
  visionEstimate,
  userMetadata,
  clearDraft,
  setLoadedActionPhase,
  setHasAttemptedSubmit,
}: UseActionDeclarationSubmissionParams) {
  const hasTrackedStartRef = useRef<boolean>(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [recordedAction, setRecordedAction] =
    useState<ActionEditorRecord | null>(null);
  const [retentionLoop, setRetentionLoop] =
    useState<PostActionRetentionLoop | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  function trackFormStart() {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackFunnel("start_form", declarationMode, {
        source: "action_declaration_form",
        declarationMode,
        recordType: form.recordType,
        routePath: typeof window !== "undefined" ? window.location.pathname : null,
        formVariant: "legacy",
        linkedEventId: linkedEventId ?? null,
      });
    }
  }

  async function handleConfirmSubmit() {
    if (submissionState === "pending") return;
    const validationIssuesForSubmission = getActionDeclarationSubmissionIssues({
      form,
      payload,
      isAuthenticated,
      declarationMode,
      hasValidDrawing,
      hasServerRouteInput,
      isCleanPlaceMode,
      gpxImport: form.gpxImport,
      manualDrawingSource,
    });
    if (validationIssuesForSubmission.length > 0) {
      setValidationIssues(validationIssuesForSubmission);
      setHasAttemptedSubmit(true);
      setErrorMessage(validationIssuesForSubmission[0]?.message ?? null);
      setSubmissionState("error");
      setShowConfirmation(false);
      return;
    }

    setValidationIssues([]);
    setSubmissionState("pending");
    const normalizedForm = normalizeActionDeclarationFormBeforeSubmit(form);
    try {
      const submissionPayload = await prepareCreateActionPayload({
        form: normalizedForm,
        declarationMode,
        isEntrepriseMode: false,
        effectiveManualDrawingEnabled: manualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        manualDrawingSource,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        routePreviewSource,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      });
      const effectiveSubmissionPayload =
        initialActionId && loadedActionPhase === "pre_action"
          ? { ...submissionPayload, actionPhase: "pre_action" as const }
          : submissionPayload;
      const result = initialActionId
        ? await updateAction(initialActionId, effectiveSubmissionPayload)
        : await createAction(effectiveSubmissionPayload);
      const persistedActionId = "id" in result ? result.id : result.actionId;
      setCreatedId(persistedActionId);
      setRetentionLoop(
        "retentionLoop" in result ? result.retentionLoop ?? null : null,
      );
      const persistedAction = await fetchActionById(persistedActionId).catch(
        () => null,
      );
      setRecordedAction(persistedAction);
      setSubmissionState("success");
      setShowConfirmation(false);
      setLoadedActionPhase(
        initialActionId && loadedActionPhase === "pre_action"
          ? "pre_action"
          : "post_action_complete",
      );
      clearDraft();
    } catch (error: unknown) {
      setSubmissionState("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de valider votre déclaration pour le moment. Veuillez vérifier vos informations et réessayer.",
      );
      setShowConfirmation(false);
    }
  }

  return {
    submissionState,
    errorMessage,
    createdId,
    recordedAction,
    retentionLoop,
    validationIssues,
    showConfirmation,
    setShowConfirmation,
    trackFormStart,
    handleConfirmSubmit,
  };
}
