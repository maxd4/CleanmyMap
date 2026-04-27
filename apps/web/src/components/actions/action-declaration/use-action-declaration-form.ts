"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  prepareCreateActionPayload,
} from "./payload";
import { computeActionDataQuality } from "../action-declaration-form.quality";
import { useActionDeclarationSmartAssist } from "../action-declaration-form.smart-assist";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";

type DeclarationMode = "quick" | "complete";
type SubmissionState = "idle" | "pending" | "success" | "error";

export function useActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  userMetadata,
  linkedEventId,
  initialMode = "quick",
}: {
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
}) {
  const resolvedActorOptions = actorNameOptions;
  const resolvedDefaultActorName = resolvedActorOptions.includes(
    defaultActorName,
  )
    ? defaultActorName
    : (resolvedActorOptions[0] ?? userMetadata.userId);

  const [form, setForm] = useState(() =>
    createInitialFormState(resolvedDefaultActorName),
  );
  const [manualDrawingEnabled, setManualDrawingEnabled] = useState<boolean>(true);
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(null);
  const [photoAssets, setPhotoAssets] = useState<ActionPhotoAsset[]>([]);
  const [visionEstimate, setVisionEstimate] = useState<ActionVisionEstimate | null>(null);
  const [visionStatus, setVisionStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [routePreviewDrawing, setRoutePreviewDrawing] = useState<ActionDrawing | null>(null);
  const [declarationMode, setDeclarationMode] = useState<DeclarationMode>(initialMode);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [retentionLoop, setRetentionLoop] = useState<any>(null);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const hasTrackedStartRef = useRef<boolean>(false);

  // Steps State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  const nextStep = () => {
    setHasAttemptedSubmit(true);
    if (currentStep === 1) {
      if (!form.actionDate || !form.associationName) return;
    }
    if (currentStep === 2) {
      if (parseFloat(form.wasteKg) <= 0 && declarationMode === "complete") return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    setHasAttemptedSubmit(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Persistence draft logic
  useEffect(() => {
    const saved = localStorage.getItem("cmm_action_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setForm((prev: any) => ({ ...prev, ...draft }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (submissionState !== "success") {
      localStorage.setItem("cmm_action_draft", JSON.stringify(form));
    } else {
      localStorage.removeItem("cmm_action_draft");
    }
  }, [form, submissionState]);

  const drawingIsValid = isDrawingValid(manualDrawing);
  const isEntrepriseMode = form.associationName === ENTREPRISE_ASSOCIATION_OPTION;

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
        hasLocationProof: form.latitude.trim().length > 0 && form.longitude.trim().length > 0,
        hasDrawingProof: drawingIsValid || Boolean(routePreviewDrawing),
        photoAssets,
        visionEstimate,
      }),
    [declarationMode, drawingIsValid, form, photoAssets, routePreviewDrawing, visionEstimate]
  );

  const {
    gpsStatus,
    gpsMessage,
    autofillGps,
  } = useActionDeclarationSmartAssist({
    form,
    setForm,
    visionEstimate,
  });

  // Route preview effect
  useEffect(() => {
    let active = true;
    const departure = form.departureLocationLabel.trim() || form.locationLabel.trim();
    const arrival = form.arrivalLocationLabel.trim();

    if (!departure) {
      setRoutePreviewDrawing(null);
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
    setVisionStatus("processing");
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

  function updateField(key: string, value: any) {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackFunnel("start_form", declarationMode);
    }
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleConfirmSubmit() {
    if (submissionState === "pending") return;
    setSubmissionState("pending");
    try {
      const submissionPayload = await prepareCreateActionPayload({
        form,
        declarationMode,
        effectiveManualDrawingEnabled: declarationMode === "complete" && manualDrawingEnabled,
        drawingIsValid,
        manualDrawing,
        routePreviewDrawing,
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
      localStorage.removeItem("cmm_action_draft");
    } catch (error: any) {
      setSubmissionState("error");
      setErrorMessage(error.message || "Erreur lors de la soumission");
      setShowConfirmation(false);
    }
  }

  async function onSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setShowConfirmation(true);
  }

  function handleReset() {
    setSubmissionState("idle");
    setCreatedId(null);
    setErrorMessage(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    form,
    updateField,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    submissionState,
    createdId,
    errorMessage,
    hasAttemptedSubmit,
    validationIssues,
    retentionLoop,
    showConfirmation,
    setShowConfirmation,
    handleConfirmSubmit,
    onSubmit,
    handleReset,
    photoAssets,
    visionEstimate,
    visionStatus,
    handlePhotoUpload,
    clearPhotos,
    manualDrawing,
    setManualDrawing,
    routePreviewDrawing,
    gpsStatus,
    gpsMessage,
    autofillGps,
    payload,
    dataQuality,
  };
}
