import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { createAction, fetchActionById, updateAction } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import type {
  ActionDrawing,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import {
  buildCreateActionPayload,
  applyPreparationDataToForm,
  createInitialFormState,
  isDrawingValid,
  OTHER_VOLUNTEER_ASSOCIATION_VALUE,
  prepareCreateActionPayload,
} from "../action-declaration/payload";
import {
  clearDraft,
  loadDraftSnapshot,
  saveDraft,
  subscribeToDraftChanges,
} from "../action-declaration/draft-storage";
import { summarizeActionDrawingValidation } from "../map/actions-map-geometry.utils";
import { computeActionDataQuality } from "../action-declaration-form.quality";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";
import { useActionDeclarationSmartAssist } from "../action-declaration-form.smart-assist";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import type {
  FormState,
  PostActionRetentionLoop,
  ValidationIssue,
} from "../action-declaration-form.model";

type UseActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  initialActionId?: string | null;
  linkedEventId?: string;
  initialRecordType?: "action" | "clean_place";
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
  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(
    defaultActorName,
  )
    ? defaultActorName
    : (resolvedActorOptions[0] ?? userMetadata.userId);
  const createCleanForm = useMemo(
    () => () => createInitialFormState(resolvedDefaultActorName, initialRecordType),
    [initialRecordType, resolvedDefaultActorName],
  );

  const [form, setForm] = useState<FormState>(() => createCleanForm());
  const pendingDraft = useSyncExternalStore(
    subscribeToDraftChanges,
    () => {
      if (initialActionId) {
        return null;
      }
      return loadDraftSnapshot(createCleanForm(), initialRecordType);
    },
    () => null,
  );
  const [manualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(null);
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [routePreviewDrawing, setRoutePreviewDrawing] = useState<ActionDrawing | null>(null);
  const [declarationMode] = useState<"complete">("complete");
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [retentionLoop, setRetentionLoop] = useState<PostActionRetentionLoop | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [loadedActionPhase, setLoadedActionPhase] = useState<
    "pre_action" | "post_action_draft" | "post_action_complete" | null
  >(null);
  const [isHydratingAction, setIsHydratingAction] = useState<boolean>(Boolean(initialActionId));
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const hasTrackedStartRef = useRef<boolean>(false);

  const isCleanPlaceMode = form.recordType === "clean_place";

  function handleResumeDraft() {
    if (!pendingDraft) return;
    setForm(pendingDraft.form);
    clearDraft();
    setHasAttemptedSubmit(false);
  }

  function handleIgnoreDraft() {
    clearDraft();
    setForm(createCleanForm());
    setHasAttemptedSubmit(false);
  }

  useEffect(() => {
    if (!initialActionId) {
      return;
    }

    let active = true;

    fetchActionById(initialActionId)
      .then((action) => {
        if (!active) {
          return;
        }

        const baseForm = createCleanForm();
        const preparedForm = applyPreparationDataToForm(baseForm, action.preparationData);
        const nextForm: FormState = {
          ...preparedForm,
          actorName: action.actorName ?? preparedForm.actorName,
          associationName: action.associationName ?? preparedForm.associationName,
          groupJoinEnabled: action.groupJoinEnabled,
          actionDate: action.actionDate,
          locationLabel: action.locationLabel,
          departureLocationLabel:
            action.departureLocationLabel ?? preparedForm.departureLocationLabel,
          arrivalLocationLabel:
            action.arrivalLocationLabel ?? preparedForm.arrivalLocationLabel,
          routeStyle: action.routeStyle ?? preparedForm.routeStyle,
          routeAdjustmentMessage:
            action.routeAdjustmentMessage ?? preparedForm.routeAdjustmentMessage,
          notes: action.notes ?? preparedForm.notes,
          placeType: action.placeType ?? preparedForm.placeType,
        };

        if (
          action.actionPhase === "pre_action" ||
          action.actionPhase === "post_action_draft"
        ) {
          nextForm.wasteKg = "";
          nextForm.cigaretteButts = "";
          nextForm.cigaretteButtsCount = "";
          nextForm.volunteersCount = "";
          nextForm.durationMinutes = "";
          nextForm.wasteMegotsKg = "";
          nextForm.wastePlastiqueKg = "";
          nextForm.wasteVerreKg = "";
          nextForm.wasteMetalKg = "";
          nextForm.wasteMixteKg = "";
          nextForm.visionBagsCount = "";
          nextForm.visionFillLevel = "";
          nextForm.visionDensity = "";
        }

        setLoadedActionPhase(action.actionPhase);
        setForm(nextForm);
        setIsHydratingAction(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setHydrationError(
          error instanceof Error && error.message
            ? error.message
            : "Impossible de charger le formulaire existant.",
        );
        setIsHydratingAction(false);
      });

    return () => {
      active = false;
    };
  }, [createCleanForm, initialActionId]);

  const drawingIsValid = isDrawingValid(manualDrawing);
  const isEntrepriseMode = form.associationName === ENTREPRISE_ASSOCIATION_OPTION;
  const routePreviewInput = form.departureLocationLabel.trim() || form.locationLabel.trim();
  const manualDrawingValidation = summarizeActionDrawingValidation(manualDrawing);
  const routePreviewValidation = summarizeActionDrawingValidation(
    routePreviewInput ? routePreviewDrawing : null,
  );
  const effectiveRoutePreviewDrawing = routePreviewInput
    ? routePreviewValidation.normalized
    : null;
  const effectiveDrawing = manualDrawingValidation.normalized ?? effectiveRoutePreviewDrawing;
  const hasValidDrawing = Boolean(effectiveDrawing);

  const payload = useMemo(
    () =>
      buildCreateActionPayload({
        form,
        declarationMode,
        effectiveManualDrawingEnabled: manualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        isEntrepriseMode,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      }),
    [declarationMode, drawingIsValid, manualDrawingEnabled, form, isEntrepriseMode, linkedEventId, manualDrawing, photoAssets, visionEstimate, userMetadata]
  );

  const dataQuality = useMemo(
    () =>
      computeActionDataQuality({
        form,
        declarationMode,
        recordType: form.recordType,
        hasLocationProof: form.latitude.trim().length > 0 && form.longitude.trim().length > 0,
        hasDrawingProof: hasValidDrawing,
        photoAssets,
        visionEstimate,
      }),
    [declarationMode, hasValidDrawing, form, photoAssets, visionEstimate]
  );

  const smartAssist = useActionDeclarationSmartAssist({
    form,
    setForm,
    visionEstimate,
  });

  useEffect(() => {
    let active = true;
    const departure = form.departureLocationLabel.trim() || form.locationLabel.trim();
    const arrival = form.arrivalLocationLabel.trim();

    if (!departure) {
      return () => { active = false; };
    }

    const timer = setTimeout(() => {
      deriveAutoDrawingFromLocation({
        locationLabel: form.locationLabel,
        departureLocationLabel: departure,
        arrivalLocationLabel: arrival || undefined,
        routeStyle: form.routeStyle,
      }).then(drawing => {
        if (!active) return;
        setRoutePreviewDrawing(drawing);
      }).catch(() => {
        if (!active) return;
      });
    }, 400);

    return () => { active = false; clearTimeout(timer); };
  }, [form.arrivalLocationLabel, form.departureLocationLabel, form.locationLabel, form.routeStyle]);

  async function handlePhotoUpload(files: FileList | null) {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0) { clearPhotos(); return; }
    setVisionStatus("processing");
    try {
      const assets = await normalizeActionPhotos(selected);
      setPhotoAssets(assets);
    } catch {
      setVisionStatus("error");
    }
  }

  function clearPhotos() {
    setPhotoAssets([]);
    setVisionEstimate(null);
    setVisionStatus("idle");
  }

  useEffect(() => {
    let active = true;
    if (photoAssets.length === 0) return;
    inferActionVisionEstimate(photoAssets, {
      locationLabel: form.locationLabel,
      placeType: form.placeType,
      volunteersCount: Number(form.volunteersCount),
      durationMinutes: Number(form.durationMinutes),
    }).then(result => {
      if (!active) return;
      setVisionEstimate(result);
      setVisionStatus("ready");
    }).catch(() => {
      if (!active) return;
      setVisionStatus("error");
    });
    return () => { active = false; };
  }, [photoAssets, form.locationLabel, form.placeType, form.volunteersCount, form.durationMinutes]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
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
    const nextForm = { ...form, [key]: value };
    if (key === "routeStyle") {
      nextForm.routeStyle = "souple";
    }
    if (key === "associationName" && value === "Action spontanée") {
      nextForm.organizerAccounts = "";
    }
    if (!pendingDraft && submissionState !== "success") {
      saveDraft(nextForm);
    }
    if (key === "recordType") {
      setHasAttemptedSubmit(false);
    }
    setForm(nextForm);
  }

  function normalizeFormBeforeSubmit(f: FormState): FormState {
    const normalized = { ...f };
    normalized.routeStyle = "souple";
    if (normalized.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE) {
      normalized.associationName = "Action spontanée";
    }
    if (normalized.associationName === "Action spontanée") {
      normalized.organizerAccounts = "";
    }
    if (!normalized.locationLabel.trim() && normalized.departureLocationLabel.trim()) {
      normalized.locationLabel = normalized.departureLocationLabel.trim();
    }
    return normalized;
  }

  async function handleConfirmSubmit() {
    if (submissionState === "pending") return;
    if (!isAuthenticated) {
      setValidationIssues([
        {
          field: "associationName",
          message:
            "Connectez-vous sur ordinateur pour compléter et envoyer ce formulaire.",
        },
      ]);
      setHasAttemptedSubmit(true);
      setErrorMessage(
        "Connectez-vous sur ordinateur pour compléter et envoyer ce formulaire.",
      );
      setSubmissionState("error");
      setShowConfirmation(false);
      return;
    }

    const stepOneIssues = getStepOneValidationIssues(form);
    if (stepOneIssues.length > 0) {
      setValidationIssues(stepOneIssues);
      setHasAttemptedSubmit(true);
      setErrorMessage(stepOneIssues[0]?.message ?? null);
      setSubmissionState("error");
      setShowConfirmation(false);
      return;
    }

    const volunteerIssues = getVolunteerActionValidationIssues(payload);
    if (volunteerIssues.length > 0) {
      setValidationIssues(volunteerIssues);
      setHasAttemptedSubmit(true);
      setErrorMessage(volunteerIssues[0]?.message ?? null);
      setSubmissionState("error");
      setShowConfirmation(false);
      return;
    }

    if (declarationMode === "complete" && !hasValidDrawing && !isCleanPlaceMode) {
      setValidationIssues([
        {
          field: "manualDrawing",
          message:
            "Ajoute un tracé manuel valide ou un aperçu géographique avant l'envoi.",
        },
      ]);
      setHasAttemptedSubmit(true);
      setErrorMessage(
        "Ajoute un tracé manuel valide ou un aperçu géographique avant l'envoi.",
      );
      setSubmissionState("error");
      setShowConfirmation(false);
      return;
    }

    setValidationIssues([]);
    setSubmissionState("pending");
    const normalizedForm = normalizeFormBeforeSubmit(form);
    try {
      const submissionPayload = await prepareCreateActionPayload({
        form: normalizedForm,
        declarationMode,
        effectiveManualDrawingEnabled: manualDrawingEnabled,
        drawingIsValid: manualDrawingValidation.isValid,
        manualDrawing,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        isEntrepriseMode,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      });
      const result = initialActionId
        ? await updateAction(initialActionId, submissionPayload)
        : await createAction(submissionPayload);
      setCreatedId("id" in result ? result.id : result.actionId);
      setRetentionLoop("retentionLoop" in result ? result.retentionLoop ?? null : null);
      setSubmissionState("success");
      setShowConfirmation(false);
      setLoadedActionPhase("post_action_complete");
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
    // State
    form,
    setForm,
    resolvedDefaultActorName,
    manualDrawing,
    setManualDrawing,
    photoAssets,
    visionEstimate,
    visionStatus,
    submissionState,
    errorMessage,
    createdId,
    retentionLoop,
    loadedActionPhase,
    isHydratingAction,
    hydrationError,
    validationIssues,
    hasAttemptedSubmit,
    showConfirmation,
    setShowConfirmation,
    pendingDraftSavedAt: pendingDraft?.savedAt ?? null,
    showDraftBanner: Boolean(pendingDraft),
    isCleanPlaceMode,

    // Computed & payload
    payload,
    dataQuality,
    effectiveRoutePreviewDrawing,

    // Smart Assist state
    smartAssist,

    handlePhotoUpload,
    clearPhotos,
    updateField,
    handleResumeDraft,
    handleIgnoreDraft,
    handleConfirmSubmit,
  };
}

function getStepOneValidationIssues(form: FormState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!form.associationName.trim()) {
    issues.push({
      field: "associationName",
      message: "Sélectionnez une structure ou “Autre bénévole” avant l’envoi.",
    });
  }

  if (
    form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE &&
    !form.actorName.trim()
  ) {
    issues.push({
      field: "associationName",
      message:
        "Renseignez le nom ou pseudo du bénévole avant l’envoi.",
    });
  }

  if (!form.actionDate.trim()) {
    issues.push({
      field: "actionDate",
      message: "Indiquez la date de l’action avant l’envoi.",
    });
  }

  return issues;
}
