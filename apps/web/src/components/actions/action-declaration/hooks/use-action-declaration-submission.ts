import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import {
  createAction,
  fetchActionById,
  updateAction,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "@/lib/actions/types";
import { prepareCreateActionPayload } from "../payload";
import { trackActionDeclarationFormStart } from "./action-declaration-submission-tracking";
import {
  getActionDeclarationSubmissionIssues,
  normalizeActionDeclarationFormBeforeSubmit,
} from "../utils/action-declaration-submission.model";
import type {
  ActionDeclarationValidationStatus,
  FormState,
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "../model";
import type { LoadedActionPhase } from "../utils/action-declaration-hydration.model";
import {
  uploadActionMedia,
  type ActionMediaUploadFailure,
} from "@/lib/actions/action-media/action-media-client";

export type ActionMediaUploadState = {
  status: "idle" | "uploading" | "complete" | "partial";
  uploadedCount: number;
  failed: ActionMediaUploadFailure[];
};

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
  draftStorageReadError: boolean;
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
  photoPreparationPending?: boolean;
  visionEstimate: ActionVisionEstimate | null;
  userMetadata: ActionDeclarationUserMetadata;
  clearDraft: () => void;
  creationRequestId: string | null;
  setLoadedActionPhase: Dispatch<SetStateAction<LoadedActionPhase>>;
  setHasAttemptedSubmit: Dispatch<SetStateAction<boolean>>;
};

type SubmissionExecutionParams = Pick<
  UseActionDeclarationSubmissionParams,
  | "form"
  | "declarationMode"
  | "initialActionId"
  | "loadedActionPhase"
  | "manualDrawingEnabled"
  | "manualDrawing"
  | "manualDrawingSource"
  | "drawingIsValid"
  | "effectiveRoutePreviewDrawing"
  | "routePreviewSource"
  | "linkedEventId"
  | "photoAssets"
  | "visionEstimate"
  | "userMetadata"
  | "creationRequestId"
>;

type SubmissionValidationParams = Pick<
  UseActionDeclarationSubmissionParams,
  | "form"
  | "payload"
  | "isAuthenticated"
  | "declarationMode"
  | "hasValidDrawing"
  | "hasServerRouteInput"
  | "isCleanPlaceMode"
  | "manualDrawingSource"
>;

function getSubmissionIssues(params: SubmissionValidationParams): ValidationIssue[] {
  return getActionDeclarationSubmissionIssues({
    form: params.form,
    payload: params.payload,
    isAuthenticated: params.isAuthenticated,
    declarationMode: params.declarationMode,
    hasValidDrawing: params.hasValidDrawing,
    hasServerRouteInput: params.hasServerRouteInput,
    isCleanPlaceMode: params.isCleanPlaceMode,
    gpxImport: params.form.gpxImport,
    manualDrawingSource: params.manualDrawingSource,
  });
}

async function persistDeclarationSubmission(
  params: SubmissionExecutionParams & { payload: CreateActionPayload },
) {
  const normalizedForm = normalizeActionDeclarationFormBeforeSubmit(params.form);
  const submissionPayload = await prepareCreateActionPayload({
    form: normalizedForm,
    declarationMode: params.declarationMode,
    isEntrepriseMode: false,
    effectiveManualDrawingEnabled: params.manualDrawingEnabled,
    drawingIsValid: params.drawingIsValid,
    manualDrawing: params.manualDrawing,
    manualDrawingSource: params.manualDrawingSource,
    routePreviewDrawing: params.effectiveRoutePreviewDrawing,
    routePreviewSource: params.routePreviewSource,
    linkedEventId: params.linkedEventId,
    photos: params.photoAssets,
    visionEstimate: params.visionEstimate,
    userMetadata: params.userMetadata,
  });
  const effectiveSubmissionPayload = params.initialActionId && params.loadedActionPhase === "pre_action"
    ? { ...submissionPayload, actionPhase: "pre_action" as const }
    : submissionPayload;
  const result = params.initialActionId
    ? await updateAction(params.initialActionId, effectiveSubmissionPayload)
    : await createAction(effectiveSubmissionPayload, { idempotencyKey: params.creationRequestId ?? undefined });
  const persistedActionId = "id" in result ? result.id : result.actionId;
  const persistedAction = await fetchActionById(persistedActionId).catch(() => null);
  const mediaResult = params.photoAssets.length > 0
    ? await uploadActionMedia(persistedActionId, params.photoAssets)
    : null;
  return {
    persistedActionId,
    persistedAction,
    retentionLoop: "retentionLoop" in result ? result.retentionLoop ?? null : null,
    mediaResult,
  };
}

async function retryActionMediaUploadBatch(
  createdId: string,
  failed: ActionMediaUploadFailure[],
): Promise<Awaited<ReturnType<typeof uploadActionMedia>>> {
  return uploadActionMedia(createdId, failed);
}

function submissionErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Impossible de valider votre déclaration pour le moment. Veuillez vérifier vos informations et réessayer.";
}

