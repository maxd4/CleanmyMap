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
import { OperationalRouteEditor } from "../operational-route-editor";

export function ActionBeforeDeclarationForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  userMetadata,
  linkedEventId,
  initialRecordType = "action",
  onReturnToChoice,
  onPassToComplete,
  signInHref,
  signUpHref,
}: ActionBeforeDeclarationFormProps) {
  const {
    form,
    submissionState,
    errorMessage,
    createdId,
    publishedAt,
    publicationState,
    publicationError,
    validationIssues,
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    shareLink,
    summaryNote,
    updateField,
    handleSubmit,
    handlePublish,
    onContinueComplete,
  } = useBeforeActionForm({
    actorNameOptions,
    defaultActorName,
    isAuthenticated,
    userMetadata,
    linkedEventId,
    initialRecordType,
    onReturnToChoice,
    onPassToComplete,
  });
  const actClasses = getBlockClasses("act");

  if (submissionState === "success") {
    const isPublished = Boolean(publishedAt);
    const isGroupFormPublished = isPublished && form.groupJoinEnabled;
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <CmmCard tone="emerald" variant="glass" size="lg">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmPill tone="emerald" size="sm">
                    {isPublished ? "Publié" : "Privé"}
                  </CmmPill>
                  <span className="text-sm font-semibold text-emerald-950">
                    {isPublished ? "Action future publiée" : "Pré-action enregistrée en privé"}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                  Le formulaire avant action est prêt
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-emerald-900/68">
                  {isPublished
                    ? "Cette action future est publique. Les bénévoles peuvent la consulter et la rejoindre si le groupe est ouvert."
                    : "La pré-action reste privée tant que vous n'avez pas explicitement choisi de la publier."}
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
                {publicationError ? (
                  <p className="text-sm font-semibold text-rose-700">{publicationError}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {!isPublished ? (
                  <CmmButton tone="primary" variant="pill" size="md" onClick={() => void handlePublish()} disabled={publicationState === "pending"}>
                    {publicationState === "pending" ? <Loader2 size={14} className="animate-spin" /> : null}
                    {publicationState === "pending" ? "Publication..." : "Publier cette action"}
                  </CmmButton>
                ) : null}
                <CmmButton tone="primary" variant="pill" size="md" onClick={onContinueComplete}>
                  Passer au formulaire complet
                  <ArrowRight size={14} />
                </CmmButton>
                {shareLink && isGroupFormPublished ? (
                  <CmmButton tone="secondary" variant="pill" size="md" href={shareLink}>
                    Ouvrir Rejoindre une action
                  </CmmButton>
                ) : null}
                {isPublished ? (
                  <CmmButton tone="secondary" variant="pill" size="md" href="/sections/rejoindre-une-action">
                    Voir les actions futures
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
        <CmmCard tone="emerald" variant="glass" size="lg">
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
                La pré-action reste privée jusqu&apos;à la publication explicite.
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

          {form.operationalRoute ? (
            <CmmCard tone="emerald" variant="glass" size="lg">
              <OperationalRouteEditor
                operationalRoute={form.operationalRoute}
                onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)}
              />
            </CmmCard>
          ) : null}

          {validationIssues.length > 0 || errorMessage ? (
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950">
                <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} className="text-rose-500" />
                  Le pré-formulaire n&apos;a pas encore pu être enregistré
              </div>
              {validationIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">
                  {validationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {errorMessage ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}
              {!isAuthenticated ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {signInHref ? (
                    <CmmButton href={signInHref} tone="primary" variant="pill" size="sm">
                      Se connecter et reprendre
                    </CmmButton>
                  ) : null}
                  {signUpHref ? (
                    <CmmButton href={signUpHref} tone="secondary" variant="pill" size="sm">
                      Créer un compte
                    </CmmButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-950">Pré-formulaire avant action</p>
              <p className="text-xs leading-5 text-emerald-900/66">
                L&apos;enregistrement reste privé ; la publication sera déclenchée explicitement après vérification.
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
                    Enregistrement...
                  </>
                ) : (
                  <>
                    Enregistrer le pré-formulaire
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
