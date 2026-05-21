"use client";

import { type ElementType, type FormEvent, useState } from "react";
import { ClipboardCheck, Download, History, Save, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionDeclarationFormConfirmation } from "../action-declaration-form-confirmation";
import { ActionDeclarationExportPicker } from "./action-declaration-export-picker";
import { ActionDeclarationFormFeedback } from "../action-declaration-form.feedback";
import { createInitialFormState } from "../action-declaration/payload";
import { ActionStepHarvest } from "../action-declaration/ActionStepHarvest";
import { ActionStepIdentity } from "../action-declaration/ActionStepIdentity";
import { ActionStepLocation } from "../action-declaration/ActionStepLocation";
import { ActionStepReview } from "../action-declaration/ActionStepReview";
import {
  formatActionDate,
  formatDraftDate,
  formatWasteSummary,
} from "./action-declaration-form.summary";
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

function SectionDivider({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-[rgba(17,56,41,0.76)] px-3 py-1.5 shadow-[0_10px_20px_-12px_rgba(16,185,129,0.4)] backdrop-blur-xl">
          <Icon size={14} className="text-emerald-300" />
          <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-100/88">
            {title}
          </span>
        </div>
        <span className="h-px flex-1 bg-gradient-to-r from-emerald-300/35 via-emerald-200/10 to-transparent" />
      </div>
      <p className="max-w-3xl text-left text-sm leading-6 text-emerald-100/62">
        {subtitle}
      </p>
    </div>
  );
}

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
    draftSavedAt,
    pendingDraftSavedAt,
    showDraftBanner,
    payload,
    dataQuality,
    effectiveRoutePreviewDrawing,
    smartAssist,
    handlePhotoUpload,
    clearPhotos,
    updateField,
    handleResumeDraft,
    handleIgnoreDraft,
    handleConfirmSubmit,
  } = useActionDeclarationForm(props);
  const [isExportPickerOpen, setIsExportPickerOpen] = useState(false);

  const actClasses = getBlockClasses("act");
  const formattedDraftSavedAt = formatDraftDate(draftSavedAt);
  const formattedPendingDraftSavedAt = formatDraftDate(pendingDraftSavedAt);

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    setShowConfirmation(true);
  }

  return (
    <>
      {showConfirmation ? (
        <ActionDeclarationFormConfirmation
          form={form}
          payload={payload}
          userMetadata={props.userMetadata}
          onModify={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSubmit}
          isSubmitting={submissionState === "pending"}
        />
      ) : null}

      <ActionDeclarationExportPicker
        isOpen={isExportPickerOpen}
        onClose={() => setIsExportPickerOpen(false)}
        form={form}
        actorName={resolvedDefaultActorName}
      />

      <div
        className={cn(
          "relative w-full overflow-hidden px-4 py-6 text-emerald-50 md:px-6 lg:px-8",
          "bg-gradient-to-b",
          actClasses.gradientDeep,
        )}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
          <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-emerald-200/60 blur-[120px]" />
          <div className="absolute right-0 top-12 h-[30rem] w-[30rem] rounded-full bg-emerald-100/50 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-100/45 blur-[120px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
          {showDraftBanner ? (
            <div className="flex flex-col gap-3 rounded-[2rem] border border-amber-200/80 bg-[#F3FBF6] px-4 py-3 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.22)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <History size={15} className="shrink-0 text-amber-300" />
                <div>
                    <p className="text-sm font-bold text-emerald-950">
                    Reprendre votre déclaration
                    {formattedPendingDraftSavedAt ? ` du ${formattedPendingDraftSavedAt}` : ""}
                  </p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-900/62">
                    Un brouillon local existe sur cet appareil. Il ne sera restauré que si vous le confirmez.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-500"
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={handleIgnoreDraft}
                  className="rounded-full border border-emerald-200 bg-[#F3FBF6] px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-[#EAF7EF]"
                >
                  Ignorer / recommencer
                </button>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="overflow-hidden rounded-[3rem] border border-emerald-200/70 bg-[#F3FBF6] shadow-[0_20px_44px_-30px_rgba(34,197,94,0.18)] backdrop-blur-3xl"
          >
            <div className="p-6 md:p-10 space-y-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-950/75">
                      Formulaire continu
                    </span>
                  </div>
                  <h2 className="text-[clamp(1.5rem,2.8vw,2.35rem)] font-black tracking-tighter text-emerald-950">
                    Déclarer une action
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 font-medium text-emerald-900/62 md:text-[0.98rem]">
                    Tous les champs sont visibles sur une seule page. Pourquoi mesurer votre impact ? Vos données
                    permettent d&apos;évaluer l&apos;impact réel de la propreté urbaine et d&apos;aider les services de
                    voirie à optimiser leurs tournées. Quatre rubriques structurent la saisie: identité, récolte,
                    parcours, validation.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900/74">
                      <User size={11} className="text-emerald-600" />
                      4 rubriques
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900/74">
                      <ClipboardCheck size={11} className="text-sky-600" />
                      {formatActionDate(form.actionDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900/74">
                      <Sparkles size={11} className="text-emerald-600" />
                      {formatWasteSummary(form.wasteKg, form.wasteMegotsKg)}
                    </span>
                    {formattedDraftSavedAt && !showDraftBanner ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-900">
                        <Save size={11} />
                        Brouillon · {formattedDraftSavedAt}
                      </span>
                    ) : null}
                  </div>
                </div>

              </header>

              <div className="space-y-10">
                <section className="space-y-5">
                  <SectionDivider
                    icon={User}
                    title="Identité"
                    subtitle="Qui déclare, quelle structure porte l’action et à quelle date elle se rattache."
                  />
                  <div className="space-y-4">
                    <ActionStepIdentity
                      form={form}
                      updateField={updateField}
                      userMetadata={props.userMetadata}
                      recordType={form.recordType}
                      hasAttemptedSubmit={hasAttemptedSubmit}
                    />
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionDivider
                    icon={Sparkles}
                    title="Récolte"
                    subtitle="Les volumes, mégots, photos et indices de collecte qui alimentent le résumé et l’impact."
                  />
                  <div className="space-y-4">
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
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionDivider
                    icon={ClipboardCheck}
                    title="Parcours"
                    subtitle="Le lieu, le trajet et le géo-aperçu qui servent à situer l’action sans alourdir la lecture."
                  />
                  <div className="space-y-4">
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
                </section>

                <section className="space-y-5">
                  <SectionDivider
                    icon={ClipboardCheck}
                    title="Validation"
                    subtitle="La vérification finale avant confirmation, avec le score, les alertes et le récapitulatif d’envoi."
                  />
                  <div className="space-y-4">
                    <ActionStepReview
                      payload={payload}
                      dataQuality={dataQuality}
                      isSubmitting={submissionState === "pending"}
                      onSubmit={() => onSubmit()}
                    />
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsExportPickerOpen(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition-all hover:border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                      >
                        <Download size={13} />
                        Exporter
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </form>

          <ActionDeclarationFormFeedback
            submissionState={submissionState}
            createdId={createdId}
            errorMessage={errorMessage}
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationIssues={validationIssues}
            retentionLoop={retentionLoop}
            onReset={() => {
              setForm(createInitialFormState(resolvedDefaultActorName, props.initialRecordType ?? "action"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </div>
    </>
  );
}