type ConfirmSubmitParams = UseActionDeclarationSubmissionParams & {
  submissionState: SubmissionState;
  setSubmissionState: Dispatch<SetStateAction<SubmissionState>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setValidationIssues: Dispatch<SetStateAction<ValidationIssue[]>>;
  setShowConfirmation: Dispatch<SetStateAction<boolean>>;
  setCreatedId: Dispatch<SetStateAction<string | null>>;
  setRecordedAction: Dispatch<SetStateAction<ActionEditorRecord | null>>;
  setRetentionLoop: Dispatch<SetStateAction<PostActionRetentionLoop | null>>;
  setActionMediaUpload: Dispatch<SetStateAction<ActionMediaUploadState>>;
  setValidationStatus: Dispatch<SetStateAction<ActionDeclarationValidationStatus>>;
};

async function executeConfirmSubmit(params: ConfirmSubmitParams): Promise<void> {
  if (params.submissionState === "pending") return;
  if (!params.isAuthenticated) {
    params.setErrorMessage("Connectez-vous pour compléter et envoyer ce formulaire.");
    params.setSubmissionState("error");
    params.setShowConfirmation(false);
    return;
  }
  if (params.photoPreparationPending) {
    params.setValidationStatus("blocked");
    params.setErrorMessage("Attendez la fin de la préparation des photos avant d’envoyer la déclaration.");
    params.setSubmissionState("error");
    params.setShowConfirmation(false);
    return;
  }
  if (params.draftStorageReadError && !params.initialActionId) {
    params.setValidationStatus("blocked");
    params.setErrorMessage(
      "La lecture du brouillon local doit réussir avant de créer une nouvelle action. Réessayez sa lecture puis confirmez l’envoi.",
    );
    params.setSubmissionState("error");
    params.setShowConfirmation(false);
    return;
  }

  const validationIssuesForSubmission = getSubmissionIssues(params);
  if (validationIssuesForSubmission.length > 0) {
    params.setValidationStatus("field_errors");
    params.setValidationIssues(validationIssuesForSubmission);
    params.setHasAttemptedSubmit(true);
    params.setErrorMessage(validationIssuesForSubmission[0]?.message ?? null);
    params.setSubmissionState("error");
    params.setShowConfirmation(false);
    return;
  }

  params.setValidationIssues([]);
  params.setValidationStatus("validated");
  params.setSubmissionState("pending");
  try {
    const persisted = await persistDeclarationSubmission({
      form: params.form,
      declarationMode: params.declarationMode,
      initialActionId: params.initialActionId,
      loadedActionPhase: params.loadedActionPhase,
      manualDrawingEnabled: params.manualDrawingEnabled,
      manualDrawing: params.manualDrawing,
      manualDrawingSource: params.manualDrawingSource,
      drawingIsValid: params.drawingIsValid,
      effectiveRoutePreviewDrawing: params.effectiveRoutePreviewDrawing,
      routePreviewSource: params.routePreviewSource,
      linkedEventId: params.linkedEventId,
      photoAssets: params.photoAssets,
      visionEstimate: params.visionEstimate,
      userMetadata: params.userMetadata,
      creationRequestId: params.creationRequestId,
      payload: params.payload,
    });
    params.setCreatedId(persisted.persistedActionId);
    params.setRetentionLoop(persisted.retentionLoop);
    params.setRecordedAction(persisted.persistedAction);
    if (persisted.mediaResult) {
      params.setActionMediaUpload({ status: "uploading", uploadedCount: 0, failed: [] });
      params.setActionMediaUpload({
        status: persisted.mediaResult.failed.length > 0 ? "partial" : "complete",
        uploadedCount: persisted.mediaResult.uploadedCount,
        failed: persisted.mediaResult.failed,
      });
    }
    params.setSubmissionState("success");
    params.setValidationStatus("transmitted");
    params.setShowConfirmation(false);
    params.setLoadedActionPhase(
      params.initialActionId && params.loadedActionPhase === "pre_action"
        ? "pre_action"
        : "post_action_complete",
    );
    params.clearDraft();
  } catch (error: unknown) {
    params.setValidationStatus("transmission_error");
    params.setSubmissionState("error");
    params.setErrorMessage(submissionErrorMessage(error));
    params.setShowConfirmation(false);
  }
}

