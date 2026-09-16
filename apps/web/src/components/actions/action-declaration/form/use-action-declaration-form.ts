import { useState, useEffect, useRef, useMemo, useSyncExternalStore, useCallback } from "react";
import {
  createAction,
  fetchActionById,
  updateAction,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  ENTREPRISE_ASSOCIATION_OPTION,
  extractEntrepriseName,
} from "@/lib/actions/association-options";
import type {
  ActionDrawing,
  ActionGeometrySource,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import { GpxImportError, parseGpxFile } from "@/lib/actions/geometry/gpx";
import {
  buildCreateActionPayload,
  applyPreparationDataToForm,
  createInitialFormState,
  isDrawingValid,
  OTHER_VOLUNTEER_ASSOCIATION_VALUE,
  prepareCreateActionPayload,
} from "../payload";
import {
  clearDraft,
  loadDraftSnapshot,
  saveDraft,
  subscribeToDraftChanges,
  type ActionDeclarationDraftGeometry,
} from "../draft-storage";
import { summarizeActionDrawingValidation } from "../../map/actions-map-geometry.utils";
import { computeActionDataQuality } from "./action-declaration-form.quality";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";
import { useActionDeclarationSmartAssist } from "./action-declaration-form.smart-assist";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
  hydrateActionEditorGeometry,
  resolveFinalActionGeometry,
} from "@/lib/actions/geometry/final-geometry";
import { consumePlannerActionHandoff } from "@/lib/route/route-action-handoff";
import type {
  FormState,
  PostActionRetentionLoop,
  ValidationIssue,
} from "./model";

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
  const pendingDraft = useSyncExternalStore(
    subscribeToDraftChanges,
    () => {
      if (initialActionId) {
        return null;
      }
      // /actions/new is an action-only entry point. Historical clean_place
      // records remain readable when explicitly hydrated by id, but a local
      // draft cannot turn this form back into an observation entry point.
      return loadDraftSnapshot(createCleanForm(), "action");
    },
    () => null,
  );
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
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [recordedAction, setRecordedAction] = useState<ActionEditorRecord | null>(null);
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
  const plannerHandoffConsumedRef = useRef<boolean>(false);

  const setManualDrawing = useCallback((
    drawing: ActionDrawing | null,
    geometrySource?: ActionGeometrySource | null,
  ) => {
    setManualDrawingState(drawing);
    setManualDrawingSource(drawing ? geometrySource ?? "manual" : null);
  }, []);

  const isCleanPlaceMode = form.recordType === "clean_place";

  function handleResumeDraft() {
    if (!pendingDraft) return;
    setForm(pendingDraft.form);
    setManualDrawingState(pendingDraft.manualDrawing ?? null);
    setManualDrawingSource(pendingDraft.manualDrawingSource ?? null);
    clearDraft();
    setHasAttemptedSubmit(false);
  }

  function handleIgnoreDraft() {
    clearDraft();
    setForm(createCleanForm());
    setHasAttemptedSubmit(false);
  }

  useEffect(() => {
    if (initialActionId || pendingDraft || plannerHandoffConsumedRef.current) {
      return;
    }
    plannerHandoffConsumedRef.current = true;
    const handoff = consumePlannerActionHandoff();
    if (!handoff) return;
    // The planner handoff is an external session-storage snapshot, so hydrate the
    // form once after the client-only boundary has been established.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional external handoff hydration
    setForm((current) => ({
      ...current,
      operationalRoute: handoff.operationalRoute,
      routeCalibrationContext: handoff.routeCalibrationContext,
      plannerProof: handoff.plannerProof,
      departureLocationLabel:
        handoff.operationalRoute.zones.departure.label ?? current.departureLocationLabel,
      midRouteLocationLabel:
        handoff.operationalRoute.zones.midpoint.label ?? current.midRouteLocationLabel,
      arrivalLocationLabel:
        handoff.operationalRoute.zones.arrival.label ?? current.arrivalLocationLabel,
    }));
  }, [initialActionId, pendingDraft]);

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
        const storedBreakdown =
          action.wasteBreakdown && typeof action.wasteBreakdown === "object"
            ? (action.wasteBreakdown as Record<string, unknown>)
            : {};
        const toFormNumber = (value: unknown): string =>
          typeof value === "number" && Number.isFinite(value) ? String(value) : "";
        const nextForm: FormState = {
          ...preparedForm,
          actorName: action.actorName ?? preparedForm.actorName,
          associationName: action.associationName ?? preparedForm.associationName,
          enterpriseName:
            extractEntrepriseName(action.associationName ?? "") ??
            preparedForm.enterpriseName,
          organizerType: action.organizerType ?? preparedForm.organizerType,
          participantAccounts: action.participantAccounts ?? preparedForm.participantAccounts,
          groupJoinEnabled: action.groupJoinEnabled,
          actionDate: action.actionDate,
          locationLabel: action.locationLabel,
          departureLocationLabel:
            action.departureLocationLabel ?? preparedForm.departureLocationLabel,
          midRouteLocationLabel: preparedForm.midRouteLocationLabel,
          arrivalLocationLabel:
            action.arrivalLocationLabel ?? preparedForm.arrivalLocationLabel,
          routeStyle: action.routeStyle ?? preparedForm.routeStyle,
          routeAdjustmentMessage:
            action.routeAdjustmentMessage ?? preparedForm.routeAdjustmentMessage,
          notes: action.notes ?? preparedForm.notes,
          placeType: action.placeType ?? preparedForm.placeType,
          volunteersCount: String(action.volunteersCount),
          childrenCount:
            action.volunteerParticipation?.childrenCount == null
              ? ""
              : String(action.volunteerParticipation.childrenCount),
          adultCount:
            action.volunteerParticipation?.adultCount == null
              ? ""
              : String(action.volunteerParticipation.adultCount),
          retiredCount:
            action.volunteerParticipation?.retiredCount == null
              ? ""
              : String(action.volunteerParticipation.retiredCount),
          durationMinutes: String(action.durationMinutes),
          wasteKg: action.wasteKg === null ? "" : String(action.wasteKg),
          cigaretteButts: action.cigaretteButts === null ? "" : String(action.cigaretteButts),
          cigaretteButtsCount:
            action.cigaretteButtsMeasurements?.cigaretteButtsCount !== null &&
            action.cigaretteButtsMeasurements?.cigaretteButtsCount !== undefined
              ? String(action.cigaretteButtsMeasurements.cigaretteButtsCount)
              : action.cigaretteButts === null
                ? ""
                : String(action.cigaretteButts),
          cigaretteButtsCondition:
            action.cigaretteButtsMeasurements?.cigaretteButtsCondition ??
            preparedForm.cigaretteButtsCondition,
          cigaretteButtsVolumeLiters: toFormNumber(
            action.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters,
          ),
          wasteMegotsKg:
            action.cigaretteButtsMeasurements?.cigaretteButtsMassKg !== null &&
            action.cigaretteButtsMeasurements?.cigaretteButtsMassKg !== undefined
              ? String(action.cigaretteButtsMeasurements.cigaretteButtsMassKg)
              : action.cigaretteButtsKg !== undefined && action.cigaretteButtsKg !== null
                ? String(action.cigaretteButtsKg)
              : toFormNumber(storedBreakdown.megotsKg),
          wasteMegotsCondition:
            action.cigaretteButtsMeasurements?.cigaretteButtsCondition ??
            preparedForm.wasteMegotsCondition,
          wasteMeasurementMethod: action.wasteMeasurementMethod ?? preparedForm.wasteMeasurementMethod,
          wasteRecyclablesKg: toFormNumber(storedBreakdown.recyclablesKg),
          wasteGlassKg: toFormNumber(storedBreakdown.glassKg),
          wasteHouseholdKg: toFormNumber(storedBreakdown.householdWasteKg),
          wasteOtherKg: toFormNumber(storedBreakdown.otherWasteKg),
          wasteUnusualObjects:
            typeof storedBreakdown.unusualObjects === "string"
              ? storedBreakdown.unusualObjects
              : "",
          wasteSpecialHandlingWaste:
            typeof storedBreakdown.specialHandlingWaste === "string"
              ? storedBreakdown.specialHandlingWaste
              : "",
          eventStartTime: action.eventStartTime ?? preparedForm.eventStartTime,
          eventEndTime: action.eventEndTime ?? preparedForm.eventEndTime,
        };

        if (typeof action.preparationData?.routeTargetDistanceKm !== "number") {
          nextForm.routeTargetDistanceKm = String(
            resolveRouteTargetDistance({
              durationMinutes: action.durationMinutes,
              routeTargetDistanceSource: "derived",
            }).distanceKm,
          );
          nextForm.routeTargetDistanceKmManuallySet = false;
        }

        if (
          action.actionPhase === "pre_action" ||
          action.actionPhase === "post_action_draft"
        ) {
          nextForm.wasteKg = "";
          nextForm.wasteMeasurementMethod = "";
          nextForm.wasteRecyclablesKg = "";
          nextForm.wasteGlassKg = "";
          nextForm.wasteHouseholdKg = "";
          nextForm.wasteOtherKg = "";
          nextForm.wasteUnusualObjects = "";
          nextForm.wasteSpecialHandlingWaste = "";
          nextForm.cigaretteButts = "";
          nextForm.cigaretteButtsCount = "";
          nextForm.cigaretteButtsVolumeLiters = "";
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
        const hydratedGeometry = hydrateActionEditorGeometry({
          drawing: action.manualDrawing,
          geometrySource: action.geometrySource,
          gpxImport: nextForm.gpxImport,
          operationalRoute: nextForm.operationalRoute,
        });
        setForm(nextForm);
        setManualDrawingState(hydratedGeometry.manualDrawing);
        setManualDrawingSource(hydratedGeometry.manualDrawingSource);
        setPersistedDrawing(hydratedGeometry.reconstructedDrawing);
        setPersistedDrawingSource(hydratedGeometry.reconstructedSource);
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
  const isEntrepriseMode =
    form.organizerType === "company" ||
    form.associationName === ENTREPRISE_ASSOCIATION_OPTION ||
    form.associationName.startsWith("Entreprise - ");
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
        effectiveManualDrawingEnabled: manualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        manualDrawingSource,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        routePreviewSource: activeFinalGeometry?.source,
        isEntrepriseMode,
        linkedEventId,
        photos: photoAssets,
        visionEstimate,
        userMetadata,
      }),
    [activeFinalGeometry?.source, declarationMode, drawingIsValid, effectiveRoutePreviewDrawing, manualDrawingEnabled, form, isEntrepriseMode, linkedEventId, manualDrawing, manualDrawingSource, photoAssets, visionEstimate, userMetadata]
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
    if (!pendingDraft && submissionState !== "success") {
      const activeDraftGeometry = draftGeometry === undefined
        ? nextForm.gpxImport && manualDrawingSource === "gpx_import" && manualDrawing
          ? { drawing: manualDrawing, source: "gpx_import" as const }
          : null
        : draftGeometry;
      saveDraft(nextForm, undefined, activeDraftGeometry);
    }
    if (updates.recordType !== undefined) {
      setHasAttemptedSubmit(false);
    }
    setForm(nextForm);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    trackFormStart();
    updateForm({ [key]: value } as Partial<FormState>);
  }

  function updateFields(updates: Partial<FormState>) {
    trackFormStart();
    updateForm(updates);
  }

  async function handleGpxImport(file: File | null) {
    if (!file) return;
    try {
      const parsed = await parseGpxFile(file);
      if (parsed.metadata.inferredTopology !== form.routeTopology) {
        setGpxError(
          parsed.metadata.inferredTopology === "loop"
            ? "Ce GPX est fermé. Sélectionnez Boucle avant de l’importer."
            : "Ce GPX est ouvert. Sélectionnez Départ → arrivée avant de l’importer.",
        );
        return;
      }
      if (
        (manualDrawing && manualDrawingSource !== "gpx_import") ||
        form.gpxImport
      ) {
        const confirmed = window.confirm(
          "Remplacer le tracé actuel par ce tracé GPX ?",
        );
        if (!confirmed) return;
      }
      setManualDrawingState(parsed.drawing);
      setManualDrawingSource("gpx_import");
      setGpxError(null);
      updateForm(
        { gpxImport: parsed.metadata },
        { drawing: parsed.drawing, source: "gpx_import" },
      );
    } catch (error: unknown) {
      setGpxError(
        error instanceof GpxImportError
          ? error.message
          : "Impossible de lire ce fichier GPX.",
      );
    }
  }

  function removeGpxImport() {
    if (manualDrawingSource === "gpx_import") {
      setManualDrawingState(null);
      setManualDrawingSource(null);
    }
    setGpxError(null);
    updateForm({ gpxImport: null }, null);
  }

  function normalizeFormBeforeSubmit(f: FormState): FormState {
    const normalized = { ...f };
    normalized.routeStyle = "souple";
    normalized.routeTopology = resolveActionRouteTopology({
      topology: normalized.routeTopology,
      arrivalLocationLabel: normalized.arrivalLocationLabel,
      recordType: normalized.recordType,
    });
    if (normalized.recordType === "action" && normalized.routeTopology === "loop") {
      normalized.arrivalLocationLabel = "";
    }
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
            "Connectez-vous pour compléter et envoyer ce formulaire.",
        },
      ]);
      setHasAttemptedSubmit(true);
      setErrorMessage(
        "Connectez-vous pour compléter et envoyer ce formulaire.",
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

    if (declarationMode === "complete" && !hasValidDrawing && !hasServerRouteInput && !isCleanPlaceMode) {
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

    if (form.gpxImport && manualDrawingSource !== "gpx_import") {
      setValidationIssues([
        {
          field: "gpxImport",
          message: "Le tracé GPX sélectionné n’est plus présent. Supprimez-le ou réimportez-le.",
        },
      ]);
      setHasAttemptedSubmit(true);
      setErrorMessage("Le tracé GPX sélectionné n’est plus présent. Supprimez-le ou réimportez-le.");
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
        manualDrawingSource,
        routePreviewDrawing: effectiveRoutePreviewDrawing,
        routePreviewSource: activeFinalGeometry?.source,
        isEntrepriseMode,
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
      setRetentionLoop("retentionLoop" in result ? result.retentionLoop ?? null : null);
      const persistedAction = await fetchActionById(persistedActionId).catch(() => null);
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
    submissionState,
    errorMessage,
    createdId,
    recordedAction,
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
    effectiveRoutePreviewSource: activeFinalGeometry?.source ?? null,

    // Smart Assist state
    smartAssist,

    handlePhotoUpload,
    clearPhotos,
    handleGpxImport,
    removeGpxImport,
    updateField,
    updateFields,
    handleResumeDraft,
    handleIgnoreDraft,
    handleConfirmSubmit,
  };
}

function getStepOneValidationIssues(form: FormState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!form.organizerType) {
    issues.push({
      field: "organizerType",
      message: "Sélectionnez un type de structure avant l’envoi.",
    });
  }

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

  const routeTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel: form.arrivalLocationLabel,
    recordType: form.recordType,
  });

  if (form.recordType === "action" && routeTopology === "point_to_point" && !form.arrivalLocationLabel.trim()) {
    issues.push({
      field: "arrivalLocationLabel",
      message: "Indiquez une arrivée pour un parcours départ → arrivée.",
    });
  }

  const timeMessage = getTimeContractValidationMessage({
    actionDurationMinutes: Number(form.durationMinutes),
    startTime: form.eventStartTime,
    endTime: form.eventEndTime,
  });
  if (timeMessage) {
    issues.push({ field: "eventStartTime", message: timeMessage });
  }

  return issues;
}
