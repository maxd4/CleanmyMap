"use client";

import { type ElementType, type FormEvent } from "react";
import {
  User,
  ClipboardCheck,
  Sparkles,
  Download,
  Save,
  History,
} from "lucide-react";
import { exportFormAsPdf } from "@/lib/actions/export-form-pdf";
import { cn } from "@/lib/utils";
import { ActionDeclarationFormConfirmation } from "../action-declaration-form-confirmation";
import { ActionDeclarationFormFeedback } from "../action-declaration-form.feedback";
import { createInitialFormState } from "../action-declaration/payload";
import { ActionStepIdentity } from "../action-declaration/ActionStepIdentity";
import { ActionStepHarvest } from "../action-declaration/ActionStepHarvest";
import { ActionStepLocation } from "../action-declaration/ActionStepLocation";
import { ActionStepReview } from "../action-declaration/ActionStepReview";
import { useActionDeclarationForm } from "./use-action-declaration-form";
import {
  formatActionDate,
  formatDraftDate,
  formatWasteSummary,
} from "./action-declaration-form.summary";

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
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <Icon size={14} className="text-emerald-600" />
          <span className="cmm-text-caption font-bold uppercase tracking-[0.18em] text-slate-600">
            {title}
          </span>
        </div>
        <span className="h-px flex-1 bg-slate-200/80" />
      </div>
      <p className="max-w-3xl text-left text-sm leading-6 text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span className="max-w-[58%] text-right text-sm font-semibold leading-5 text-slate-900">
        {value}
      </span>
    </div>
  );
}