type SubmissionActionBuilderParams = UseActionDeclarationSubmissionParams & {
  submissionState: SubmissionState;
  setSubmissionState: Dispatch<SetStateAction<SubmissionState>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setValidationIssues: Dispatch<SetStateAction<ValidationIssue[]>>;
  setShowConfirmation: Dispatch<SetStateAction<boolean>>;
  setCreatedId: Dispatch<SetStateAction<string | null>>;
  setRecordedAction: Dispatch<SetStateAction<ActionEditorRecord | null>>;
  setRetentionLoop: Dispatch<SetStateAction<PostActionRetentionLoop | null>>;
  setActionMediaUpload: Dispatch<SetStateAction<ActionMediaUploadState>>;
  setValidationStatus: Dispatch<SetStateAction<ActionDeclarationValidationStatus>>;
};

function buildSubmissionActions(params: SubmissionActionBuilderParams) {
  const validateBeforeConfirmation = (): boolean => {
    params.setHasAttemptedSubmit(true);
    if (!params.isAuthenticated) return false;
    if (params.photoPreparationPending) {
      params.setValidationStatus("blocked");
      params.setValidationIssues([]);
      params.setErrorMessage("Attendez la fin de la préparation des photos avant d’envoyer la déclaration.");
      params.setSubmissionState("error");
      return false;
    }
    if (params.draftStorageReadError && !params.initialActionId) {
      params.setValidationStatus("blocked");
      params.setValidationIssues([]);
      params.setErrorMessage(
        "La lecture du brouillon local doit réussir avant de créer une nouvelle action. Réessayez sa lecture puis confirmez l’envoi.",
      );
      params.setSubmissionState("error");
      return false;
    }
    const issues = getSubmissionIssues(params);
    params.setValidationIssues(issues);
    params.setValidationStatus(issues.length > 0 ? "field_errors" : "validated");
    params.setErrorMessage(null);
    params.setSubmissionState("idle");
    return issues.length === 0;
  };

  const handleConfirmSubmit = async (): Promise<void> => {
    await executeConfirmSubmit(params);
  };

  return { validateBeforeConfirmation, handleConfirmSubmit };
}

export function useActionDeclarationSubmission(
  params: UseActionDeclarationSubmissionParams,
) {
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
  const [validationStatus, setValidationStatus] =
    useState<ActionDeclarationValidationStatus>("not_attempted");
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [actionMediaUpload, setActionMediaUpload] = useState<ActionMediaUploadState>({
    status: "idle",
    uploadedCount: 0,
    failed: [],
  });
  const submissionInFlightRef = useRef(false);

  function invalidateValidation() {
    if (submissionInFlightRef.current || submissionState === "pending") return;
    if (validationStatus !== "validated") return;

    setValidationStatus("not_attempted");
    setValidationIssues([]);
    setErrorMessage(null);
    params.setHasAttemptedSubmit(false);
    setShowConfirmation(false);
  }

  function resetSubmission() {
    if (submissionInFlightRef.current || submissionState === "pending") return;

    hasTrackedStartRef.current = false;
    setSubmissionState("idle");
    setErrorMessage(null);
    setCreatedId(null);
    setRecordedAction(null);
    setRetentionLoop(null);
    setValidationIssues([]);
    setValidationStatus("not_attempted");
    setShowConfirmation(false);
    setActionMediaUpload({ status: "idle", uploadedCount: 0, failed: [] });
    params.setHasAttemptedSubmit(false);
  }

  async function retryActionMediaUploads() {
    if (!createdId || actionMediaUpload.failed.length === 0) return;
    setActionMediaUpload((current) => ({ ...current, status: "uploading" }));
    const result = await retryActionMediaUploadBatch(
      createdId,
      actionMediaUpload.failed,
    );
    setActionMediaUpload({
      status: result.failed.length > 0 ? "partial" : "complete",
      uploadedCount: actionMediaUpload.uploadedCount + result.uploadedCount,
      failed: result.failed,
    });
  }

  const trackFormStart = () =>
    trackActionDeclarationFormStart({
      hasTrackedStartRef,
      declarationMode: params.declarationMode,
      form: params.form,
      linkedEventId: params.linkedEventId,
    });

  const submissionActions = buildSubmissionActions({
    ...params,
    submissionState,
    setSubmissionState,
    setErrorMessage,
    setValidationIssues,
    setShowConfirmation,
    setCreatedId,
    setRecordedAction,
    setRetentionLoop,
    setActionMediaUpload,
    setValidationStatus,
  });
  const { validateBeforeConfirmation } = submissionActions;
  const handleConfirmSubmit = async (): Promise<void> => {
    if (submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    try {
      await submissionActions.handleConfirmSubmit();
    } finally {
      submissionInFlightRef.current = false;
    }
  };

  return {
    submissionState,
    errorMessage,
    createdId,
    recordedAction,
    retentionLoop,
    validationIssues,
    validationStatus,
    showConfirmation,
    setShowConfirmation,
    actionMediaUpload,
    retryActionMediaUploads,
    trackFormStart,
    invalidateValidation,
    resetSubmission,
    validateBeforeConfirmation,
    handleConfirmSubmit,
  };
}
