"use client";

import { type ElementType, type FormEvent, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  History,
  Loader2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionDeclarationFormConfirmation } from "./action-declaration-form-confirmation";
import { ActionDeclarationExportPicker } from "./action-declaration-export-picker";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";
import { createInitialFormState } from "../payload";
import { ActionStepHarvest } from "../steps/ActionStepHarvest";
import { ActionStepIdentity } from "../steps/ActionStepIdentity";
import { ActionStepLocation } from "../steps/ActionStepLocation";
import { ActionStepReview } from "../steps/ActionStepReview";
import {
  formatDraftDate,
} from "./action-declaration-form.summary";
import { useActionDeclarationForm } from "./use-action-declaration-form";
import type { ActionEventPrefill } from "@/lib/actions/action-event-prefill";

type ActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  isAutoApprovedSubmission?: boolean;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  linkedEventId?: string;
  eventPrefill?: ActionEventPrefill | null;
  initialRecordType?: "action";
  initialActionId?: string | null;
  onReturnToChoice?: () => void;
  signInHref?: string;
  signUpHref?: string;
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

function ActionDeclarationFormExportButton({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition-all hover:border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
      >
        <Download size={13} />
        Exporter
      </button>
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
    recordedAction,
    retentionLoop,
    loadedActionPhase,
    isHydratingAction,
    hydrationError,
    validationIssues,
    hasAttemptedSubmit,
    showConfirmation,
    setShowConfirmation,
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
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);

  const actClasses = getBlockClasses("act");
  const formattedPendingDraftSavedAt = formatDraftDate(pendingDraftSavedAt);
  const isCompletionBlocked = !props.isAuthenticated;
  const restrictionMessage = "Connectez-vous pour compléter et envoyer ce formulaire.";

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (isCompletionBlocked) {
      setShowRestrictionDialog(true);
      return;
    }
    setShowConfirmation(true);
  }

  if (isHydratingAction) {
    return (
      <div className="relative overflow-hidden px-4 py-6 md:px-6 lg:px-8">
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-center">
          <CmmCard tone="emerald" variant="glass" size="lg" className="w-full max-w-2xl">
            <div className="space-y-4 text-center">
              <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" />
              <h2 className="text-2xl font-black tracking-tight text-emerald-950">
                Chargement du formulaire existant
              </h2>
              <p className="text-sm leading-6 text-emerald-900/70">
                Nous récupérons les informations préparées avant l&apos;action pour reprendre le même enregistrement.
              </p>
            </div>
          </CmmCard>
        </div>
      </div>
    );
  }

  if (hydrationError) {
    return (
      <div className="relative overflow-hidden px-4 py-6 md:px-6 lg:px-8">
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-center">
          <CmmCard tone="rose" variant="glass" size="lg" className="w-full max-w-2xl">
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">
                Erreur
              </p>
              <h2 className="text-2xl font-black tracking-tight text-rose-950">
                Le formulaire existant n&apos;a pas pu être chargé
              </h2>
              <p className="text-sm leading-6 text-rose-900/72">{hydrationError}</p>
              {props.onReturnToChoice ? (
                <CmmButton tone="secondary" variant="pill" size="md" onClick={props.onReturnToChoice}>
                  Retour au choix
                </CmmButton>
              ) : null}
            </div>
          </CmmCard>
        </div>
      </div>
    );
  }

  const showPreparationSummary = Boolean(props.initialActionId || loadedActionPhase);
  const canShowGroupInvite =
    form.recordType === "action" &&
    form.groupJoinEnabled &&
    loadedActionPhase !== "post_action_complete";

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

      {showRestrictionDialog ? (
        <CmmDialog
          open={showRestrictionDialog}
          onClose={() => setShowRestrictionDialog(false)}
          ariaLabelledBy="action-restriction-title"
          size="lg"
          panelClassName="w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-amber-200/80 bg-[#FFF8EE]/98 shadow-[0_28px_72px_-28px_rgba(217,119,6,0.28)] backdrop-blur-xl"
        >
            <div className="flex items-start justify-between gap-4 border-b border-amber-200/70 bg-gradient-to-r from-amber-50 via-[#FFF6E7] to-[#FFF3DB] px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-white text-amber-700 shadow-sm">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/80">
                    Avertissement
                  </p>
                  <h3
                    id="action-restriction-title"
                    className="mt-1 text-xl font-black tracking-tight text-amber-950"
                  >
                    Connexion requise
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestrictionDialog(false)}
                aria-label="Fermer le message"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/70 bg-white text-amber-700 transition hover:bg-amber-100/80"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <p className="text-sm leading-7 text-amber-950/82">
                {restrictionMessage}
              </p>
              <div className="flex flex-wrap gap-2">
                {props.signInHref ? (
                  <CmmButton href={props.signInHref} tone="primary" variant="pill" size="sm">
                    Se connecter et reprendre
                  </CmmButton>
                ) : null}
                {props.signUpHref ? (
                  <CmmButton href={props.signUpHref} tone="secondary" variant="pill" size="sm">
                    Créer un compte
                  </CmmButton>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-amber-200/70 bg-[#FFF8EE] px-6 py-5">
              <button
                type="button"
                onClick={() => setShowRestrictionDialog(false)}
                className="rounded-2xl border border-amber-200/80 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 transition hover:bg-amber-100/70"
              >
                Fermer
              </button>
            </div>
        </CmmDialog>
      ) : null}

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
          {showDraftBanner && !isCompletionBlocked ? (
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
            <div className="relative p-6 md:p-10 space-y-8">
              {showPreparationSummary ? (
                <section className="rounded-2xl border border-emerald-200/70 bg-white/88 px-5 py-4 shadow-sm">
                  <p className="text-sm font-bold text-emerald-950">
                    Préparation existante reprise
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-900/70">
                    Les informations déjà saisies sont conservées pour compléter les résultats terrain.
                  </p>
                </section>
              ) : null}
              <fieldset className="relative z-10 space-y-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-[clamp(1.5rem,2.8vw,2.35rem)] font-black tracking-tighter text-emerald-950">
                    Déclarer les résultats terrain
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 font-medium text-emerald-900/62 md:text-[0.98rem]">
                    Renseignez les informations de l&apos;action, les résultats de collecte, le parcours et les éléments de validation.
                  </p>
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
                    subtitle="La vérification finale avant confirmation, avec les points d’attention et le récapitulatif d’envoi."
                  />
                  <div className="space-y-4">
                    <ActionStepReview
                      payload={payload}
                      dataQuality={dataQuality}
                      isSubmitting={submissionState === "pending"}
                      onSubmit={() => onSubmit()}
                    />
                    <ActionDeclarationFormExportButton
                      onOpen={() => setIsExportPickerOpen(true)}
                    />
                  </div>
                </section>
              </div>
              </fieldset>
            </div>
          </form>

          <ActionDeclarationFormFeedback
          submissionState={submissionState}
          createdId={createdId}
          errorMessage={errorMessage}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssues={validationIssues}
          retentionLoop={retentionLoop}
          recordedAction={recordedAction}
            showGroupInvite={canShowGroupInvite}
          isAutoApprovedSubmission={props.isAutoApprovedSubmission ?? false}
          groupJoinHref={
              createdId && canShowGroupInvite
                ? `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(createdId)}`
                : null
            }
            onReset={() => {
              if (props.initialActionId && props.onReturnToChoice) {
                props.onReturnToChoice();
                return;
              }
              setForm(createInitialFormState(resolvedDefaultActorName, props.initialRecordType ?? "action"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </div>
    </>
  );
}
