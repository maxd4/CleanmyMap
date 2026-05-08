"use client";

import { type FormEvent } from "react";
import {
  User,
  Scale,
  Route as RouteIcon,
  ClipboardCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  Download,
  Save,
  History,
} from "lucide-react";
import { exportFormAsPdf } from "@/lib/actions/export-form-pdf";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionDeclarationFormConfirmation } from "../action-declaration-form-confirmation";
import { ActionDeclarationFormFeedback } from "../action-declaration-form.feedback";
import { createInitialFormState } from "../action-declaration/payload";
import { clearDraft } from "../action-declaration/draft-storage";
import { ActionStepIdentity } from "../action-declaration/ActionStepIdentity";
import { ActionStepHarvest } from "../action-declaration/ActionStepHarvest";
import { ActionStepLocation } from "../action-declaration/ActionStepLocation";
import { ActionStepReview } from "../action-declaration/ActionStepReview";
import { useActionDeclarationForm } from "./use-action-declaration-form";

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
  initialRecordType?: "action" | "clean_place";
};

export function ActionDeclarationForm(props: ActionDeclarationFormProps) {
  const {
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
    showDraftBanner,
    setShowDraftBanner,
    currentStep,
    setCurrentStep,
    isCleanPlaceMode,
    totalSteps,
    payload,
    dataQuality,
    effectiveRoutePreviewDrawing,
    smartAssist,
    nextStep,
    prevStep,
    handlePhotoUpload,
    clearPhotos,
    updateField,
    handleConfirmSubmit,
  } = useActionDeclarationForm(props);

  async function onSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setShowConfirmation(true);
  }

  return (
    <>
      {showConfirmation && (
        <ActionDeclarationFormConfirmation
          form={form}
          payload={payload}
          userMetadata={props.userMetadata}
          onModify={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSubmit}
          isSubmitting={submissionState === "pending"}
        />
      )}

      <div className="w-full space-y-6 mt-6 px-4 md:px-6">
        {/* Bannière brouillon */}
        {showDraftBanner && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <History size={15} className="text-amber-600 shrink-0" />
              <p className="text-xs font-medium text-amber-800">
                Brouillon restauré
                {draftSavedAt ? ` — ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(draftSavedAt))}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setShowDraftBanner(false);
                setForm(createInitialFormState(resolvedDefaultActorName, props.initialRecordType ?? "action"));
              }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Effacer
            </button>
          </div>
        )}

        {/* Stepper + Form fused */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-200/50 backdrop-blur-xl min-h-[500px] flex flex-col">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {/* Stepper */}
          <div className="flex justify-between items-center px-6 md:px-10 pt-6 pb-4 border-b border-slate-100">
            {(
              isCleanPlaceMode
                ? [
                    { id: 1, label: "Identité", icon: User },
                    { id: 2, label: "Lieu propre", icon: ClipboardCheck },
                  ]
                : [
                    { id: 1, label: "Identité", icon: User },
                    { id: 2, label: "Récolte", icon: Scale },
                    { id: 3, label: "Parcours", icon: RouteIcon },
                    { id: 4, label: "Validation", icon: ClipboardCheck },
                  ]
            ).map((step) => {
              const Icon = step.icon;
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isClickable = visitedSteps.has(step.id) && !isCurrent;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center gap-2 relative z-10",
                    isCleanPlaceMode ? "w-1/2" : "w-1/4",
                  )}
                >
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => isClickable && setCurrentStep(step.id)}
                    className={cn(
                      "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                      isPast ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 cursor-pointer hover:scale-105" :
                        isCurrent ? "bg-white border-2 border-emerald-500 text-emerald-600 scale-110 shadow-xl shadow-emerald-500/10 cursor-default" :
                          "bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {isPast ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </button>
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

          {/* Form body */}
          <div className="p-6 md:p-10 flex-1 flex flex-col">
            {/* Subtle background glow */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

            {/* Contextual Step Header */}
            <div className="mb-8 pb-6 border-b border-slate-100 relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 mb-4">
                  <Sparkles size={14} className="text-emerald-500" />
                  <span className="cmm-text-caption font-bold text-emerald-700 uppercase tracking-widest">
                    Étape {currentStep} sur {totalSteps}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {currentStep === 1 && (isCleanPlaceMode ? "Qui a déclaré ce lieu propre ?" : "Qui a mené cette action ?")}
                  {currentStep === 2 && (isCleanPlaceMode ? "Lieu propre et localisation" : "Déchets et mégots")}
                  {!isCleanPlaceMode && currentStep === 3 && "Géolocalisation du parcours"}
                  {!isCleanPlaceMode && currentStep === 4 && "Vérification et envoi"}
                </h2>
                <p className="mt-2 text-slate-500 font-medium">
                  {currentStep === 1 && (isCleanPlaceMode ? "Choisissez le mode de déclaration pour un lieu propre ou une action terrain." : "Identifiez la structure ou le bénévole pour valoriser votre engagement local." )}
                  {currentStep === 2 && (isCleanPlaceMode ? "Ajoute le lieu, une photo et un court contexte. La validation finale arrive juste après." : "Remplissez d'abord les déchets collectés puis la déclaration des mégots. Les comparaisons par bénévole sont intégrées directement dans chaque carte.")}
                  {!isCleanPlaceMode && currentStep === 3 && "Tracez ou localisez votre itinéraire. Cela permet de cartographier précisément les zones traitées."}
                  {!isCleanPlaceMode && currentStep === 4 && "Vérifiez vos informations avant de valider officiellement votre déclaration."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportFormAsPdf(form, resolvedDefaultActorName)}
                className="shrink-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm"
              >
                <Download size={14} />
                Exporter
              </button>
              {draftSavedAt && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Save size={11} />
                  Sauvegardé
                </span>
              )}
            </div>

            <div className="flex-1 relative z-10 flex flex-col">
              {currentStep === 1 && (
                <ActionStepIdentity
                  form={form}
                  updateField={updateField}
                  userMetadata={props.userMetadata}
                  recordType={form.recordType}
                  hasAttemptedSubmit={hasAttemptedSubmit}
                />
              )}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <ActionStepHarvest
                    form={form}
                    updateField={updateField}
                    recordType={form.recordType}
                    photoAssets={photoAssets}
                    visionEstimate={visionEstimate}
                    visionStatus={visionStatus}
                    heuristicEstimatedWasteKg={smartAssist.heuristicEstimatedWasteKg}
                    estimatedWasteKg={smartAssist.estimatedWasteKg}
                    estimatedWasteKgInterval={smartAssist.estimatedWasteKgInterval}
                    estimatedWasteKgConfidence={smartAssist.estimatedWasteKgConfidence}
                    wasteSuggestionSource={smartAssist.wasteSuggestionSource}
                    onPhotoUpload={handlePhotoUpload}
                    onClearPhotos={clearPhotos}
                  />
                  <ActionStepLocation
                    form={form}
                    updateField={updateField}
                    manualDrawing={manualDrawing}
                    setManualDrawing={setManualDrawing}
                    routePreviewDrawing={effectiveRoutePreviewDrawing}
                    onResetManualDrawing={() => setManualDrawing(null)}
                    gpsStatus={smartAssist.gpsStatus}
                    gpsMessage={smartAssist.gpsMessage}
                    onAutofillGps={smartAssist.autofillGps}
                    recordType={form.recordType}
                  />
                </div>
              )}
              {!isCleanPlaceMode && currentStep === 3 && (
                <ActionStepLocation
                  form={form} updateField={updateField} manualDrawing={manualDrawing}
                  setManualDrawing={setManualDrawing} routePreviewDrawing={effectiveRoutePreviewDrawing}
                  onResetManualDrawing={() => setManualDrawing(null)}
                  gpsStatus={smartAssist.gpsStatus} gpsMessage={smartAssist.gpsMessage} onAutofillGps={smartAssist.autofillGps}
                  recordType={form.recordType}
                />
              )}
              {!isCleanPlaceMode && currentStep === 4 && (
                <ActionStepReview
                  payload={payload} dataQuality={dataQuality}
                  isSubmitting={submissionState === "pending"} onSubmit={() => onSubmit()}
                />
              )}
            </div>

            {(currentStep < totalSteps || (isCleanPlaceMode && currentStep === totalSteps)) && (
              <div className="mt-8 sticky bottom-0 z-20 -mx-6 -mb-6 md:-mx-10 md:-mb-10 p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-between">
                <CmmButton
                  variant="ghost"
                  className={cn("h-12 md:h-14 font-medium text-slate-500 hover:text-slate-800", currentStep === 1 && "invisible")}
                  onClick={prevStep}
                >
                  <ChevronLeft size={18} className="mr-2" /> Retour
                </CmmButton>
                <CmmButton
                  tone="primary"
                  className="h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                  onClick={isCleanPlaceMode && currentStep === totalSteps ? () => onSubmit() : nextStep}
                >
                  {currentStep === 1 && "Continuer"}
                  {currentStep === 2 && (isCleanPlaceMode ? "Vérifier" : "Continuer")}
                  {!isCleanPlaceMode && currentStep === 3 && "Vérifier"}
                  <ChevronRight size={18} className="ml-2" />
                </CmmButton>
              </div>
            )}
            {!isCleanPlaceMode && currentStep === totalSteps && (
              <div className="mt-8 sticky bottom-0 z-20 -mx-6 -mb-6 md:-mx-10 md:-mb-10 p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-between">
                <CmmButton
                  tone="primary"
                  className="h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-sm md:text-base"
                  onClick={prevStep}
                >
                  <ChevronLeft size={18} className="mr-2" /> Retour
                </CmmButton>
                <CmmButton
                  tone="secondary"
                  className="h-12 md:h-14 px-8 md:px-10 rounded-2xl font-bold text-sm md:text-base"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "CleanMyMap", url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href).catch(() => {});
                    }
                  }}
                >
                  Partager
                </CmmButton>
              </div>
            )}
          </div>
        </section>

        <ActionDeclarationFormFeedback
          submissionState={submissionState}
          createdId={createdId}
          errorMessage={errorMessage}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssues={validationIssues}
          retentionLoop={retentionLoop}
          onReset={() => {
            setForm(createInitialFormState(resolvedDefaultActorName, props.initialRecordType ?? "action"));
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </>
  );
}
