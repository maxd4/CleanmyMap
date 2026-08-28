"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import {
  IdentityAndSharingSection,
  PlannedActionSection,
  PreparationAndSafetySection,
} from "./sections";
import { useBeforeActionForm } from "./use-before-action-form";
import type { ActionBeforeDeclarationFormProps } from "./model";
import { labelForPreparationState } from "./model";

export function ActionBeforeDeclarationForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  isAutoApprovedSubmission = false,
  userMetadata,
  linkedEventId,
  initialRecordType = "action",
  onReturnToChoice,
  onPassToComplete,
}: ActionBeforeDeclarationFormProps) {
  const {
    form,
    submissionState,
    errorMessage,
    createdId,
    validationIssues,
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    shareLink,
    summaryNote,
    updateField,
    handleSubmit,
    onContinueComplete,
  } = useBeforeActionForm({
    actorNameOptions,
    defaultActorName,
    isAuthenticated,
    isAutoApprovedSubmission,
    userMetadata,
    linkedEventId,
    initialRecordType,
    onReturnToChoice,
    onPassToComplete,
  });
  const actClasses = getBlockClasses("act");

  if (submissionState === "success") {
    const isGroupFormPublished = form.groupJoinEnabled;
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/96">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmPill tone="emerald" size="sm">
                    {isGroupFormPublished ? "Publié" : "Enregistré"}
                  </CmmPill>
                  <span className="text-sm font-semibold text-emerald-950">
                    {isGroupFormPublished ? "Pré-formulaire publié" : "Pré-formulaire enregistré"}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                  Le formulaire avant action est prêt
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-emerald-900/68">
                  {isGroupFormPublished
                    ? "Les bénévoles peuvent déjà consulter ce pré-formulaire, rejoindre l'action et compléter les informations utiles avant le départ terrain."
                    : "Le pré-formulaire est enregistré avec les informations utiles avant le terrain. Vous pourrez le publier ensuite si vous souhaitez ouvrir le formulaire de groupe."}
                </p>
                {summaryNote ? (
                  <div className="rounded-[1.4rem] border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950">
                    {summaryNote}
                  </div>
                ) : null}
                {shareLink && isGroupFormPublished ? (
                  <p className="text-xs text-emerald-900/60">
                    Lien de partage du formulaire de groupe: <span className="font-mono">{shareLink}</span>
                  </p>
                ) : null}
                {createdId ? (
                  <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <CmmButton tone="primary" variant="pill" size="md" onClick={onContinueComplete}>
                  Passer au formulaire complet
                  <ArrowRight size={14} />
                </CmmButton>
                {shareLink && isGroupFormPublished ? (
                  <CmmButton tone="secondary" variant="pill" size="md" href={shareLink}>
                    Ouvrir le formulaire de groupe
                  </CmmButton>
                ) : null}
                <CmmButton tone="tertiary" variant="pill" size="md" onClick={onReturnToChoice}>
                  <ArrowLeft size={14} />
                  Retour au choix
                </CmmButton>
              </div>
            </div>
          </CmmCard>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <CmmPill tone="emerald" size="sm" className="tracking-[0.18em]">
                Déclarer avant l&apos;action
              </CmmPill>
              <h1 className="text-[clamp(2rem,4vw,3.15rem)] font-black tracking-tighter text-emerald-950">
                Préparer le formulaire de groupe
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-emerald-900/72 md:text-[0.98rem]">
                Renseignez uniquement les informations utiles avant le terrain. Les champs de récolte,
                de bilan final et de validation restent réservés au formulaire complet.
              </p>
            </div>
            <div className="max-w-sm rounded-[1.5rem] border border-emerald-200/80 bg-[#F3FBF6] px-4 py-3 text-sm leading-6 text-emerald-900/76 shadow-sm">
              <p className="font-bold text-emerald-950">Statut du formulaire</p>
              <p className="mt-1 text-emerald-950">Pré-action — les données de collecte seront ajoutées après le terrain.</p>
              <p className="mt-1">{labelForPreparationState(form.preparationState)}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-900/60">
                Le lien de partage du formulaire de groupe sera créé après publication.
              </p>
            </div>
          </div>
        </CmmCard>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <IdentityAndSharingSection
              form={form}
              updateField={updateField}
              actorNameOptions={actorNameOptions}
              userMetadata={userMetadata}
              showGroupJoinHelp={showGroupJoinHelp}
              onToggleGroupJoinHelp={() => setShowGroupJoinHelp((current) => !current)}
            />
            <PlannedActionSection form={form} updateField={updateField} />
          </div>

          <PreparationAndSafetySection form={form} updateField={updateField} />

          {validationIssues.length > 0 || errorMessage ? (
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} className="text-rose-500" />
                Le pré-formulaire n&apos;a pas encore pu être publié
              </div>
              {validationIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">
                  {validationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {errorMessage ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-950">Pré-formulaire avant action</p>
              <p className="text-xs leading-5 text-emerald-900/66">
                La publication crée un pré-formulaire visible dans la page Formulaire de groupe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CmmButton tone="secondary" variant="pill" size="md" onClick={onReturnToChoice} type="button">
                <ArrowLeft size={14} />
                Retour au choix
              </CmmButton>
              <CmmButton tone="primary" variant="pill" size="md" type="submit" disabled={submissionState === "pending"}>
                {submissionState === "pending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Publication...
                  </>
                ) : (
                  <>
                    Publier le pré-formulaire
                    <ArrowRight size={14} />
                  </>
                )}
              </CmmButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
