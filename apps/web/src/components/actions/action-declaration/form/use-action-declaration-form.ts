import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import {
  buildCreateActionPayload,
  createInitialFormState,
  isDrawingValid,
} from "../payload";
import type { ActionDeclarationDraftGeometry } from "../draft-storage";
import { summarizeActionDrawingValidation } from "../../map/actions-map-geometry.utils";
import { computeActionDataQuality } from "./action-declaration-form.quality";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";
import { useActionDeclarationSmartAssist } from "./action-declaration-form.smart-assist";
import { applyOrganizerFormUpdates } from "../organizer-form-state";
import { resolveFinalActionGeometry } from "@/lib/actions/geometry/final-geometry";
import type {
  FormState,
} from "./model";
import type { ActionDeclarationUserMetadata } from "./use-action-declaration-submission";
import { useActionDeclarationHydration } from "./use-action-declaration-hydration";
import { useActionDeclarationDraft } from "./use-action-declaration-draft";
import { useActionDeclarationSubmission } from "./use-action-declaration-submission";
import { createActionDeclarationGeometryHandlers } from "./action-declaration-geometry.handlers";

type UseActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  userMetadata: ActionDeclarationUserMetadata;
  initialActionId?: string | null;
  linkedEventId?: string;
  initialRecordType?: "action";
};

