"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createAction, fetchActionPrefill } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import type {
  ActionDrawing,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "@/lib/actions/types";
import {
  buildCreateActionPayload,
  createInitialFormState,
  getFormResetState,
  isDrawingValid,
  isLocationLikelyPark,
  PARK_PLACE_TYPE,
  prepareCreateActionPayload,
} from "./action-declaration/payload";
import { ActionStepIdentity } from "./action-declaration/ActionStepIdentity";
import { ActionStepHarvest } from "./action-declaration/ActionStepHarvest";
import { ActionStepLocation } from "./action-declaration/ActionStepLocation";
import { ActionStepReview } from "./action-declaration/ActionStepReview";
import {
  User,
  Scale,
  Route as RouteIcon,
  ClipboardCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionDeclarationFormConfirmation } from "./action-declaration-form-confirmation";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";
import { computeActionDataQuality } from "./action-declaration-form.quality";
import { useActionDeclarationSmartAssist } from "./action-declaration-form.smart-assist";
import { deriveAutoDrawingFromLocation } from "@/lib/actions/route-geometry";
import { normalizeActionPhotos, inferActionVisionEstimate } from "@/lib/actions/vision";

const ActionDrawingMap = dynamic(
  () =>
    import("@/components/actions/action-drawing-map").then(
      (mod) => mod.ActionDrawingMap,
    ),
  { ssr: false },
);

type ActionDeclarationFormProps = {
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
};

type DeclarationMode = "quick" | "complete";
type SubmissionState = "idle" | "pending" | "success" | "error";

export function ActionDeclarationForm({
  actorNameOptions,
  defaultActorName,
  userMetadata,
  linkedEventId,
  initialMode = "quick",
}: ActionDeclarationFormProps) {
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
      } catch { }
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

  return (
    <>
      {showConfirmation && (
        <ActionDeclarationFormConfirmation
          form={form}
          payload={payload as any}
          userMetadata={userMetadata}
          onModify={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSubmit}
          isSubmitting={submissionState === "pending"}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6 mt-6 px-4 md:px-0">

        {/* Premium Progress Stepper */}
        <div className="relative p-4 md:p-6 rounded-[2rem] bg-white/80 border border-slate-200/60 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full rounded-t-[2rem] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          <div className="relative flex justify-between items-center z-10 pt-2">
            {[
              { id: 1, label: "Identité", icon: User },
              { id: 2, label: "Récolte", icon: Scale },
              { id: 3, label: "Parcours", icon: RouteIcon },
              { id: 4, label: "Validation", icon: ClipboardCheck },
            ].map((step, index) => {
              const Icon = step.icon;
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 group relative z-10 w-1/4">
                  <div className={cn(
                    "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10",
                    isPast ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" :
                      isCurrent ? "bg-white border-2 border-emerald-500 text-emerald-600 scale-110 shadow-xl shadow-emerald-500/10" :
                        "bg-slate-50 border border-slate-200 text-slate-400"
                  )}>
                    {isPast ? <CheckCircle2 size={18} className="animate-in zoom-in" /> : <Icon size={18} />}
                  </div>
                  <p className={cn(
                    "text-[9px] font-black tracking-widest uppercase hidden md:block transition-colors duration-300",
                    isCurrent ? "text-emerald-700" : isPast ? "text-slate-600" : "text-slate-400"
                  )}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Form Container */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/95 p-6 md:p-10 shadow-2xl shadow-slate-200/50 backdrop-blur-xl min-h-[500px] flex flex-col">
          {/* Subtle background glow */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Contextual Step Header */}
          <div className="mb-8 pb-6 border-b border-slate-100 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 mb-4">
              <Sparkles size={14} className="text-emerald-500" />
              <span className="cmm-text-caption font-bold text-emerald-700 uppercase tracking-widest">
                Étape {currentStep} sur {totalSteps}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {currentStep === 1 && "Qui a mené cette action ?"}
              {currentStep === 2 && "Bilan de la récolte"}
              {currentStep === 3 && "Géolocalisation du parcours"}
              {currentStep === 4 && "Vérification et envoi"}
            </h2>
            <p className="mt-2 text-slate-500 font-medium">
              {currentStep === 1 && "Identifiez la structure ou le bénévole pour valoriser votre engagement local."}
              {currentStep === 2 && "Indiquez les volumes collectés. Ces données permettent de mesurer l'impact environnemental sur le territoire."}
              {currentStep === 3 && "Tracez ou localisez votre itinéraire. Cela permet de cartographier précisément les zones traitées."}
              {currentStep === 4 && "Vérifiez vos informations avant de valider officiellement votre déclaration."}
            </p>
          </div>

          <div className="flex-1 relative z-10">
            {currentStep === 1 && <ActionStepIdentity form={form} updateField={updateField} userMetadata={userMetadata} />}
            {currentStep === 2 && (
              <ActionStepHarvest
                form={form} updateField={updateField} photoAssets={photoAssets}
                visionEstimate={visionEstimate} visionStatus={visionStatus}
                onPhotoUpload={handlePhotoUpload} onClearPhotos={clearPhotos}
              />
            )}
            {currentStep === 3 && (
              <ActionStepLocation
                form={form} updateField={updateField} manualDrawing={manualDrawing}
                setManualDrawing={setManualDrawing} routePreviewDrawing={routePreviewDrawing}
                gpsStatus={gpsStatus} gpsMessage={gpsMessage} onAutofillGps={autofillGps}
              />
            )}
            {currentStep === 4 && (
              <ActionStepReview
                form={form} payload={payload as any} dataQuality={dataQuality}
                isSubmitting={submissionState === "pending"} onSubmit={() => onSubmit()}
              />
            )}
          </div>

          {currentStep < 4 && (
            <div className="mt-8 sticky bottom-0 z-20 -mx-6 -mb-6 md:-mx-10 md:-mb-10 p-6 md:p-8 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-between">
              <CmmButton
                variant="ghost"
                className={cn("h-12 md:h-14 font-medium text-slate-500 hover:text-slate-800", currentStep === 1 && "invisible")}
                onClick={prevStep}
              >
                <ChevronLeft size={18} className="mr-2" /> Retour
              </CmmButton>
              <CmmButton
                tone="emerald"
                className="h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                onClick={nextStep}
              >
                {currentStep === 1 && "Continuer vers Récolte"}
                {currentStep === 2 && "Continuer vers Parcours"}
                {currentStep === 3 && "Finaliser la saisie"}
                <ChevronRight size={18} className="ml-2" />
              </CmmButton>
            </div>
          )}
        </section>

        <ActionDeclarationFormFeedback
          submissionState={submissionState}
          createdId={createdId}
          errorMessage={errorMessage}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssues={validationIssues}
          retentionLoop={retentionLoop}
          onReset={() => {
            setSubmissionState("idle");
            setCreatedId(null);
            setErrorMessage(null);
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </>
  );
}