function RubricAside({
  eyebrow,
  title,
  summary,
  rows,
  note,
  tone = "emerald",
}: {
  eyebrow: string;
  title: string;
  summary: string;
  rows: Array<{ label: string; value: string }>;
  note?: string;
  tone?: "emerald" | "sky" | "violet" | "slate";
}) {
  const toneClasses = {
    emerald: "text-emerald-700",
    sky: "text-sky-700",
    violet: "text-violet-700",
    slate: "text-slate-700",
  } as const;

  return (
    <aside className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <p className={cn("text-[11px] font-black uppercase tracking-[0.18em]", toneClasses[tone])}>
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {summary}
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <SummaryRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
      {note ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {note}
        </p>
      ) : null}
    </aside>
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
    isCleanPlaceMode,
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

  const formattedDraftSavedAt = formatDraftDate(draftSavedAt);
  const formattedPendingDraftSavedAt = formatDraftDate(pendingDraftSavedAt);

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
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm shadow-amber-900/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <History size={15} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-950">
                  Reprendre votre déclaration
                  {formattedPendingDraftSavedAt ? ` du ${formattedPendingDraftSavedAt}` : ""}
                </p>
                <p className="mt-0.5 text-xs font-medium text-amber-800">
                  Un brouillon local existe sur cet appareil. Il ne sera restauré que si vous le confirmez.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
              >
                Reprendre
              </button>
              <button
                type="button"
                onClick={handleIgnoreDraft}
                className="rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-xs font-bold text-amber-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
              >
                Ignorer / recommencer
              </button>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
          <div className="p-6 md:p-10 space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 mb-3">
                  <Sparkles size={14} className="text-emerald-500" />
                  <span className="cmm-text-caption font-bold text-emerald-700 uppercase tracking-[0.18em]">
                    Formulaire continu
                  </span>
                </div>
                <h2 className="text-[clamp(1.5rem,2.8vw,2.35rem)] font-bold tracking-tight text-slate-900">
                  Déclarer une action
                </h2>
                <p className="mt-2 max-w-xl text-sm md:text-[0.98rem] leading-6 font-medium text-slate-500">
                  Tous les champs sont visibles sur une seule page. Quatre rubriques structurent
                  la saisie: identité, récolte, parcours, validation.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <User size={11} className="text-emerald-600" />
                    4 rubriques
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <ClipboardCheck size={11} className="text-sky-600" />
                    {formatActionDate(form.actionDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <Sparkles size={11} className="text-emerald-600" />
                    {formatWasteSummary(form.wasteKg, form.wasteMegotsKg)}
                  </span>
                  {formattedDraftSavedAt && !showDraftBanner && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                      <Save size={11} />
                      Brouillon · {formattedDraftSavedAt}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportFormAsPdf(form, resolvedDefaultActorName)}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Download size={13} />
                  Exporter
                </button>
              </div>
            </div>

            <div className="space-y-10">
              <section className="space-y-5">
                <SectionDivider
                  icon={User}
                  title="Identité"
                  subtitle="Qui déclare, quelle structure porte l’action et à quelle date elle se rattache."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <ActionStepIdentity
                    form={form}
                    updateField={updateField}
                    userMetadata={props.userMetadata}
                    recordType={form.recordType}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                  />
                  <RubricAside
                    eyebrow="Résumé identité"
                    title="Points de départ"
                    summary="La base administrative de la déclaration est prête à être contrôlée en un coup d’œil."
                    rows={[
                      { label: "Acteur", value: form.actorName.trim() || resolvedDefaultActorName },
                      { label: "Structure", value: form.associationName.trim() || "Non renseignée" },
                      { label: "Date", value: formatActionDate(form.actionDate) },
                      { label: "Type", value: form.recordType === "clean_place" ? "Lieu propre" : "Action terrain" },
                    ]}
                    note="La rubrique identité doit rester compacte pour réduire les retours visuels inutiles."
                    tone="emerald"
                  />
                </div>
              </section>

              <div className="h-px bg-slate-200/80" />

              <section className="space-y-5">
                <SectionDivider
                  icon={Sparkles}
                  title="Récolte"
                  subtitle="Les volumes, mégots, photos et indices de collecte qui alimentent le résumé et l’impact."
                />
                <div className="grid gap-4 xl:grid-cols-2">
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
                  <RubricAside
                    eyebrow="Résumé récolte"
                    title="Volume et complétude"
                    summary="Le bloc latéral rappelle ce qui sera transmis pour la lecture de l’impact et de la fiabilité."
                    rows={[
                      { label: "Déchets", value: formatWasteSummary(form.wasteKg, form.wasteMegotsKg) },
                      { label: "Mégots", value: form.wasteMegotsKg.trim() || "0 kg" },
                      {
                        label: "Participants",
                        value:
                          Number(form.volunteersCount) > 0
                            ? `${Number(form.volunteersCount)} personne${Number(form.volunteersCount) > 1 ? "s" : ""}`
                            : "Non renseigné",
                      },
                      { label: "Photos", value: `${photoAssets.length} photo${photoAssets.length > 1 ? "s" : ""}` },
                    ]}
                    note="La récolte reste la partie la plus dense du formulaire, donc le résumé doit rester très court."
                    tone="sky"
                  />
                </div>
              </section>

              <div className="h-px bg-slate-200/80" />

              <section className="space-y-5">
                <SectionDivider
                  icon={ClipboardCheck}
                  title="Parcours"
                  subtitle="Le lieu, le trajet et le géo-aperçu qui servent à situer l’action sans alourdir la lecture."
                />
                <div className="grid gap-4 xl:grid-cols-2">
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
                  <RubricAside
                    eyebrow="Résumé parcours"
                    title="Trajet et géolocalisation"
                    summary="Le formulaire conserve ici uniquement les repères de lecture les plus utiles."
                    rows={[
                      { label: "Départ", value: form.departureLocationLabel.trim() || "À renseigner" },
                      { label: "Arrivée", value: form.arrivalLocationLabel.trim() || "Boucle locale" },
                      { label: "Trajet", value: "Souple" },
                      { label: "GPS", value: smartAssist.gpsStatus === "success" ? "Position détectée" : smartAssist.gpsStatus === "locating" ? "Recherche..." : smartAssist.gpsStatus === "error" ? "Erreur" : "Disponible" },
                    ]}
                    note="Le parcours reste central pour la qualité cartographique, mais la lecture doit tenir dans un panneau simple."
                    tone="violet"
                  />
                </div>
              </section>

              <div className="h-px bg-slate-200/80" />

              <section className="space-y-5">
                <SectionDivider
                  icon={ClipboardCheck}
                  title="Validation"
                  subtitle="La vérification finale avant confirmation, avec le score, les alertes et le récapitulatif d’envoi."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <ActionStepReview
                    payload={payload}
                    dataQuality={dataQuality}
                    isSubmitting={submissionState === "pending"}
                    onSubmit={() => onSubmit()}
                  />
                  <RubricAside
                    eyebrow="Résumé validation"
                    title="Avant l’envoi"
                    summary="Cette colonne rappelle l’état du dossier et ce qui sera confirmé au clic."
                    rows={[
                      { label: "Score", value: `${dataQuality.score}/100` },
                      { label: "Alertes", value: `${dataQuality.warnings.length} point${dataQuality.warnings.length > 1 ? "s" : ""}` },
                      { label: "Tracé", value: payload.manualDrawing ? "Présent" : "Aperçu automatique" },
                      { label: "Statut", value: submissionState === "pending" ? "Envoi en cours" : "Prêt à valider" },
                    ]}
                    note="La validation reste la dernière étape, mais la structure doit aider à confirmer rapidement les données."
                    tone="slate"
                  />
                </div>
              </section>
            </div>
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
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </>
  );
}
