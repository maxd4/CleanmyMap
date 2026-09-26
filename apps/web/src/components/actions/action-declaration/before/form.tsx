"use client";

import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
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
import { buildPublicationSummary } from "./model";
import { OperationalRouteEditor } from "../operational-route-editor";
import { ChatActionShareDialog } from "@/components/chat/chat-action-share-dialog";
import { buildJoinActionHref } from "@/lib/sections/join-action-routes";
import { AdministrativeRequirementsStatus } from "../../administrative-requirements-status";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";

const BEFORE_VALIDATION_FIELD_IDS: Record<string, string> = {
  actionTitle: "before-action-title",
  actionDate: "before-action-date",
  associationName: "before-organizer-structure",
  organizerType: "before-organizer-type",
  departureLocationLabel: "before-departure-location",
  eventStartTime: "before-action-event-start",
};

function GuidedPreActionSummary({
  createdId,
  readiness,
  summary,
}: {
  createdId: string | null;
  readiness?: "unknown" | "ready" | "blocked";
  summary: ReturnType<typeof buildPublicationSummary>;
}) {
  const isReady = readiness === "ready";
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="cmm-page-width">
        <CmmCard tone={isReady ? "emerald" : "amber"} variant="glass" size="lg">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <CmmPill tone={isReady ? "emerald" : "amber"} size="sm">{isReady ? "Prêt à publier" : "À revoir"}</CmmPill>
              <span className="text-sm font-semibold text-emerald-950">{isReady ? "Préformulaire prêt à publier" : "Pré-action enregistrée"}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-emerald-950">{isReady ? "Préformulaire prêt à publier" : "Pré-action enregistrée — vérification à terminer"}</h2>
            <p className="cmm-text-body cmm-text-primary max-w-2xl">{isReady ? "Les éléments obligatoires du contrat administratif sont traités. La publication reste une action explicite, hors de ce parcours." : "La même action peut être reprise. Revenez à l’étape Paris pour qualifier les formalités réellement applicables avant toute publication."}</p>
            {createdId ? <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p> : null}
            <dl className="grid gap-3 sm:grid-cols-2" data-testid="guided-pre-action-summary">
              {summary.map((item) => <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3"><dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd></div>)}
            </dl>
          </div>
        </CmmCard>
      </div>
    </div>
  );
}

function publicationVisibilityLabel(isPublished: boolean): string { return isPublished ? "Publié" : "Privé"; }
function publicationStatusLabel(isPublished: boolean): string { return isPublished ? "Action prête et publiée" : "Pré-action prête à publier"; }
function publicationReviewTitle(isPublished: boolean): string { return isPublished ? "Action prête et publiée" : "Vérifier avant publication"; }

export function ActionBeforeDeclarationForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  userMetadata,
  linkedEventId,
  initialActionId,
  initialRecordType = "action",
  onPassToComplete,
  onFormChange,
  onActionPersisted,
  signInHref,
  signUpHref,
  guidedWorkflow = false,
  guidedReadiness = "unknown",
}: ActionBeforeDeclarationFormProps) {
  const [shareActionId, setShareActionId] = useState<string | null>(null);
  const {
    form,
    submissionState,
    errorMessage,
    createdId,
    publishedAction,
    terminalActionStatus,
    publishedAt,
    publicationState,
    publicationError,
    publicationConfirmationOpen,
    isHydratingAction,
    validationIssues,
    validationIssueFields = [],
    showGroupJoinHelp,
    setShowGroupJoinHelp,
    updateField,
    updateFields,
    handleSubmit,
    requestPublish,
    cancelPublication,
    confirmPublish,
    onContinueComplete,
  } = useBeforeActionForm({
    actorNameOptions,
    defaultActorName,
    isAuthenticated,
    userMetadata,
    linkedEventId,
    initialActionId,
    initialRecordType,
    onPassToComplete,
    onFormChange,
    onActionPersisted,
  });
  const actClasses = getBlockClasses("act");

  useEffect(() => {
    if (validationIssueFields.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(BEFORE_VALIDATION_FIELD_IDS[validationIssueFields[0]] ?? "");
      if (target instanceof HTMLElement) target.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [validationIssueFields]);

  useEffect(() => {
    if (!publishedAt || !createdId || initialActionId) return;
    window.history.replaceState(
      null,
      "",
      `/actions/new?from=before&actionId=${encodeURIComponent(createdId)}`,
    );
  }, [createdId, initialActionId, publishedAt]);

  if (isHydratingAction) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <CmmCard tone="emerald" variant="glass" size="lg" className="mx-auto w-full max-w-2xl">
          <p className="text-sm font-semibold text-emerald-950" role="status">
            Reprise de l&apos;action en cours…
          </p>
        </CmmCard>
      </div>
    );
  }

  if (terminalActionStatus) {
    const isCancelled = terminalActionStatus === "cancelled";
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <CmmCard tone="amber" variant="glass" size="lg">
            <div className="space-y-4">
              <CmmPill tone="amber" size="sm">
                État terminal
              </CmmPill>
              <h1 className="text-3xl font-black tracking-tight text-emerald-950">
                {isCancelled ? "Action annulée" : "Pré-action rejetée"}
              </h1>
              <p className="text-sm leading-6 text-emerald-900/70">
                {isCancelled
                  ? "Cette action est conservée dans l'historique et ne peut plus être reprise ni publiée."
                  : "Cette pré-action a été rejetée et ne peut plus être reprise ni publiée."
                }
              </p>
              {createdId ? (
                <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p>
              ) : null}
            </div>
          </CmmCard>
        </div>
      </div>
    );
  }

  if (submissionState === "success") {
    const isPublished = Boolean(publishedAt);
    const publicationSummary = buildPublicationSummary(publishedAction ?? form);
    if (guidedWorkflow) return <GuidedPreActionSummary createdId={createdId} readiness={guidedReadiness} summary={publicationSummary} />;
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="cmm-page-width">
          <CmmCard tone="emerald" variant="glass" size="lg">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmPill tone="emerald" size="sm">
                    {publicationVisibilityLabel(isPublished)}
                  </CmmPill>
                  <span className="text-sm font-semibold text-emerald-950">
                    {publicationStatusLabel(isPublished)}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                  {publicationReviewTitle(isPublished)}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-emerald-900/68">
                  {isPublished
                    ? "Cette action future est publique. Les bénévoles peuvent la consulter et la rejoindre depuis le parcours canonique."
                    : "La pré-action reste privée tant que vous n'avez pas confirmé sa publication."}
                </p>
                {createdId ? (
                  <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p>
                ) : null}
                {publicationError ? (
                  <p className="text-sm font-semibold text-rose-700">{publicationError}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {!isPublished ? (
                  <CmmButton tone="primary" variant="pill" size="md" onClick={requestPublish} disabled={publicationState === "pending"}>
                    {publicationState === "pending" ? <Loader2 size={14} className="animate-spin" /> : null}
                    {publicationState === "pending" ? "Publication…" : "Publier cette action"}
                  </CmmButton>
                ) : null}
                {isPublished ? (
                  <>
                    <CmmButton tone="primary" variant="pill" size="md" href={`/actions/map?actionId=${encodeURIComponent(createdId ?? "")}`}>
                      Voir l&apos;action
                    </CmmButton>
                    <CmmButton tone="secondary" variant="pill" size="md" onClick={() => setShareActionId(createdId)}>
                      Partager dans la messagerie
                    </CmmButton>
                    <CmmButton tone="secondary" variant="pill" size="md" href={buildJoinActionHref(createdId)}>
                      Rejoindre une action
                    </CmmButton>
                  </>
                ) : null}
                <AdministrativeRequirementsStatus
                  actionId={createdId}
                  initialAction={publishedAction}
                  surface="summary"
                />
                <CmmButton tone="tertiary" variant="pill" size="md" onClick={onContinueComplete}>
                  Passer au formulaire complet
                  <ArrowRight size={14} />
                </CmmButton>
                {isPublished ? (
                  <CmmButton tone="tertiary" variant="pill" size="md" href="/sections/rejoindre-une-action">
                    Voir les actions futures
                  </CmmButton>
                ) : null}
              </div>
            </div>
            <div className="mt-6 border-t border-emerald-200/70 pt-5" data-testid="action-publication-summary">
              <h3 className="text-lg font-black text-emerald-950">
                {isPublished ? "Synthèse de l'action publiée" : "Récapitulatif avant publication"}
              </h3>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {publicationSummary.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3">
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </CmmCard>
        </div>
        {publicationConfirmationOpen ? (
          <CmmDialog
            open
            ariaLabelledBy="publish-action-title"
            ariaDescribedBy="publish-action-description"
            onClose={cancelPublication}
            size="lg"
            panelClassName="border border-emerald-200/80 bg-white p-5 shadow-2xl"
          >
            <div className="space-y-5">
                <div>
                  <h2 id="publish-action-title" className="mt-1 text-2xl font-black text-emerald-950">Confirmer la publication</h2>
                  <p id="publish-action-description" className="mt-2 text-sm leading-6 text-emerald-900/70">La publication rend cette même action visible dans les parcours publics. Elle ne crée aucune action, participation ou conversation.</p>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {publicationSummary.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3">
                      <dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap justify-end gap-2">
                  <CmmButton tone="tertiary" variant="pill" size="md" onClick={cancelPublication}>Annuler</CmmButton>
                  <CmmButton tone="primary" variant="pill" size="md" onClick={() => void confirmPublish()}>Confirmer et publier</CmmButton>
                </div>
            </div>
          </CmmDialog>
        ) : null}
        {shareActionId ? <ChatActionShareDialog actionId={shareActionId} onClose={() => setShareActionId(null)} /> : null}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" />
      </div>

      <div className="cmm-page-width relative space-y-6">
        <CmmCard tone="emerald" variant="glass" size="lg">
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-emerald-950">
              Préparer une action future
            </h2>
            <p className="cmm-text-body cmm-text-primary max-w-3xl">
              Renseignez les informations utiles avant le terrain. Les champs de récolte,
              de bilan final et de validation restent réservés au formulaire complet.
            </p>
          </div>
        </CmmCard>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-6"
        >
          <div className="space-y-6">
            <IdentityAndSharingSection
              form={form}
              updateField={updateField}
              updateFields={updateFields}
              actorNameOptions={actorNameOptions}
              userMetadata={userMetadata}
              showGroupJoinHelp={showGroupJoinHelp}
              onToggleGroupJoinHelp={() => setShowGroupJoinHelp((current) => !current)}
              hasAttemptedSubmit={validationIssueFields.length > 0}
              validationIssueFields={validationIssueFields}
            />
            <PlannedActionSection
              form={form}
              updateField={updateField}
              hasAttemptedSubmit={validationIssueFields.length > 0}
              validationIssueFields={validationIssueFields}
            />
            <PreparationAndSafetySection form={form} updateField={updateField} />
          </div>

          {form.operationalRoute ? (
            <CmmDisclosure
              summary={
                <ActionFormDisclosureSummary
                  label="Parcours et géométrie"
                  detail="parcours calculé"
                />
              }
              tone="emerald"
              size="md"
            >
              <OperationalRouteEditor
                operationalRoute={form.operationalRoute}
                onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)}
              />
            </CmmDisclosure>
          ) : null}

          {validationIssues.length > 0 || errorMessage ? (
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950">
                <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} className="text-rose-500" />
                  La préparation n&apos;a pas encore pu être enregistrée
              </div>
              {validationIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">
                  {validationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {errorMessage && validationIssues.length === 0 ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}
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
              <p className="text-sm font-semibold text-emerald-950">Enregistrer la préparation</p>
              <p className="text-xs leading-5 text-emerald-900/66">
                L&apos;enregistrement reste privé ; la publication sera déclenchée explicitement après vérification.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CmmButton tone="primary" variant="pill" size="md" type="submit" disabled={submissionState === "pending"}>
                {submissionState === "pending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    Enregistrer la préparation
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
