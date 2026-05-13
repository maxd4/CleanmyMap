import { useState, useEffect, useRef, useMemo } from "react";
import { createAction } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import type {
  ActionDrawing,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import {
  buildCreateActionPayload,
  createInitialFormState,
  isDrawingValid,
  OTHER_VOLUNTEER_ASSOCIATION_VALUE,
  prepareCreateActionPayload,
} from "../action-declaration/payload";
import {
  clearDraft,
  loadDraftSnapshot,
  saveDraft,
  type ActionDeclarationDraftSnapshot,
} from "../action-declaration/draft-storage";
import { summarizeActionDrawingValidation } from "../map/actions-map-geometry.utils";
import { computeActionDataQuality } from "../action-declaration-form.quality";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";
import { useActionDeclarationSmartAssist } from "../action-declaration-form.smart-assist";
import type {
  FormState,
  PostActionRetentionLoop,
  ValidationIssue,
} from "../action-declaration-form.model";

type UseActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  linkedEventId?: string;
  initialMode?: "quick" | "complete";
  initialRecordType?: "action" | "clean_place";
};

export function useActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  userMetadata,
  linkedEventId,
  initialMode = "quick",
  initialRecordType = "action",
}: UseActionDeclarationFormProps) {
  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(
    defaultActorName,
  )
    ? defaultActorName
    : (resolvedActorOptions[0] ?? userMetadata.userId);
  const createCleanForm = () =>
    createInitialFormState(resolvedDefaultActorName, initialRecordType);
  const coerceRecordType = (draft: FormState): FormState =>
    initialRecordType === "clean_place"
      ? { ...draft, recordType: "clean_place" }
      : draft;

  const [form, setForm] = useState<FormState>(() => createCleanForm());
  const [pendingDraft, setPendingDraft] = useState<ActionDeclarationDraftSnapshot | null>(() => {
    const snapshot = loadDraftSnapshot(createCleanForm());
    return snapshot
      ? { ...snapshot, form: coerceRecordType(snapshot.form) }
      : null;
  });
  const [manualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(null);
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [routePreviewDrawing, setRoutePreviewDrawing] = useState<ActionDrawing | null>(null);
  const [declarationMode] = useState<"quick" | "complete">(initialMode);
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [retentionLoop, setRetentionLoop] = useState<PostActionRetentionLoop | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const hasTrackedStartRef = useRef<boolean>(false);

  const isCleanPlaceMode = form.recordType === "clean_place";
  const totalSteps = isCleanPlaceMode ? 2 : 4;
  const [currentStep, setCurrentStep] = useState<number>(1);

  const nextStep = () => {
    setHasAttemptedSubmit(true);
    if (currentStep === 1) {
      const stepOneIssues = getStepOneValidationIssues(form);
      setValidationIssues(stepOneIssues);
      if (stepOneIssues.length > 0) return;
    }
    if (currentStep === 2) {
      const hasWaste = parseFloat(form.wasteKg) > 0 || parseFloat(form.wasteMegotsKg) > 0;
      if (!hasWaste && declarationMode === "complete" && !isCleanPlaceMode) return;
    }
    const next = Math.min(currentStep + 1, totalSteps);
    setVisitedSteps((prev) => new Set([...prev, next]));
    setCurrentStep(next);
    setHasAttemptedSubmit(false);
    setValidationIssues([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function handleResumeDraft() {
    if (!pendingDraft) return;
    setForm(coerceRecordType(pendingDraft.form));
    setDraftSavedAt(pendingDraft.savedAt);
    setPendingDraft(null);
    setCurrentStep(1);
    setVisitedSteps(new Set([1]));
    setHasAttemptedSubmit(false);
  }

  function handleIgnoreDraft() {
    clearDraft();
    setPendingDraft(null);
    setDraftSavedAt(null);
    setForm(createCleanForm());
    setCurrentStep(1);
    setVisitedSteps(new Set([1]));
    setHasAttemptedSubmit(false);
  }

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
        effectiveManualDrawingEnabled: declarationMode === "complete" && manualDrawingEnabled,
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
      trackFunnel("start_form", declarationMode);
    }
    const nextForm = { ...form, [key]: value };
    if (!pendingDraft && submissionState !== "success") {
      setDraftSavedAt(saveDraft(nextForm));
    }
    if (key === "recordType") {
      const nextTotalSteps = value === "clean_place" ? 2 : 4;
      setCurrentStep((prev) => Math.min(prev, nextTotalSteps));
      setHasAttemptedSubmit(false);
    }
    setForm(nextForm);
  }

  function normalizeFormBeforeSubmit(f: FormState): FormState {
    const normalized = { ...f };
    if (normalized.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE) {
      normalized.associationName = "Action spontanée";
    }
    if (!normalized.locationLabel.trim() && normalized.departureLocationLabel.trim()) {
      normalized.locationLabel = normalized.departureLocationLabel.trim();
    }
    return normalized;
  }

  async function handleConfirmSubmit() {
    if (submissionState === "pending") return;
    const stepOneIssues = getStepOneValidationIssues(form);
    if (stepOneIssues.length > 0) {
      setValidationIssues(stepOneIssues);
      setHasAttemptedSubmit(true);
      setErrorMessage(stepOneIssues[0]?.message ?? null);
      setSubmissionState("error");
      setShowConfirmation(false);
      setCurrentStep(1);
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
        effectiveManualDrawingEnabled: declarationMode === "complete" && manualDrawingEnabled,
        drawingIsValid: manualDrawingValidation.isValid,
        manualDrawing,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        isEntrepriseMode,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      });
      const result = await createAction(submissionPayload);
      setCreatedId(result.id);
      setRetentionLoop(result.retentionLoop ?? null);
      setSubmissionState("success");
      setShowConfirmation(false);
      clearDraft();
      setDraftSavedAt(null);
      setPendingDraft(null);
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
    validationIssues,
    hasAttemptedSubmit,
    showConfirmation,
    setShowConfirmation,
    visitedSteps,
    draftSavedAt,
    pendingDraftSavedAt: pendingDraft?.savedAt ?? null,
    showDraftBanner: Boolean(pendingDraft),
    currentStep,
    setCurrentStep,
    isCleanPlaceMode,
    totalSteps,
    
    // Computed & payload
    payload,
    dataQuality,
    effectiveRoutePreviewDrawing,
    
    // Smart Assist state
    smartAssist,

    // Methods
    nextStep,
    prevStep,
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
      message: "Sélectionnez une structure ou “Autre bénévole”.",
    });
  }

  if (
    form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE &&
    !form.actorName.trim()
  ) {
    issues.push({
      field: "associationName",
      message:
        "Renseignez le nom ou pseudo du bénévole avant de continuer.",
    });
  }

  if (!form.actionDate.trim()) {
    issues.push({
      field: "actionDate",
      message: "Indiquez la date de l’action avant de continuer.",
    });
  }

  return issues;
}
