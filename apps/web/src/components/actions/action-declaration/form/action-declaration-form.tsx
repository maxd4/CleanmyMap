"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  History,
  Loader2,
  X,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { ActionDeclarationFormConfirmation } from "./action-declaration-form-confirmation";
import { ActionDeclarationExportPicker } from "./action-declaration-export-picker";
import { ActionDeclarationFormFeedback } from "./action-declaration-form.feedback";
import { createInitialFormState, OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "../payload";
import { ActionStepHarvest } from "../steps/ActionStepHarvest";
import { ActionStepIdentity } from "../steps/ActionStepIdentity";
import { ActionStepLocation } from "../steps/ActionStepLocation";
import {
  formatDraftDate,
} from "./action-declaration-form.summary";
import { useActionDeclarationForm } from "./use-action-declaration-form";

const ACTION_VALIDATION_FIELD_IDS: Record<string, string> = {
  organizerType: "action-organizer-type",
  associationName: "action-organizer-structure",
  enterpriseName: "action-enterprise-name",
  actionDate: "action-action-date",
  arrivalLocationLabel: "arrival",
  manualDrawing: "action-disclosure-route",
  gpxImport: "gpx-import",
  wasteKg: "harvest-waste-kg",
  volunteersCount: "action-children-count",
  volunteerParticipation: "action-children-count",
  durationMinutes: "action-duration-minutes",
  eventStartTime: "action-event-start",
  eventEndTime: "action-event-end",
};

type ActionDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  linkedEventId?: string;
  initialRecordType?: "action";
  initialActionId?: string | null;
  signInHref?: string;
  signUpHref?: string;
};

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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-600 px-3 py-2 cmm-text-small font-semibold text-white shadow-sm transition-all hover:border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
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
    manualDrawingSource,
    setManualDrawing,
    gpxImport,
    gpxError,
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
    effectiveRoutePreviewDrawing,
    effectiveRoutePreviewSource,
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

  const showPreparationSummary = Boolean(props.initialActionId || loadedActionPhase);
  const canShowGroupInvite =
    form.recordType === "action" &&
    form.groupJoinEnabled &&
    loadedActionPhase !== "post_action_complete";
  const [openOrganizationDetails, setOpenOrganizationDetails] = useState(false);
  const [openCollectionDetails, setOpenCollectionDetails] = useState(false);
  const [openPhotoDetails, setOpenPhotoDetails] = useState(false);
  const [openRouteDetails, setOpenRouteDetails] = useState(false);
  const [openTimeDetails, setOpenTimeDetails] = useState(false);
  const hasValidationIssue = (fields: string[]) =>
    validationIssues.some((issue) => fields.includes(issue.field));
  const organizationNeedsAttention =
    hasValidationIssue(["associationName", "organizerType", "enterpriseName"]) ||
    (form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE && !form.actorName.trim());
  const collectionNeedsAttention =
    hasValidationIssue(["wasteKg"]);
  const routeNeedsAttention =
    hasValidationIssue(["locationLabel", "arrivalLocationLabel", "manualDrawing", "gpxImport"]) ||
    (form.routeTopology === "point_to_point" && !form.arrivalLocationLabel.trim());
  const timeNeedsAttention =
    hasValidationIssue(["eventStartTime", "eventEndTime"]);

  const organizationSummary = [
    form.participantAccounts.length > 0
      ? `${form.participantAccounts.length} participant${form.participantAccounts.length > 1 ? "s" : ""}`
      : null,
    form.organizerAccounts.trim() ? "comptes associés" : null,
    form.enterpriseName.trim() ? "entreprise renseignée" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const collectionSummary = form.wasteCategories?.length
    ? `${form.wasteCategories.length} catégorie${form.wasteCategories.length > 1 ? "s" : ""} de déchets`
    : form.wasteMeasurementMethod
      ? "méthode renseignée"
      : undefined;
  const photoSummary = photoAssets.length
    ? `${photoAssets.length} photo${photoAssets.length > 1 ? "s" : ""}`
    : visionEstimate
      ? "estimation disponible"
      : undefined;
  const routeSummary = form.gpxImport
    ? "GPX importé"
    : manualDrawing
      ? "tracé manuel"
      : form.operationalRoute
        ? "parcours calculé"
        : undefined;
  const timeSummary = form.eventStartTime.trim() || form.eventEndTime.trim()
    ? [form.eventStartTime, form.eventEndTime].filter(Boolean).join("–")
    : undefined;

  useEffect(() => {
    if (!hasAttemptedSubmit || validationIssues.length === 0) return;
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      const issue = validationIssues[0];
      const targetId = ACTION_VALIDATION_FIELD_IDS[issue?.field ?? ""];
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const focusTarget = target ?? document.querySelector(`#${targetId} summary`);
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasAttemptedSubmit, validationIssues, openOrganizationDetails, openCollectionDetails, openPhotoDetails, openRouteDetails, openTimeDetails]);

  // Opening a disclosure in response to validation is intentional: it reveals the invalid field.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (organizationNeedsAttention) setOpenOrganizationDetails(true);
    if (collectionNeedsAttention) setOpenCollectionDetails(true);
    if (routeNeedsAttention) setOpenRouteDetails(true);
    if (timeNeedsAttention) setOpenTimeDetails(true);
  }, [
    organizationNeedsAttention,
    collectionNeedsAttention,
    routeNeedsAttention,
    timeNeedsAttention,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isHydratingAction) {
    return (
      <div className="relative overflow-hidden px-4 py-6 md:px-6 lg:px-8">
        <div className="cmm-page-width relative flex items-center justify-center">
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
        <div className="cmm-page-width relative flex items-center justify-center">
          <CmmCard tone="rose" variant="glass" size="lg" className="w-full max-w-2xl">
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">
                Erreur
              </p>
              <h2 className="text-2xl font-black tracking-tight text-rose-950">
                Le formulaire existant n&apos;a pas pu être chargé
              </h2>
              <p className="text-sm leading-6 text-rose-900/72">{hydrationError}</p>
            </div>
          </CmmCard>
        </div>
      </div>
    );
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
                  <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-amber-700/80">
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

        <div className="cmm-page-width relative flex flex-col gap-6">
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
              <fieldset className="relative z-10 space-y-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-[clamp(1.5rem,2.8vw,2.35rem)] font-black tracking-tighter text-emerald-950">
                    Déclarer les résultats terrain
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 font-medium text-emerald-900/62 md:text-[0.98rem]">
                    Commencez par les informations essentielles. Les détails complémentaires restent disponibles à la demande.
                  </p>
                </div>

              </header>

              <div className="space-y-6">
                <section aria-labelledby="action-declaration-action" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
                  <div>
                    <h3 id="action-declaration-action" className="text-lg font-bold text-emerald-950">Action</h3>
                    <p className="mt-1 text-sm text-emerald-900/60">Les informations indispensables pour rattacher cette déclaration à l’action.</p>
                  </div>
                  {showPreparationSummary ? (
                    <div className="rounded-xl border border-emerald-200 bg-[#ECF8EF] px-4 py-3">
                      <p className="text-sm font-bold text-emerald-950">Préparation existante reprise</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-900/70">Les informations déjà saisies sont conservées pour compléter les résultats terrain.</p>
                    </div>
                  ) : null}
                  <ActionStepIdentity
                    mode="action"
                    form={form}
                    updateField={updateField}
                    updateFields={updateFields}
                    userMetadata={props.userMetadata}
                    recordType={form.recordType}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                  />
                  <ActionStepLocation
                    mode="primary"
                    form={form}
                    updateField={updateField}
                    updateFields={updateFields}
                    manualDrawing={manualDrawing}
                    manualDrawingSource={manualDrawingSource ?? null}
                    setManualDrawing={setManualDrawing}
                    routePreviewDrawing={effectiveRoutePreviewDrawing}
                    routePreviewSource={effectiveRoutePreviewSource}
                    gpxImport={gpxImport ?? null}
                    gpxError={gpxError}
                    onImportGpx={handleGpxImport}
                    onRemoveGpx={removeGpxImport}
                    onResetManualDrawing={() => setManualDrawing(null)}
                    gpsStatus={smartAssist.gpsStatus}
                    gpsMessage={smartAssist.gpsMessage}
                    onAutofillGps={smartAssist.autofillGps}
                    recordType={form.recordType}
                  />
                  <ActionStepIdentity
                    mode="duration"
                    form={form}
                    updateField={updateField}
                    updateFields={updateFields}
                    userMetadata={props.userMetadata}
                    recordType={form.recordType}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                  />
                </section>

                {form.recordType === "action" ? (
                  <section aria-labelledby="action-declaration-participants" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
                    <div>
                      <h3 id="action-declaration-participants" className="text-lg font-bold text-emerald-950">Participants</h3>
                      <p className="mt-1 text-sm text-emerald-900/60">Répartition des personnes présentes et total calculé.</p>
                    </div>
                    <ActionStepIdentity
                      mode="participants"
                      form={form}
                      updateField={updateField}
                      updateFields={updateFields}
                      userMetadata={props.userMetadata}
                      recordType={form.recordType}
                      hasAttemptedSubmit={hasAttemptedSubmit}
                    />
                  </section>
                ) : null}

                <section aria-labelledby="action-declaration-results" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
                  <div>
                    <h3 id="action-declaration-results" className="text-lg font-bold text-emerald-950">Résultats essentiels</h3>
                    <p className="mt-1 text-sm text-emerald-900/60">Saisissez les mesures brutes. Une valeur à 0 est une mesure valide.</p>
                  </div>
                  <ActionStepHarvest
                    mode="essentials"
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
                  {form.recordType === "action" && !form.wasteKg.trim() && !form.wasteMegotsKg.trim() && !form.cigaretteButtsCount.trim() ? (
                    <p className="text-xs font-medium text-amber-800">Au moins une mesure déchets ou mégots est requise.</p>
                  ) : null}
                </section>

                <div className="space-y-3">
                  <CmmDisclosure
                    id="action-disclosure-organization"
                    summary={
                      <ActionFormDisclosureSummary
                        label="Détails de l’organisation"
                        detail={organizationSummary}
                      />
                    }
                    tone="emerald"
                    size="md"
                    open={openOrganizationDetails}
                    onToggle={setOpenOrganizationDetails}
                  >
                    {openOrganizationDetails ? (
                      <ActionStepIdentity
                        mode="organization"
                        form={form}
                        updateField={updateField}
                        updateFields={updateFields}
                        userMetadata={props.userMetadata}
                        recordType={form.recordType}
                        hasAttemptedSubmit={hasAttemptedSubmit}
                      />
                    ) : null}
                  </CmmDisclosure>

                  <CmmDisclosure
                    id="action-disclosure-collection"
                    summary={
                      <ActionFormDisclosureSummary
                        label="Détails de la collecte"
                        detail={collectionSummary}
                      />
                    }
                    tone="emerald"
                    size="md"
                    open={openCollectionDetails}
                    onToggle={setOpenCollectionDetails}
                  >
                    {openCollectionDetails ? (
                      <div className="space-y-5">
                        <ActionStepIdentity
                          mode="collection"
                          form={form}
                          updateField={updateField}
                          updateFields={updateFields}
                          userMetadata={props.userMetadata}
                          recordType={form.recordType}
                          hasAttemptedSubmit={hasAttemptedSubmit}
                        />
                        <ActionStepHarvest
                          mode="collection"
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
                    ) : null}
                  </CmmDisclosure>

                  <CmmDisclosure
                    id="action-disclosure-photos"
                    summary={
                      <ActionFormDisclosureSummary
                        label="Photos et estimation"
                        detail={photoSummary}
                      />
                    }
                    tone="emerald"
                    size="md"
                    open={openPhotoDetails}
                    onToggle={setOpenPhotoDetails}
                  >
                    {openPhotoDetails ? (
                      <ActionStepHarvest
                        mode="photos"
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
                    ) : null}
                  </CmmDisclosure>

                  <CmmDisclosure
                    id="action-disclosure-route"
                    summary={
                      <ActionFormDisclosureSummary
                        label="Parcours et géométrie"
                        detail={routeSummary}
                      />
                    }
                    tone="emerald"
                    size="md"
                    open={openRouteDetails}
                    onToggle={setOpenRouteDetails}
                  >
                    {openRouteDetails ? (
                      <ActionStepLocation
                        mode="details"
                        form={form}
                        updateField={updateField}
                        updateFields={updateFields}
                        manualDrawing={manualDrawing}
                        manualDrawingSource={manualDrawingSource ?? null}
                        setManualDrawing={setManualDrawing}
                        routePreviewDrawing={effectiveRoutePreviewDrawing}
                        routePreviewSource={effectiveRoutePreviewSource}
                        gpxImport={gpxImport ?? null}
                        gpxError={gpxError}
                        onImportGpx={handleGpxImport}
                        onRemoveGpx={removeGpxImport}
                        onResetManualDrawing={() => setManualDrawing(null)}
                        gpsStatus={smartAssist.gpsStatus}
                        gpsMessage={smartAssist.gpsMessage}
                        onAutofillGps={smartAssist.autofillGps}
                        recordType={form.recordType}
                      />
                    ) : null}
                  </CmmDisclosure>

                  <CmmDisclosure
                    id="action-disclosure-time"
                    summary={
                      <ActionFormDisclosureSummary
                        label="Détails temporels"
                        detail={timeSummary}
                      />
                    }
                    tone="emerald"
                    size="md"
                    open={openTimeDetails}
                    onToggle={setOpenTimeDetails}
                  >
                    {openTimeDetails ? (
                      <ActionStepIdentity
                        mode="time"
                        form={form}
                        updateField={updateField}
                        updateFields={updateFields}
                        userMetadata={props.userMetadata}
                        recordType={form.recordType}
                        hasAttemptedSubmit={hasAttemptedSubmit}
                      />
                    ) : null}
                  </CmmDisclosure>
                </div>

                <div className="sticky bottom-3 z-20 rounded-2xl border border-emerald-300/80 bg-[#F3FBF6]/95 p-4 shadow-[0_18px_36px_-20px_rgba(6,95,70,0.35)] backdrop-blur-xl">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {hasAttemptedSubmit && validationIssues.length > 0 ? (
                        <p role="alert" className="text-sm font-semibold text-rose-700">
                          {validationIssues.length} point{validationIssues.length > 1 ? "s" : ""} à vérifier dans le formulaire.
                        </p>
                      ) : (
                        <p className="text-sm text-emerald-900/65">Vérifiez les mesures avant de confirmer l’envoi.</p>
                      )}
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                      <ActionDeclarationFormExportButton
                        onOpen={() => setIsExportPickerOpen(true)}
                      />
                      <CmmButton
                        type="submit"
                        tone="primary"
                        variant="default"
                        size="md"
                        loading={submissionState === "pending"}
                        className="min-h-12 w-full shrink-0 justify-center px-5 sm:w-auto"
                      >
                        Vérifier et envoyer
                      </CmmButton>
                    </div>
                  </div>
                </div>
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
          groupJoinHref={
              createdId && canShowGroupInvite
                ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(createdId)}`
                : null
            }
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