const ROUTE_GEOMETRY_PARAMETER_FIELDS = new Set<keyof FormState>([
  "locationLabel",
  "departureLocationLabel",
  "midRouteLocationLabel",
  "arrivalLocationLabel",
  "routeTopology",
  "routeStyle",
  "latitude",
  "longitude",
  "durationMinutes",
  "routeTargetDistanceKm",
  "midRouteCoordinates",
  "arrivalCoordinates",
]);

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
  const [manualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawingState] = useState<ActionDrawing | null>(null);
  const [manualDrawingSource, setManualDrawingSource] = useState<ActionGeometrySource | null>(null);
  const [persistedDrawing, setPersistedDrawing] = useState<ActionDrawing | null>(null);
  const [persistedDrawingSource, setPersistedDrawingSource] = useState<ActionGeometrySource | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [declarationMode] = useState<"complete">("complete");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  const setManualDrawing = useCallback((
    drawing: ActionDrawing | null,
    geometrySource?: ActionGeometrySource | null,
  ) => {
    setManualDrawingState(drawing);
    setManualDrawingSource(drawing ? geometrySource ?? "manual" : null);
  }, []);

  const isCleanPlaceMode = form.recordType === "clean_place";

  const hydration = useActionDeclarationHydration({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource,
    setPersistedDrawing,
    setPersistedDrawingSource,
  });

  const draft = useActionDeclarationDraft({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource,
    setHasAttemptedSubmit,
  });

  const drawingIsValid = isDrawingValid(manualDrawing);
  const routePreviewInput = form.departureLocationLabel.trim() || form.locationLabel.trim();
  const manualDrawingValidation = summarizeActionDrawingValidation(manualDrawing);
  const activeFinalGeometry = resolveFinalActionGeometry({
    gpxDrawing: form.gpxImport ? manualDrawing : null,
    gpxImport: form.gpxImport,
    manualDrawing,
    manualDrawingSource,
    operationalRoute: form.operationalRoute,
    reconstructedDrawing: persistedDrawing,
    reconstructedSource: persistedDrawingSource,
  });
  // Network reconstruction is server-only; the browser never routes or calls
  // a public routing provider for an action draft.
  const effectiveRoutePreviewDrawing: ActionDrawing | null = activeFinalGeometry?.drawing ?? null;
  const effectiveDrawing = manualDrawingValidation.normalized ?? effectiveRoutePreviewDrawing;
  const hasValidDrawing = Boolean(effectiveDrawing);
  const hasServerRouteInput = routePreviewInput.length >= 2 || (
    Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude))
  );

  const payload = useMemo(
    () =>
      buildCreateActionPayload({
        form,
        declarationMode,
        isEntrepriseMode: false,
        effectiveManualDrawingEnabled: manualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        manualDrawingSource,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        routePreviewSource: activeFinalGeometry?.source,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      }),
    [activeFinalGeometry?.source, declarationMode, drawingIsValid, effectiveRoutePreviewDrawing, manualDrawingEnabled, form, linkedEventId, manualDrawing, manualDrawingSource, photoAssets, visionEstimate, userMetadata]
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

  const submission = useActionDeclarationSubmission({
    form,
    declarationMode,
    isAuthenticated,
    initialActionId,
    loadedActionPhase: hydration.loadedActionPhase,
    setLoadedActionPhase: hydration.setLoadedActionPhase,
    setHasAttemptedSubmit,
    manualDrawingEnabled,
    manualDrawing,
    manualDrawingSource,
    drawingIsValid: manualDrawingValidation.isValid,
    effectiveRoutePreviewDrawing,
    routePreviewSource: activeFinalGeometry?.source,
    hasValidDrawing,
    hasServerRouteInput,
    isCleanPlaceMode,
    payload,
    linkedEventId,
    photoAssets,
    visionEstimate,
    userMetadata,
    clearDraft: draft.clearDraft,
  });

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
      volunteersCount: payload.volunteersCount,
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
  }, [photoAssets, form.locationLabel, form.placeType, payload.volunteersCount, form.durationMinutes]);

  function updateForm(
    updates: Partial<FormState>,
    draftGeometry?: ActionDeclarationDraftGeometry,
  ) {
    if (
      updates.routeTopology &&
      form.gpxImport &&
      updates.routeTopology !== form.gpxImport.inferredTopology
    ) {
      setGpxError(
        form.gpxImport.inferredTopology === "loop"
          ? "Ce tracé GPX est fermé. Supprimez-le avant de choisir Départ → arrivée."
          : "Ce tracé GPX est ouvert. Supprimez-le avant de choisir Boucle.",
      );
      return;
    }
    const nextForm: FormState = { ...form, ...updates };
    if (
      persistedDrawing &&
      Object.keys(updates).some((key) =>
        ROUTE_GEOMETRY_PARAMETER_FIELDS.has(key as keyof FormState),
      )
    ) {
      setPersistedDrawing(null);
      setPersistedDrawingSource(null);
    }
    if (updates.routeTargetDistanceKm !== undefined) {
      nextForm.routeTargetDistanceKmManuallySet = true;
    } else if (
      updates.durationMinutes !== undefined &&
      !form.routeTargetDistanceKmManuallySet
    ) {
      nextForm.routeTargetDistanceKm = String(
        resolveRouteTargetDistance({
          durationMinutes: updates.durationMinutes,
          routeTargetDistanceSource: "derived",
        }).distanceKm,
      );
    }
    if (updates.routeStyle !== undefined) {
      nextForm.routeStyle = "souple";
    }
    if (updates.routeTopology === "loop" && nextForm.recordType === "action") {
      nextForm.arrivalLocationLabel = "";
    }
    if (updates.associationName === "Action spontanée") {
      nextForm.organizerAccounts = "";
    }
    applyOrganizerFormUpdates(nextForm, form, updates);
    const activeDraftGeometry = draftGeometry === undefined
      ? nextForm.gpxImport && manualDrawingSource === "gpx_import" && manualDrawing
        ? { drawing: manualDrawing, source: "gpx_import" as const }
        : null
      : draftGeometry;
    draft.saveDraftIfAllowed(
      nextForm,
      activeDraftGeometry,
      submission.submissionState !== "success",
    );
    if (updates.recordType !== undefined) {
      setHasAttemptedSubmit(false);
    }
    setForm(nextForm);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    submission.trackFormStart();
    updateForm({ [key]: value } as Partial<FormState>);
  }

  function updateFields(updates: Partial<FormState>) {
    submission.trackFormStart();
    updateForm(updates);
  }

  const { handleGpxImport, removeGpxImport } =
    createActionDeclarationGeometryHandlers({
      form,
      manualDrawing,
      manualDrawingSource,
      setManualDrawingState,
      setManualDrawingSource,
      setGpxError,
      updateForm,
    });

  return {
    // State
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
    showDraftBanner: Boolean(draft.pendingDraft),
    isCleanPlaceMode,

    // Computed & payload
    payload,
    dataQuality,
    effectiveRoutePreviewDrawing,
    effectiveRoutePreviewSource: activeFinalGeometry?.source ?? null,

    // Smart Assist state
    smartAssist,

    handlePhotoUpload,
    clearPhotos,
    handleGpxImport,
    removeGpxImport,
    updateField,
    updateFields,
    handleResumeDraft: draft.handleResumeDraft,
    handleIgnoreDraft: draft.handleIgnoreDraft,
    handleConfirmSubmit: submission.handleConfirmSubmit,
  };
}
